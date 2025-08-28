import { PublicKey, TransactionInstruction, SystemProgram, SYSVAR_RENT_PUBKEY, TransactionMessage, VersionedTransaction, Keypair, Connection, AddressLookupTableAccount } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
// Metaplex Token Metadata program id (constant)
const TOKEN_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
import SHA256 from "crypto-js/sha256";
import Hex from "crypto-js/enc-hex";

// Program IDs
export const DEFAULT_PROGRAM_ID = new PublicKey("6vQYZxfQLriD2J3P3AJpgVPMvUZ4w6c2c5AK7Sy6sjoU");

// Utilities
const textEncoder = new TextEncoder();

function anchorDiscriminator(ixName: string): Buffer {
  const preimage = `global:${ixName}`;
  const hash = SHA256(preimage);
  const hex = hash.toString(Hex);
  const bytes = Buffer.from(hex.slice(0, 16), "hex");
  return bytes.slice(0, 8);
}

// Borsh-like serialization helpers for Anchor (strings as u32 length + utf8 bytes, little-endian numbers)
function encodeU64(value: number | bigint): Buffer {
  const v = BigInt(value);
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(v);
  return b;
}

function encodeI64(value: number | bigint): Buffer {
  const v = BigInt(value);
  const b = Buffer.alloc(8);
  b.writeBigInt64LE(v);
  return b;
}

function encodeString(value: string): Buffer {
  const bytes = Buffer.from(textEncoder.encode(value));
  const len = Buffer.alloc(4);
  len.writeUInt32LE(bytes.length, 0);
  return Buffer.concat([len, bytes]);
}

// PDA helpers matching seeds in Rust
export function findConnectionPda(programId: PublicKey, chainId: bigint) {
  return PublicKey.findProgramAddressSync([
    Buffer.from("connection"),
    Buffer.from(new Uint8Array(new BigUint64Array([chainId]).buffer)),
  ], programId);
}

export function findNftDataPda(programId: PublicKey, tokenId: bigint) {
  return PublicKey.findProgramAddressSync([
    Buffer.from("nft"),
    Buffer.from(new Uint8Array(new BigUint64Array([tokenId]).buffer)),
  ], programId);
}

export function findEnumerablePda(programId: PublicKey, tokenId: bigint) {
  return PublicKey.findProgramAddressSync([
    Buffer.from("enumerable"),
    Buffer.from(new Uint8Array(new BigUint64Array([tokenId]).buffer)),
  ], programId);
}

export function findNftOriginPda(programId: PublicKey, mint: PublicKey, tokenId: bigint) {
  return PublicKey.findProgramAddressSync([
    Buffer.from("nft_origin"),
    mint.toBuffer(),
    Buffer.from(new Uint8Array(new BigUint64Array([tokenId]).buffer)),
  ], programId);
}

export function findMetadataPda(mint: PublicKey) {
  return PublicKey.findProgramAddressSync([
    Buffer.from("metadata"),
    TOKEN_METADATA_PROGRAM_ID.toBuffer(),
    mint.toBuffer(),
  ], TOKEN_METADATA_PROGRAM_ID);
}

export function findMasterEditionPda(mint: PublicKey) {
  return PublicKey.findProgramAddressSync([
    Buffer.from("metadata"),
    TOKEN_METADATA_PROGRAM_ID.toBuffer(),
    mint.toBuffer(),
    Buffer.from("edition"),
  ], TOKEN_METADATA_PROGRAM_ID);
}

// Account decoding (ProgramState and EnumerableData) for read helpers
// Anchor account layout: 8-byte discriminator then fields
const PROGRAM_STATE_DISCRIMINATOR = Buffer.from(SHA256("account:ProgramState").toString(Hex), "hex").slice(0, 8);
const ENUMERABLE_DATA_DISCRIMINATOR = Buffer.from(SHA256("account:EnumerableData").toString(Hex), "hex").slice(0, 8);

export type ProgramState = {
  authority: PublicKey;
  name: string;
  symbol: string;
  gateway: PublicKey;
  gasLimit: bigint;
  uniswapRouter: PublicKey;
  isPaused: boolean;
  nextTokenId: bigint;
  totalSupply: bigint;
  isInitialized: boolean;
};

function readString(buf: Buffer, offset: number): { value: string; next: number } {
  const len = buf.readUInt32LE(offset); 
  const start = offset + 4;
  const end = start + len;
  return { value: Buffer.from(buf.slice(start, end)).toString("utf8"), next: end };
}

export function decodeProgramState(data: Buffer): ProgramState {
  let o = 0;
  o += 8; // skip discriminator
  const authority = new PublicKey(data.slice(o, o + 32)); o += 32;
  const nameR = readString(data, o); o = nameR.next; const name = nameR.value;
  const symbolR = readString(data, o); o = symbolR.next; const symbol = symbolR.value;
  const gateway = new PublicKey(data.slice(o, o + 32)); o += 32;
  const gasLimit = data.readBigUInt64LE(o); o += 8;
  const uniswapRouter = new PublicKey(data.slice(o, o + 32)); o += 32;
  const isPaused = data[o] !== 0; o += 1;
  const nextTokenId = data.readBigUInt64LE(o); o += 8;
  const totalSupply = data.readBigUInt64LE(o); o += 8;
  const isInitialized = data[o] !== 0; o += 1;
  return { authority, name, symbol, gateway, gasLimit, uniswapRouter, isPaused, nextTokenId, totalSupply, isInitialized };
}

export function decodeEnumerableData(data: Buffer): { tokenId: bigint; owner: PublicKey; indexInOwnerList: bigint } {
  let o = 0;
  o += 8; // skip discriminator
  const tokenId = data.readBigUInt64LE(o); o += 8;
  const owner = new PublicKey(data.slice(o, o + 32)); o += 32;
  const indexInOwnerList = data.readBigUInt64LE(o); o += 8;
  return { tokenId, owner, indexInOwnerList };
}

// Instruction builders
export class UniversalNftClient {
  readonly programId: PublicKey;
  constructor(programId: PublicKey = DEFAULT_PROGRAM_ID) {
    this.programId = programId;
  }

  // initialize(name: string, symbol: string, gateway: PublicKey, gasLimit: bigint, uniswapRouter: PublicKey)
  buildInitializeIx(args: { state: PublicKey; initialOwner: PublicKey; name: string; symbol: string; gateway: PublicKey; gasLimit: bigint | number; uniswapRouter: PublicKey; }): TransactionInstruction {
    const data = Buffer.concat([
      anchorDiscriminator("initialize"),
      encodeString(args.name),
      encodeString(args.symbol),
      args.gateway.toBuffer(),
      encodeU64(args.gasLimit),
      args.uniswapRouter.toBuffer(),
    ]);

    const keys = [
      { pubkey: args.state, isSigner: false, isWritable: true },
      { pubkey: args.initialOwner, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ];
    return new TransactionInstruction({ programId: this.programId, keys, data });
  }

  buildSetGatewayIx(args: { state: PublicKey; authority: PublicKey; gateway: PublicKey }): TransactionInstruction {
    const data = Buffer.concat([
      anchorDiscriminator("set_gateway"),
      args.gateway.toBuffer(),
    ]);
    const keys = [
      { pubkey: args.state, isSigner: false, isWritable: true },
      { pubkey: args.authority, isSigner: true, isWritable: false },
    ];
    return new TransactionInstruction({ programId: this.programId, keys, data });
  }

  buildSetGasLimitIx(args: { state: PublicKey; authority: PublicKey; gasLimit: bigint | number }): TransactionInstruction {
    const data = Buffer.concat([
      anchorDiscriminator("set_gas_limit"),
      encodeU64(args.gasLimit),
    ]);
    const keys = [
      { pubkey: args.state, isSigner: false, isWritable: true },
      { pubkey: args.authority, isSigner: true, isWritable: false },
    ];
    return new TransactionInstruction({ programId: this.programId, keys, data });
  }

  buildSetConnectedIx(args: { state: PublicKey; authority: PublicKey; chainId: bigint; contractAddress: string; connectionPda: PublicKey; }): TransactionInstruction {
    const data = Buffer.concat([
      anchorDiscriminator("set_connected"),
      encodeU64(args.chainId),
      encodeString(args.contractAddress),
    ]);
    const keys = [
      { pubkey: args.state, isSigner: false, isWritable: false },
      { pubkey: args.connectionPda, isSigner: false, isWritable: true },
      { pubkey: args.authority, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ];
    return new TransactionInstruction({ programId: this.programId, keys, data });
  }

  buildPauseIx(args: { state: PublicKey; authority: PublicKey }): TransactionInstruction {
    const data = anchorDiscriminator("pause");
    const keys = [
      { pubkey: args.state, isSigner: false, isWritable: true },
      { pubkey: args.authority, isSigner: true, isWritable: false },
    ];
    return new TransactionInstruction({ programId: this.programId, keys, data });
  }

  buildUnpauseIx(args: { state: PublicKey; authority: PublicKey }): TransactionInstruction {
    const data = anchorDiscriminator("unpause");
    const keys = [
      { pubkey: args.state, isSigner: false, isWritable: true },
      { pubkey: args.authority, isSigner: true, isWritable: false },
    ];
    return new TransactionInstruction({ programId: this.programId, keys, data });
  }

  buildSafeMintIx(args: {
    state: PublicKey;
    nftDataPda: PublicKey;
    enumerablePda: PublicKey;
    mint: PublicKey;
    tokenAccount: PublicKey;
    metadata: PublicKey;
    masterEdition: PublicKey;
    nftOriginPda: PublicKey;
    recipient: PublicKey;
    payer: PublicKey;
    authority: PublicKey; // state.authority
    mintAuthority: PublicKey;
    uri: string;
  }): TransactionInstruction {
    const data = Buffer.concat([
      anchorDiscriminator("safe_mint"),
      encodeString(args.uri),
    ]);
    const keys = [
      { pubkey: args.state, isSigner: false, isWritable: true },
      { pubkey: args.nftDataPda, isSigner: false, isWritable: true },
      { pubkey: args.enumerablePda, isSigner: false, isWritable: true },
      { pubkey: args.mint, isSigner: true, isWritable: true },
      { pubkey: args.tokenAccount, isSigner: false, isWritable: true },
      { pubkey: args.metadata, isSigner: false, isWritable: true },
      { pubkey: args.masterEdition, isSigner: false, isWritable: true },
      { pubkey: args.nftOriginPda, isSigner: false, isWritable: true },
      { pubkey: args.recipient, isSigner: false, isWritable: false },
      { pubkey: args.payer, isSigner: true, isWritable: true },
      { pubkey: args.authority, isSigner: true, isWritable: false },
      { pubkey: args.mintAuthority, isSigner: true, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: TOKEN_METADATA_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ];
    return new TransactionInstruction({ programId: this.programId, keys, data });
  }

  buildBurnTokenIx(args: { state: PublicKey; nftDataPda: PublicKey; mint: PublicKey; tokenAccount: PublicKey; authority: PublicKey; tokenId: bigint }): TransactionInstruction {
    const data = Buffer.concat([
      anchorDiscriminator("burn_token"),
      encodeU64(args.tokenId),
    ]);
    const keys = [
      { pubkey: args.state, isSigner: false, isWritable: true },
      { pubkey: args.nftDataPda, isSigner: false, isWritable: true },
      { pubkey: args.mint, isSigner: false, isWritable: true },
      { pubkey: args.tokenAccount, isSigner: false, isWritable: true },
      { pubkey: args.authority, isSigner: true, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];
    return new TransactionInstruction({ programId: this.programId, keys, data });
  }

  buildTransferCrossChainIx(args: { state: PublicKey; nftDataPda: PublicKey; mint: PublicKey; tokenAccount: PublicKey; nftOriginPda: PublicKey; owner: PublicKey; tokenId: bigint; receiver: string; destinationChainId: bigint }): TransactionInstruction {
    const data = Buffer.concat([
      anchorDiscriminator("transfer_cross_chain"),
      encodeU64(args.tokenId),
      encodeString(args.receiver),
      encodeU64(args.destinationChainId),
    ]);
    const keys = [
      { pubkey: args.state, isSigner: false, isWritable: true },
      { pubkey: args.nftDataPda, isSigner: false, isWritable: true },
      { pubkey: args.mint, isSigner: false, isWritable: true },
      { pubkey: args.tokenAccount, isSigner: false, isWritable: true },
      { pubkey: args.nftOriginPda, isSigner: false, isWritable: false },
      { pubkey: args.owner, isSigner: true, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];
    return new TransactionInstruction({ programId: this.programId, keys, data });
  }

  buildHandleCrossChainReceiveIx(args: { state: PublicKey; nftDataPda: PublicKey; enumerablePda: PublicKey; mint: PublicKey; tokenAccount: PublicKey; recipient: PublicKey; payer: PublicKey; mintAuthority: PublicKey; tokenId: bigint; uri: string; senderChainId: bigint }): TransactionInstruction {
    const data = Buffer.concat([
      anchorDiscriminator("handle_cross_chain_receive"),
      encodeU64(args.tokenId),
      encodeString(args.uri),
      encodeU64(args.senderChainId),
      encodeString("") // _original_sender not used by program logic
    ]);
    const keys = [
      { pubkey: args.state, isSigner: false, isWritable: true },
      { pubkey: args.nftDataPda, isSigner: false, isWritable: true },
      { pubkey: args.enumerablePda, isSigner: false, isWritable: true },
      { pubkey: args.mint, isSigner: true, isWritable: true },
      { pubkey: args.tokenAccount, isSigner: false, isWritable: true },
      { pubkey: args.recipient, isSigner: false, isWritable: false },
      { pubkey: args.payer, isSigner: true, isWritable: true },
      { pubkey: args.mintAuthority, isSigner: true, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ];
    return new TransactionInstruction({ programId: this.programId, keys, data });
  }

  buildRevertTransferIx(args: { state: PublicKey; nftDataPda: PublicKey; mint: PublicKey; tokenAccount: PublicKey; originalOwner: PublicKey; payer: PublicKey; mintAuthority: PublicKey; tokenId: bigint }): TransactionInstruction {
    const data = Buffer.concat([
      anchorDiscriminator("revert_transfer"),
      encodeU64(args.tokenId),
      // original_owner passed as account, not arg
    ]);
    const keys = [
      { pubkey: args.state, isSigner: false, isWritable: true },
      { pubkey: args.nftDataPda, isSigner: false, isWritable: true },
      { pubkey: args.mint, isSigner: true, isWritable: true },
      { pubkey: args.tokenAccount, isSigner: false, isWritable: true },
      { pubkey: args.originalOwner, isSigner: false, isWritable: false },
      { pubkey: args.payer, isSigner: true, isWritable: true },
      { pubkey: args.mintAuthority, isSigner: true, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ];
    return new TransactionInstruction({ programId: this.programId, keys, data });
  }

  // Read helpers
  async fetchProgramState(connection: Connection, state: PublicKey): Promise<ProgramState | null> {
    const acc = await connection.getAccountInfo(state);
    if (!acc) return null;
    return decodeProgramState(acc.data);
  }

  async getTotalSupply(connection: Connection, state: PublicKey): Promise<bigint | null> {
    const s = await this.fetchProgramState(connection, state);
    return s ? s.totalSupply : null;
    
  }

  async getIsPaused(connection: Connection, state: PublicKey): Promise<boolean | null> {
    const s = await this.fetchProgramState(connection, state);
    return s ? s.isPaused : null;
  }

  async getTokenOfOwnerByIndex(connection: Connection, programId: PublicKey, tokenId: bigint): Promise<bigint | null> {
    const [enumerable] = findEnumerablePda(programId, tokenId);
    const acc = await connection.getAccountInfo(enumerable);
    if (!acc) return null;
    const dec = decodeEnumerableData(acc.data);
    return dec.tokenId;
  }
}

// High-level builders that derive PDAs and addresses for common flows
export async function buildSafeMintTransaction(opts: {
  connection: Connection;
  programId?: PublicKey;
  state: PublicKey;
  payer: PublicKey;
  authority: PublicKey;
  mintAuthority: PublicKey;
  recipient: PublicKey;
  uri: string;
}): Promise<{ instruction: TransactionInstruction; signers: Keypair[]; addresses: { mint: PublicKey; tokenAccount: PublicKey; nftDataPda: PublicKey; enumerablePda: PublicKey; metadata: PublicKey; masterEdition: PublicKey; nftOriginPda: PublicKey; nextTokenId: bigint } }> {
  const programId = opts.programId ?? DEFAULT_PROGRAM_ID;
  const client = new UniversalNftClient(programId);
  const stateInfo = await client.fetchProgramState(opts.connection, opts.state);
  if (!stateInfo) throw new Error("State account not found");
  const nextTokenId = stateInfo.nextTokenId;

  const [nftDataPda] = findNftDataPda(programId, nextTokenId);
  const [enumerablePda] = findEnumerablePda(programId, nextTokenId);
  const mintKp = Keypair.generate();
  const mint = mintKp.publicKey;
  const tokenAccount = getAssociatedTokenAddressSync(mint, opts.recipient, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
  const [metadata] = findMetadataPda(mint);
  const [masterEdition] = findMasterEditionPda(mint);
  const [nftOriginPda] = findNftOriginPda(programId, mint, nextTokenId);

  const ix = client.buildSafeMintIx({
    state: opts.state,
    nftDataPda,
    enumerablePda,
    mint,
    tokenAccount,
    metadata,
    masterEdition,
    nftOriginPda,
    recipient: opts.recipient,
    payer: opts.payer,
    authority: opts.authority,
    mintAuthority: opts.mintAuthority,
    uri: opts.uri,
  });

  return { instruction: ix, signers: [mintKp], addresses: { mint, tokenAccount, nftDataPda, enumerablePda, metadata, masterEdition, nftOriginPda, nextTokenId } };
}

export function buildBurnTransaction(args: { programId?: PublicKey; state: PublicKey; authority: PublicKey; tokenId: bigint; mint: PublicKey }): { instruction: TransactionInstruction; tokenAccount: PublicKey; nftDataPda: PublicKey } {
  const programId = args.programId ?? DEFAULT_PROGRAM_ID;
  const client = new UniversalNftClient(programId);
  const [nftDataPda] = findNftDataPda(programId, args.tokenId);
  const tokenAccount = getAssociatedTokenAddressSync(args.mint, args.authority);
  const ix = client.buildBurnTokenIx({ state: args.state, nftDataPda, mint: args.mint, tokenAccount, authority: args.authority, tokenId: args.tokenId });
  return { instruction: ix, tokenAccount, nftDataPda };
}

export function buildTransferCrossChainTransaction(args: { programId?: PublicKey; state: PublicKey; owner: PublicKey; tokenId: bigint; mint: PublicKey; receiver: string; destinationChainId: bigint }): { instruction: TransactionInstruction; tokenAccount: PublicKey; nftDataPda: PublicKey; nftOriginPda: PublicKey } {
  const programId = args.programId ?? DEFAULT_PROGRAM_ID;
  const client = new UniversalNftClient(programId);
  const [nftDataPda] = findNftDataPda(programId, args.tokenId);
  const tokenAccount = getAssociatedTokenAddressSync(args.mint, args.owner);
  const [nftOriginPda] = findNftOriginPda(programId, args.mint, args.tokenId);
  const ix = client.buildTransferCrossChainIx({ state: args.state, nftDataPda, mint: args.mint, tokenAccount, nftOriginPda, owner: args.owner, tokenId: args.tokenId, receiver: args.receiver, destinationChainId: args.destinationChainId });
  return { instruction: ix, tokenAccount, nftDataPda, nftOriginPda };
}

export function buildHandleReceiveTransaction(args: { programId?: PublicKey; state: PublicKey; payer: PublicKey; mintAuthority: PublicKey; recipient: PublicKey; tokenId: bigint; uri: string; senderChainId: bigint }): { instruction: TransactionInstruction; signers: Keypair[]; mint: PublicKey; tokenAccount: PublicKey; nftDataPda: PublicKey; enumerablePda: PublicKey } {
  const programId = args.programId ?? DEFAULT_PROGRAM_ID;
  const client = new UniversalNftClient(programId);
  const [nftDataPda] = findNftDataPda(programId, args.tokenId);
  const [enumerablePda] = findEnumerablePda(programId, args.tokenId);
  const mintKp = Keypair.generate();
  const mint = mintKp.publicKey;
  const tokenAccount = getAssociatedTokenAddressSync(mint, args.recipient);
  const ix = client.buildHandleCrossChainReceiveIx({ state: args.state, nftDataPda, enumerablePda, mint, tokenAccount, recipient: args.recipient, payer: args.payer, mintAuthority: args.mintAuthority, tokenId: args.tokenId, uri: args.uri, senderChainId: args.senderChainId });
  return { instruction: ix, signers: [mintKp], mint, tokenAccount, nftDataPda, enumerablePda };
}

export function buildRevertTransferTransaction(args: { programId?: PublicKey; state: PublicKey; payer: PublicKey; mintAuthority: PublicKey; originalOwner: PublicKey; tokenId: bigint }): { instruction: TransactionInstruction; signers: Keypair[]; mint: PublicKey; tokenAccount: PublicKey; nftDataPda: PublicKey } {
  const programId = args.programId ?? DEFAULT_PROGRAM_ID;
  const client = new UniversalNftClient(programId);
  const [nftDataPda] = findNftDataPda(programId, args.tokenId);
  const mintKp = Keypair.generate();
  const mint = mintKp.publicKey;
  const tokenAccount = getAssociatedTokenAddressSync(mint, args.originalOwner);
  const ix = client.buildRevertTransferIx({ state: args.state, nftDataPda, mint, tokenAccount, originalOwner: args.originalOwner, payer: args.payer, mintAuthority: args.mintAuthority, tokenId: args.tokenId });
  return { instruction: ix, signers: [mintKp], mint, tokenAccount, nftDataPda };
}

// Convenience to bundle instructions into a transaction
export async function buildV0Tx(connection: Connection, payer: PublicKey, ixs: TransactionInstruction[], signers: Keypair[] = [], luts: AddressLookupTableAccount[] = []): Promise<VersionedTransaction> {
  const { blockhash } = await connection.getLatestBlockhash();
  const message = new TransactionMessage({ payerKey: payer, recentBlockhash: blockhash, instructions: ixs }).compileToV0Message(luts);
  const tx = new VersionedTransaction(message);
  if (signers.length) {
    tx.sign(signers);
  }
  return tx;
}


