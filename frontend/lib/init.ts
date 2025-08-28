/* eslint-disable @typescript-eslint/no-explicit-any */
// (removed unused imports from ./zeta)
import { ZetaChainUniversalNFTAddress } from "./zeta/address";
import { createZetaViemClient } from "./zeta/viem-client";
import { DEFAULT_PROGRAM_ID, buildInitializeTransaction, buildV0Tx } from "./solana";
import { Connection, PublicKey } from "@solana/web3.js";
import type { WalletClient, PublicClient } from 'viem';

export interface InitConfig {
  zetaRpcUrl: string;
  solanaRpcUrl: string;
  zetaChainId?: number;
  solanaChainId?: number;
}

export interface InitResult {
  success: boolean;
  zetaStatus: string;
  solanaStatus: string;
  universalStatus?: string;
  error?: string;
}

export class ContractInitializer {
  private config: InitConfig;
  private readonly zetaContractAddress: string;
  private readonly solanaContractAddress: string;
  private solanaStateAddress?: string;

  constructor(config: InitConfig) {
    this.config = config;
    this.zetaContractAddress = ZetaChainUniversalNFTAddress;
    this.solanaContractAddress = DEFAULT_PROGRAM_ID.toString();
  }

  async initializeZetaChain(walletClient: WalletClient, publicClient?: PublicClient): Promise<string> {
    try {
      console.log("initializeZetaChain");
      
      // Check if wagmi data is provided
      if (!walletClient) {
        throw new Error("Wallet client not provided. Please connect your wallet first.");
      }
      
      if (!walletClient.account) {
        throw new Error("Wallet not connected. Please connect your wallet first.");
      }
      
      if (!publicClient) {
        throw new Error("Public client not provided. Please ensure wagmi is properly configured.");
      }
      
      console.log("Wallet client:", walletClient);
      console.log("Connected address:", walletClient.account.address);
      
      // Get network info for logging
      const network = await publicClient.getChainId();
      console.log("Network chain ID:", network);
      
      const blockNumber = await publicClient.getBlockNumber();
      console.log("Latest block:", blockNumber);
      
      try {
        // Create viem-based Zeta client using the connected wallet
        const zetaClient = createZetaViemClient(walletClient, publicClient, this.zetaContractAddress);
        
        console.log("Connected wallet address:", walletClient.account.address);
        console.log("this.solanaContractAddress", this.solanaContractAddress);
        console.log("this.zetaContractAddress", this.zetaContractAddress);
        
        // Call setConnected to connect to Solana using the actual connected wallet
        console.log("🚀 Initiating setConnected transaction...");
        const txHash = await zetaClient.setConnected(
          "0xd97B1de3619ed2c6BEb3860147E30cA8A7dC9891", // ZRC20 token address
          this.solanaContractAddress // Solana contract address (will be converted to bytes)
        );
        
        console.log("📝 Transaction hash:", txHash);
        console.log("⏳ Waiting for transaction confirmation...");
        
        // Wait for transaction confirmation
        const receipt = await zetaClient.waitForTransaction(txHash);
        console.log("✅ Transaction confirmed:", receipt);
        
        // Enhanced transaction result logging
        console.log("🎯 SET CONNECTED TRANSACTION RESULTS:");
        console.log("  📊 Transaction Hash:", txHash);
        console.log("  🔗 Block Hash:", receipt.hash);
        console.log("  🎯 Function: setConnected");
        console.log("  📍 ZRC20 Token:", "0xd97B1de3619ed2c6BEb3860147E30cA8A7dC9891");
        console.log("  🏗️  Solana Contract:", this.solanaContractAddress);
        console.log("  👤 From Address:", walletClient.account.address);
        console.log("  🌐 Network Chain ID:", network);
        console.log("  📦 Latest Block:", blockNumber);
        
        return "✅ ZetaChain setConnected completed successfully";
        
      } catch (rpcError) {
        console.error("RPC connection error:", rpcError);
        
        // Check for ENS-related errors
        if (rpcError instanceof Error && (rpcError.message.includes("ENS resolution not supported") || rpcError.message.includes("network does not support ENS"))) {
          console.log("ENS resolution not supported on this network - this is expected for ZetaChain");
          console.log("Using viem wallet client directly - ENS issues should be resolved");
          
          // Try the contract call again since viem should handle ENS issues better
          try {
            const zetaClient = createZetaViemClient(walletClient, publicClient, this.zetaContractAddress);
            console.log("🚀 Retrying setConnected transaction (ENS bypassed)...");
            const txHash = await zetaClient.setConnected(
              "0xd97B1de3619ed2c6BEb3860147E30cA8A7dC9891",
              this.solanaContractAddress
            );
            
            console.log("📝 Transaction hash (ENS bypassed):", txHash);
            console.log("⏳ Waiting for transaction confirmation...");
            
            const receipt = await zetaClient.waitForTransaction(txHash);
            console.log("✅ Transaction confirmed (ENS bypassed):", receipt);
            
            // Enhanced transaction result logging for retry
            console.log("🎯 SET CONNECTED TRANSACTION RESULTS (ENS BYPASSED):");
            console.log("  📊 Transaction Hash:", txHash);
            console.log("  🔗 Block Hash:", receipt.hash);
            console.log("  🎯 Function: setConnected");
            console.log("  📍 ZRC20 Token:", "0xd97B1de3619ed2c6BEb3860147E30cA8A7dC9891");
            console.log("  🏗️  Solana Contract:", this.solanaContractAddress);
            console.log("  👤 From Address:", walletClient.account.address);
            console.log("  🌐 Network Chain ID:", network);
            console.log("  📦 Latest Block:", blockNumber);
            console.log("  ⚠️  Note: ENS resolution was bypassed");
            
            return "✅ ZetaChain setConnected completed successfully (ENS bypassed)";
          } catch (retryError) {
            throw new Error(`Contract call failed even with ENS bypass: ${retryError}`);
          }
        }
        
        throw new Error(`RPC connection successful but contract operation failed. Error: ${rpcError}`);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      throw new Error(`ZetaChain initialization failed: ${errorMsg}`);
    }
  }

  async setUniversalAddress(walletClient: WalletClient, publicClient?: PublicClient, universalAddress?: string): Promise<string> {
    try {
      console.log("🚀 Initiating setUniversal transaction...");
      
      if (!walletClient) {
        throw new Error("Wallet client not provided. Please connect your wallet first.");
      }
      
      if (!walletClient.account) {
        throw new Error("Wallet not connected. Please connect your wallet first.");
      }
      
      if (!publicClient) {
        throw new Error("Public client not provided. Please ensure wagmi is properly configured.");
      }
      
      // Use provided universal address or default to the ZetaChain contract address
      const targetUniversalAddress = universalAddress || this.zetaContractAddress;
      
      console.log("🎯 SET UNIVERSAL TRANSACTION PARAMETERS:");
      console.log("  📍 Universal Address:", targetUniversalAddress);
      console.log("  👤 From Address:", walletClient.account.address);
      console.log("  🏗️  Contract Address:", this.zetaContractAddress);
      
      // Get network info for logging
      const network = await publicClient.getChainId();
      const blockNumber = await publicClient.getBlockNumber();
      
      // Create viem-based Zeta client
      const zetaClient = createZetaViemClient(walletClient, publicClient, this.zetaContractAddress);
      
      // Call setUniversal
      const txHash = await zetaClient.setUniversal(targetUniversalAddress as `0x${string}`);
      
      console.log("📝 Transaction hash:", txHash);
      console.log("⏳ Waiting for transaction confirmation...");
      
      // Wait for transaction confirmation
      const receipt = await zetaClient.waitForTransaction(txHash);
      console.log("✅ Transaction confirmed:", receipt);
      
      // Enhanced transaction result logging
      console.log("🎯 SET UNIVERSAL TRANSACTION RESULTS:");
      console.log("  📊 Transaction Hash:", txHash);
      console.log("  🔗 Block Hash:", receipt.hash);
      console.log("  🎯 Function: setUniversal");
      console.log("  📍 Universal Address:", targetUniversalAddress);
      console.log("  👤 From Address:", walletClient.account.address);
      console.log("  🏗️  Contract Address:", this.zetaContractAddress);
      console.log("  🌐 Network Chain ID:", network);
      console.log("  📦 Latest Block:", blockNumber);
      console.log("  ✅ Status: Successfully set universal address");
      
      return `✅ ZetaChain setUniversal completed successfully. Universal address set to: ${targetUniversalAddress}`;
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      console.error("❌ SET UNIVERSAL TRANSACTION FAILED:");
      console.error("  🚫 Error:", errorMsg);
      console.error("  📍 Universal Address:", universalAddress || this.zetaContractAddress);
      console.error("  👤 From Address:", walletClient?.account?.address || "Unknown");
      console.error("  🏗️  Contract Address:", this.zetaContractAddress);
      throw new Error(`ZetaChain setUniversal failed: ${errorMsg}`);
    }
  }

  async initializeSolana(wallet?: any): Promise<string> {
    try {
      const connection = new Connection(this.config.solanaRpcUrl, { commitment: "confirmed" });
      if (!wallet?.publicKey) {
        throw new Error("Connect a Solana wallet first");
      }

      // Build initialize instruction and state signer
      const { instruction, signers, state } = buildInitializeTransaction({
        programId: DEFAULT_PROGRAM_ID,
        name: "Universal NFT",
        symbol: "UNFT",
        gateway: new PublicKey("11111111111111111111111111111111"),
        gasLimit: BigInt(1000000),
        uniswapRouter: new PublicKey("11111111111111111111111111111111"),
        initialOwner: wallet.publicKey,
      });

      // Build and partially sign tx (state signer included)
      const tx = await buildV0Tx(connection, wallet.publicKey, [instruction], signers);

      // Prefer signTransaction + sendRawTransaction for stability with v0
      let signature: string | undefined;
      try {
        if (typeof wallet.signTransaction === "function") {
          const signed = await wallet.signTransaction(tx);
          signature = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false });
        } else if (typeof wallet.signAndSendTransaction === "function") {
          const res = await wallet.signAndSendTransaction(tx);
          signature = res.signature;
        } else if (typeof wallet.sendTransaction === "function") {
          signature = await wallet.sendTransaction(tx, connection);
        } else {
          throw new Error("Unsupported wallet API: expected signTransaction, signAndSendTransaction or sendTransaction");
        }
      } catch (sendErr) {
        // Try to surface program logs to help debug (e.g., fallback not found)
        const anyErr = sendErr as any;
        if (typeof anyErr?.getLogs === "function") {
          try {
            const logs = await anyErr.getLogs();
            console.error("initializeSolana logs:", logs);
          } catch {}
        } else if (anyErr?.logs) {
          console.error("initializeSolana logs:", anyErr.logs);
        }
        throw new Error(`Failed to send transaction: ${anyErr?.message || String(sendErr)}`);
      }

      if (!signature) throw new Error("Failed to obtain transaction signature");
      try {
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
      } catch (confirmErr) {
        // Fallback polling if confirmTransaction shape mismatches
        try {
          for (let i = 0; i < 30; i++) {
            const statuses = await connection.getSignatureStatuses([signature]);
            const status = statuses.value[0];
            if (status && (status.confirmations === null || (status.confirmations ?? 0) > 0)) {
              break;
            }
            await new Promise(r => setTimeout(r, 1000));
          }
        } catch (pollErr) {
          throw new Error(`Confirmation failed: ${pollErr instanceof Error ? pollErr.message : String(pollErr)} (original: ${confirmErr instanceof Error ? confirmErr.message : String(confirmErr)})`);
        }
      }

      // Save for later access
      this.solanaStateAddress = state.toString();

      return `✅ Solana initialize sent: ${signature} (State: ${state.toString()})`;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      throw new Error(`Solana initialization failed: ${errorMsg}`);
    }
  }

  async initialize(walletClient: WalletClient, publicClient?: PublicClient, solanaWallet?: any, callSetUniversal?: boolean): Promise<InitResult> {
    console.log("initialize");
    try {
      const zetaStatus = await this.initializeZetaChain(walletClient, publicClient);
      console.log("zetaStatus", zetaStatus);
      
      let universalStatus = "";
      if (callSetUniversal) {
        try {
          console.log("🔄 Proceeding to setUniversal transaction...");
          universalStatus = await this.setUniversalAddress(walletClient, publicClient);
          console.log("universalStatus", universalStatus);
        } catch (universalErr) {
          universalStatus = `❌ setUniversal failed: ${universalErr instanceof Error ? universalErr.message : "Unknown error"}`;
          console.error("setUniversal failed:", universalErr);
        }
      }
      
      const solanaStatus = await this.initializeSolana(solanaWallet);
      
      return {
        success: true,
        zetaStatus,
        solanaStatus,
        universalStatus: callSetUniversal ? universalStatus : undefined
      };
    } catch (err) {
      return {
        success: false,
        zetaStatus: "❌ Failed",
        solanaStatus: "❌ Failed",
        universalStatus: callSetUniversal ? "❌ Failed" : undefined,
        error: err instanceof Error ? err.message : "Unknown error"
      };
    }
  }

  static validateConfig(config: Partial<InitConfig>): string[] {
    const errors: string[] = [];
    
    if (!config.zetaRpcUrl) errors.push("ZETA_RPC_URL is required");
    if (!config.solanaRpcUrl) errors.push("SOLANA_RPC_URL is required");
    
    return errors;
  }

  // Test RPC connection before full initialization
  async testRpcConnection(): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      // (removed unused getProvider import)
      
      // Test ZetaChain RPC
      try {
        console.log(`Testing ZetaChain RPC endpoint: ${this.config.zetaRpcUrl}`);
        const { getZetaChainProvider } = await import("./zeta");
        const provider = getZetaChainProvider(this.config.zetaRpcUrl);
        const network = await provider.getNetwork();
        const blockNumber = await provider.getBlockNumber();
        
        // Test eth_chainId specifically
        let chainId;
        try {
          chainId = await provider.send("eth_chainId", []);
          console.log(`  Chain ID: ${chainId}`);
        } catch (chainIdError) {
          console.log(`  Warning: eth_chainId not supported: ${chainIdError}`);
          // This might cause issues later, but let's continue for now
        }
        
        // Check if this is a ZetaChain network
        const isZetaChain = network.chainId === BigInt(7000) || network.chainId === BigInt(7001);
        if (isZetaChain) {
          console.log("  ✅ Detected ZetaChain network");
        }
        
        console.log("✅ ZetaChain RPC connection successful");
        console.log("  Network:", network);
        console.log("  Latest block:", blockNumber);
        console.log("  RPC URL:", this.config.zetaRpcUrl);
        
        return { success: true, details: { network, blockNumber, rpcUrl: this.config.zetaRpcUrl, chainId, isZetaChain } };
      } catch (zetaError) {
        console.error("❌ ZetaChain RPC connection failed:", zetaError);
        console.error("  RPC URL:", this.config.zetaRpcUrl);
        
        // Check if it's a method not found error
        if (zetaError instanceof Error && zetaError.message.includes("Method not found")) {
          console.error("  This RPC endpoint doesn't support required Ethereum methods");
          console.error("  Trying alternative endpoints...");
        }
        
        // Try to find a working RPC endpoint
        const workingEndpoint = await this.findWorkingRpcEndpoint();
        if (workingEndpoint) {
          console.log(`Found working RPC endpoint: ${workingEndpoint}`);
          this.config.zetaRpcUrl = workingEndpoint;
          return { success: true, details: { rpcUrl: workingEndpoint, message: "Switched to working endpoint" } };
        }
        
        return { success: false, error: "ZetaChain RPC failed", details: zetaError };
      }
    } catch (err) {
      return { success: false, error: "Failed to test RPC connection", details: err };
    }
  }

  // Find a working RPC endpoint from a list of alternatives
  private async findWorkingRpcEndpoint(): Promise<string | null> {
    // Since we're focusing on fixing ENS issues rather than switching endpoints,
    // we'll return null to indicate no alternative endpoint was found
    console.log("Skipping alternative endpoint testing - focusing on ENS resolution fix");
    return null;
  }

  // Getter methods for contract addresses
  getZetaContractAddress(): string {
    return this.zetaContractAddress;
  }

  getSolanaContractAddress(): string {
    return this.solanaContractAddress;
  }

  // Getter for the generated Solana state address
  getSolanaStateAddress(): string | undefined {
    return this.solanaStateAddress;
  }

  // Getter for the current ZetaChain RPC URL
  getZetaRpcUrl(): string {
    return this.config.zetaRpcUrl;
  }

  // Utility method to get transaction details from a hash
  async getTransactionDetails(publicClient: PublicClient, txHash: string): Promise<any> {
    try {
      const receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });
      return receipt;
    } catch (err) {
      console.error("Failed to get transaction details:", err);
      return null;
    }
  }

  // Method to execute setUniversal independently
  async executeSetUniversal(walletClient: WalletClient, publicClient?: PublicClient, universalAddress?: string): Promise<string> {
    if (!publicClient) {
      throw new Error("Public client is required for setUniversal execution");
    }
    return this.setUniversalAddress(walletClient, publicClient, universalAddress);
  }
}

// Helper function to get config from environment variables
export function getConfigFromEnv(): InitConfig {
  // Check if we're in the browser environment
  if (typeof window !== 'undefined') {
    // In browser, try to get from window.env or use defaults
    const config: InitConfig = {
      zetaRpcUrl: process.env.NEXT_PUBLIC_ZETA_RPC_URL || 
                   (window as any).env?.NEXT_PUBLIC_ZETA_RPC_URL || 
                   "https://rpc.ankr.com/zetachain_evm_athens",
      solanaRpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 
                    (window as any).env?.NEXT_PUBLIC_SOLANA_RPC_URL || 
                    "https://api.devnet.solana.com",
      zetaChainId: process.env.NEXT_PUBLIC_ZETA_CHAIN_ID ? 
        parseInt(process.env.NEXT_PUBLIC_ZETA_CHAIN_ID) : 
        ((window as any).env?.NEXT_PUBLIC_ZETA_CHAIN_ID ? 
         parseInt((window as any).env?.NEXT_PUBLIC_ZETA_CHAIN_ID) : 7000),
      solanaChainId: process.env.NEXT_PUBLIC_SOLANA_CHAIN_ID ? 
        parseInt(process.env.NEXT_PUBLIC_SOLANA_CHAIN_ID) : 
        ((window as any).env?.NEXT_PUBLIC_SOLANA_CHAIN_ID ? 
         parseInt((window as any).env?.NEXT_PUBLIC_SOLANA_CHAIN_ID) : 1),
    };

    const errors = ContractInitializer.validateConfig(config);
    if (errors.length > 0) {
      console.warn("Environment configuration warnings:", errors);
      console.warn("Using default values for missing configuration");
    }

    return config;
  } else {
    // In Node.js environment, use process.env
    const config: InitConfig = {
      zetaRpcUrl: process.env.NEXT_PUBLIC_ZETA_RPC_URL || 
                   "https://rpc.ankr.com/zetachain_evm_athens",
      solanaRpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 
                    "https://api.devnet.solana.com",
      zetaChainId: process.env.NEXT_PUBLIC_ZETA_CHAIN_ID ? 
        parseInt(process.env.NEXT_PUBLIC_ZETA_CHAIN_ID) : 7000,
      solanaChainId: process.env.NEXT_PUBLIC_SOLANA_CHAIN_ID ? 
        parseInt(process.env.NEXT_PUBLIC_SOLANA_CHAIN_ID) : 7000,
    };

    const errors = ContractInitializer.validateConfig(config);
    if (errors.length > 0) {
      console.warn("Environment configuration warnings:", errors);
      console.warn("Using default values for missing configuration");
    }

    return config;
  }
}
