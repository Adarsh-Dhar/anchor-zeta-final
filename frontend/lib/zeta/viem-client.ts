import { createPublicClient, createWalletClient, http, type WalletClient, type PublicClient, type Address, type Hex } from 'viem';
import { zetachainAthensTestnet } from 'viem/chains';
import { ZetaChainUniversalNFTAbi } from './abi';
import { ZetaChainUniversalNFTAddress } from './address';

export class ZetaChainUniversalNFTViemClient {
  private readonly address: Address;
  private readonly walletClient: WalletClient;
  private readonly publicClient: PublicClient;

  constructor(walletClient: WalletClient, publicClient: PublicClient, contractAddress?: string) {
    this.walletClient = walletClient;
    this.publicClient = publicClient;
    this.address = (contractAddress || ZetaChainUniversalNFTAddress) as Address;
  }

  /**
   * Get the connected wallet address
   */
  async getConnectedAddress(): Promise<Address> {
    if (!this.walletClient.account) {
      throw new Error("Wallet not connected");
    }
    return this.walletClient.account.address;
  }

  /**
   * Read contract data
   */
  async name(): Promise<string> {
    const result = await this.publicClient.readContract({
      address: this.address,
      abi: ZetaChainUniversalNFTAbi,
      functionName: 'name',
    });
    return result as string;
  }

  async symbol(): Promise<string> {
    const result = await this.publicClient.readContract({
      address: this.address,
      abi: ZetaChainUniversalNFTAbi,
      functionName: 'symbol',
    });
    return result as string;
  }

  async owner(): Promise<Address> {
    const result = await this.publicClient.readContract({
      address: this.address,
      abi: ZetaChainUniversalNFTAbi,
      functionName: 'owner',
    });
    return result as Address;
  }

  async tokenURI(tokenId: bigint): Promise<string> {
    const result = await this.publicClient.readContract({
      address: this.address,
      abi: ZetaChainUniversalNFTAbi,
      functionName: 'tokenURI',
      args: [tokenId],
    });
    return result as string;
  }

  async balanceOf(owner: Address): Promise<bigint> {
    const result = await this.publicClient.readContract({
      address: this.address,
      abi: ZetaChainUniversalNFTAbi,
      functionName: 'balanceOf',
      args: [owner],
    });
    return result as bigint;
  }

  async ownerOf(tokenId: bigint): Promise<Address> {
    const result = await this.publicClient.readContract({
      address: this.address,
      abi: ZetaChainUniversalNFTAbi,
      functionName: 'ownerOf',
      args: [tokenId],
    });
    return result as Address;
  }

  async gateway(): Promise<Address> {
    const result = await this.publicClient.readContract({
      address: this.address,
      abi: ZetaChainUniversalNFTAbi,
      functionName: 'gateway',
    });
    return result as Address;
  }

  async gasLimitAmount(): Promise<bigint> {
    const result = await this.publicClient.readContract({
      address: this.address,
      abi: ZetaChainUniversalNFTAbi,
      functionName: 'gasLimitAmount',
    });
    return result as bigint;
  }

  async uniswapRouter(): Promise<Address> {
    const result = await this.publicClient.readContract({
      address: this.address,
      abi: ZetaChainUniversalNFTAbi,
      functionName: 'uniswapRouter',
    });
    return result as Address;
  }

  async isUniversal(): Promise<boolean> {
    const result = await this.publicClient.readContract({
      address: this.address,
      abi: ZetaChainUniversalNFTAbi,
      functionName: 'isUniversal',
    });
    return result as boolean;
  }

  async getApproved(tokenId: bigint): Promise<Address> {
    const result = await this.publicClient.readContract({
      address: this.address,
      abi: ZetaChainUniversalNFTAbi,
      functionName: 'getApproved',
      args: [tokenId],
    });
    return result as Address;
  }

  async isApprovedForAll(owner: Address, operator: Address): Promise<boolean> {
    const result = await this.publicClient.readContract({
      address: this.address,
      abi: ZetaChainUniversalNFTAbi,
      functionName: 'isApprovedForAll',
      args: [owner, operator],
    });
    return result as boolean;
  }

  /**
   * Write contract functions (require wallet)
   */
  async initialize(
    initialOwner: Address,
    name: string,
    symbol: string,
    gatewayAddress: Address,
    gas: bigint,
    uniswapRouterAddress: Address
  ): Promise<Hex> {
    if (!this.walletClient.account) {
      throw new Error("Wallet not connected");
    }

    const { request } = await this.publicClient.simulateContract({
      account: this.walletClient.account,
      address: this.address,
      abi: ZetaChainUniversalNFTAbi,
      functionName: 'initialize',
      args: [initialOwner, name, symbol, gatewayAddress, gas, uniswapRouterAddress],
    });

    const hash = await this.walletClient.writeContract(request);
    return hash;
  }

  async approve(to: Address, tokenId: bigint): Promise<Hex> {
    if (!this.walletClient.account) {
      throw new Error("Wallet not connected");
    }

    const { request } = await this.publicClient.simulateContract({
      account: this.walletClient.account,
      address: this.address,
      abi: ZetaChainUniversalNFTAbi,
      functionName: 'approve',
      args: [to, tokenId],
    });

    const hash = await this.walletClient.writeContract(request);
    return hash;
  }

  async setApprovalForAll(operator: Address, approved: boolean): Promise<Hex> {
    if (!this.walletClient.account) {
      throw new Error("Wallet not connected");
    }

    const { request } = await this.publicClient.simulateContract({
      account: this.walletClient.account,
      address: this.address,
      abi: ZetaChainUniversalNFTAbi,
      functionName: 'setApprovalForAll',
      args: [operator, approved],
    });

    const hash = await this.walletClient.writeContract(request);
    return hash;
  }

  async transferFrom(from: Address, to: Address, tokenId: bigint): Promise<Hex> {
    if (!this.walletClient.account) {
      throw new Error("Wallet not connected");
    }

    const { request } = await this.publicClient.simulateContract({
      account: this.walletClient.account,
      address: this.address,
      abi: ZetaChainUniversalNFTAbi,
      functionName: 'transferFrom',
      args: [from, to, tokenId],
    });

    const hash = await this.walletClient.writeContract(request);
    return hash;
  }

  async safeTransferFrom(from: Address, to: Address, tokenId: bigint): Promise<Hex> {
    if (!this.walletClient.account) {
      throw new Error("Wallet not connected");
    }

    const { request } = await this.publicClient.simulateContract({
      account: this.walletClient.account,
      address: this.address,
      abi: ZetaChainUniversalNFTAbi,
      functionName: 'safeTransferFrom',
      args: [from, to, tokenId],
    });

    const hash = await this.walletClient.writeContract(request);
    return hash;
  }

  async safeTransferFromWithData(from: Address, to: Address, tokenId: bigint, data: Hex): Promise<Hex> {
    if (!this.walletClient.account) {
      throw new Error("Wallet not connected");
    }

    const { request } = await this.publicClient.simulateContract({
      account: this.walletClient.account,
      address: this.address,
      abi: ZetaChainUniversalNFTAbi,
      functionName: 'safeTransferFrom',
      args: [from, to, tokenId, data],
    });

    const hash = await this.walletClient.writeContract(request);
    return hash;
  }

  async transferOwnership(newOwner: Address): Promise<Hex> {
    if (!this.walletClient.account) {
      throw new Error("Wallet not connected");
    }

    const { request } = await this.publicClient.simulateContract({
      account: this.walletClient.account,
      address: this.address,
      abi: ZetaChainUniversalNFTAbi,
      functionName: 'transferOwnership',
      args: [newOwner],
    });

    const hash = await this.walletClient.writeContract(request);
    return hash;
  }

  async renounceOwnership(): Promise<Hex> {
    if (!this.walletClient.account) {
      throw new Error("Wallet not connected");
    }

    const { request } = await this.publicClient.simulateContract({
      account: this.walletClient.account,
      address: this.address,
      abi: ZetaChainUniversalNFTAbi,
      functionName: 'renounceOwnership',
    });

    const hash = await this.walletClient.writeContract(request);
    return hash;
  }

  async safeMint(to: Address, uri: string): Promise<Hex> {
    if (!this.walletClient.account) {
      throw new Error("Wallet not connected");
    }

    const { request } = await this.publicClient.simulateContract({
      account: this.walletClient.account,
      address: this.address,
      abi: ZetaChainUniversalNFTAbi,
      functionName: 'safeMint',
      args: [to, uri],
    });

    const hash = await this.walletClient.writeContract(request);
    return hash;
  }

  async setConnected(zrc20: Address, solanaContractAddress: string): Promise<Hex> {
    if (!this.walletClient.account) {
      throw new Error("Wallet not connected");
    }

    // Convert Solana address to bytes
    let bytesData: Uint8Array;
    try {
      const { PublicKey } = require('@solana/web3.js');
      const publicKey = new PublicKey(solanaContractAddress);
      bytesData = publicKey.toBytes();
    } catch (error) {
      throw new Error(`Failed to convert Solana address to bytes: ${error}`);
    }

    const { request } = await this.publicClient.simulateContract({
      account: this.walletClient.account,
      address: this.address,
      abi: ZetaChainUniversalNFTAbi,
      functionName: 'setConnected',
      args: [zrc20, bytesData],
    });

    const hash = await this.walletClient.writeContract(request);
    return hash;
  }

  async setGasLimit(gas: bigint): Promise<Hex> {
    if (!this.walletClient.account) {
      throw new Error("Wallet not connected");
    }

    const { request } = await this.publicClient.simulateContract({
      account: this.walletClient.account,
      address: this.address,
      abi: ZetaChainUniversalNFTAbi,
      functionName: 'setGasLimit',
      args: [gas],
    });

    const hash = await this.walletClient.writeContract(request);
    return hash;
  }

  async setGateway(gatewayAddress: Address): Promise<Hex> {
    if (!this.walletClient.account) {
      throw new Error("Wallet not connected");
    }

    const { request } = await this.publicClient.simulateContract({
      account: this.walletClient.account,
      address: this.address,
      abi: ZetaChainUniversalNFTAbi,
      functionName: 'setGateway',
      args: [gatewayAddress],
    });

    const hash = await this.walletClient.writeContract(request);
    return hash;
  }

  async setUniversal(universalAddress: Address): Promise<Hex> {
    if (!this.walletClient.account) {
      throw new Error("Wallet not connected");
    }

    const { request } = await this.publicClient.simulateContract({
      account: this.walletClient.account,
      address: this.address,
      abi: ZetaChainUniversalNFTAbi,
      functionName: 'setUniversal',
      args: [universalAddress],
    });

    const hash = await this.walletClient.writeContract(request);
    return hash;
  }

  async transferCrossChain(
    tokenId: bigint, 
    receiver: string, 
    destination: string, 
    value?: bigint
  ): Promise<Hex> {
    if (!this.walletClient.account) {
      throw new Error("Wallet not connected");
    }

    const { request } = await this.publicClient.simulateContract({
      account: this.walletClient.account,
      address: this.address,
      abi: ZetaChainUniversalNFTAbi,
      functionName: 'transferCrossChain',
      args: [tokenId, receiver, destination],
      value: value || BigInt(0),
    });

    const hash = await this.walletClient.writeContract(request);
    return hash;
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(hash: Hex): Promise<{ hash: Hex }> {
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
    return {
      hash: receipt.transactionHash,
    };
  }
}

/**
 * Factory function to create a viem-based Zeta client
 */
export function createZetaViemClient(
  walletClient: WalletClient, 
  publicClient: PublicClient, 
  contractAddress?: string
): ZetaChainUniversalNFTViemClient {
  return new ZetaChainUniversalNFTViemClient(walletClient, publicClient, contractAddress);
}
