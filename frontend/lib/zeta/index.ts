/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Contract, JsonRpcProvider, Wallet, Log, Network, JsonRpcSigner } from "ethers";
import { ZetaChainUniversalNFTAbi } from "./abi";
import { ZetaChainUniversalNFTAddress } from "./address";

// Ensure Buffer is available
const Buffer = globalThis.Buffer || require('buffer').Buffer;

export type EthersLikeProvider = JsonRpcProvider;

export type EthersLikeSigner = Wallet | JsonRpcSigner;

export type ZetaChainUniversalNFTConfig = {
  address?: string;
};

export class ZetaChainUniversalNFTClient {
  public readonly address: string;
  private readonly contract: Contract;

  constructor(providerOrSigner: EthersLikeProvider | EthersLikeSigner, config?: ZetaChainUniversalNFTConfig) {
    this.address = config?.address ?? ZetaChainUniversalNFTAddress;
    
    // Create contract with proper signer/provider handling
    if (providerOrSigner instanceof JsonRpcProvider) {
      // For providers, ensure ENS is completely disabled
      const ensFreeProvider = this.createEnsFreeProvider(providerOrSigner);
      this.contract = new Contract(this.address, ZetaChainUniversalNFTAbi, ensFreeProvider);
    } else {
      // For signers, use as-is - this ensures the signer is properly attached
      this.contract = new Contract(this.address, ZetaChainUniversalNFTAbi, providerOrSigner);
    }
  }

  private createEnsFreeProvider(provider: JsonRpcProvider): JsonRpcProvider {
    // Create a completely ENS-free provider
    const ensFreeProvider = new JsonRpcProvider((provider as any)._getConnection().url, {
      name: "zetachain",
      chainId: 7001
    });
    
    // Disable all ENS functionality
    (ensFreeProvider as any).getEnsAddress = () => {
      throw new Error("ENS resolution not supported on this network");
    };
    
    (ensFreeProvider as any).getEnsName = () => {
      throw new Error("ENS resolution not supported on this network");
    };
    
    (ensFreeProvider as any).getEnsResolver = () => {
      throw new Error("ENS resolution not supported on this network");
    };
    
    (ensFreeProvider as any).resolveName = (name: string) => {
      if (name.startsWith('0x') && name.length === 42) {
        return Promise.resolve(name);
      }
      throw new Error("ENS resolution not supported on this network");
    };
    
    (ensFreeProvider as any).lookupAddress = () => {
      throw new Error("ENS resolution not supported on this network");
    };
    
    (ensFreeProvider as any)._getAddress = (nameOrAddress: string) => {
      if (nameOrAddress.startsWith('0x') && nameOrAddress.length === 42) {
        return Promise.resolve(nameOrAddress);
      }
      throw new Error("ENS resolution not supported on this network");
    };
    
    return ensFreeProvider;
  }

  // Reads
  name(): Promise<string> { return this.contract.name(); }
  symbol(): Promise<string> { return this.contract.symbol(); }
  owner(): Promise<string> { return this.contract.owner(); }
  tokenURI(tokenId: bigint): Promise<string> { return this.contract.tokenURI(tokenId); }
  balanceOf(owner: string): Promise<bigint> { return this.contract.balanceOf(owner); }
  ownerOf(tokenId: bigint): Promise<string> { return this.contract.ownerOf(tokenId); }
  gateway(): Promise<string> { return this.contract.gateway(); }
  gasLimitAmount(): Promise<bigint> { return this.contract.gasLimitAmount(); }
  uniswapRouter(): Promise<string> { return this.contract.uniswapRouter(); }
  isUniversal(): Promise<boolean> { return this.contract.isUniversal(); }
  getApproved(tokenId: bigint): Promise<string> { return this.contract.getApproved(tokenId); }
  isApprovedForAll(owner: string, operator: string): Promise<boolean> { return this.contract.isApprovedForAll(owner, operator); }

  // Writes (require signer)
  async initialize(
    initialOwner: string,
    name: string,
    symbol: string,
    gatewayAddress: string,
    gas: bigint,
    uniswapRouterAddress: string
  ) {
    return this.contract.initialize(initialOwner, name, symbol, gatewayAddress, gas, uniswapRouterAddress);
  }

  approve(to: string, tokenId: bigint) {
    return this.contract.approve(to, tokenId);
  }

  setApprovalForAll(operator: string, approved: boolean) {
    return this.contract.setApprovalForAll(operator, approved);
  }

  transferFrom(from: string, to: string, tokenId: bigint) {
    return this.contract.transferFrom(from, to, tokenId);
  }

  safeTransferFrom(from: string, to: string, tokenId: bigint) {
    return this.contract["safeTransferFrom(address,address,uint256)"](from, to, tokenId);
  }

  safeTransferFromWithData(from: string, to: string, tokenId: bigint, data: string) {
    return this.contract["safeTransferFrom(address,address,uint256,bytes)"](from, to, tokenId, data);
  }

  transferOwnership(newOwner: string) {
    return this.contract.transferOwnership(newOwner);
  }

  renounceOwnership() {
    return this.contract.renounceOwnership();
  }

  safeMint(to: string, uri: string) {
    return this.contract.safeMint(to, uri);
  }

  setConnected(zrc20: string, solanaContractAddress: string) {
    // Ensure the first parameter is a valid Ethereum address
    if (!zrc20.startsWith('0x')) {
      throw new Error("ZRC20 address must be in hex format (0x...)");
    }
    
    // Convert Solana address to bytes using PublicKey
    // Note: This requires @solana/web3.js to be imported
    let bytesData: Uint8Array;
    try {
      // Import PublicKey dynamically to avoid circular dependencies
      const { PublicKey } = require('@solana/web3.js');
      const publicKey = new PublicKey(solanaContractAddress);
      bytesData = publicKey.toBytes();
    } catch (error) {
      throw new Error(`Failed to convert Solana address to bytes: ${error}`);
    }
    
    // Use the contract's setConnected method directly - it will use the attached signer
    return this.contract.setConnected(zrc20, bytesData);
  }

  setGasLimit(gas: bigint) {
    return this.contract.setGasLimit(gas);
  }

  setGateway(gatewayAddress: string) {
    return this.contract.setGateway(gatewayAddress);
  }

  setUniversal(universalAddress: string) {
    return this.contract.setUniversal(universalAddress);
  }

  transferCrossChain(tokenId: bigint, receiver: string, destination: string, overrides?: { value?: bigint }) {
    const value = overrides?.value ?? BigInt(0);
    return this.contract.transferCrossChain(tokenId, receiver, destination, { value });
  }

  // Events helpers
  onTokenMinted(handler: (args: { to: string; tokenId: bigint; uri: string }, log: Log) => void) {
    const filter = this.contract.filters.TokenMinted();
    this.contract.on(filter, (to: string, tokenId: bigint, uri: string, event: any) => {
      handler({ to, tokenId, uri }, event?.log ?? event);
    });
    return () => { this.contract.off(filter, handler as any); };
  }

  onTokenTransfer(handler: (args: { destination: string; receiver: string; tokenId: bigint; uri: string }, log: Log) => void) {
    const filter = this.contract.filters.TokenTransfer();
    this.contract.on(filter, (destination: string, receiver: string, tokenId: bigint, uri: string, event: any) => {
      handler({ destination, receiver, tokenId, uri }, event?.log ?? event);
    });
    return () => { this.contract.off(filter, handler as any); };
  }

  onTransfer(handler: (args: { from: string; to: string; tokenId: bigint }, log: Log) => void) {
    const filter = this.contract.filters.Transfer();
    this.contract.on(filter, (from: string, to: string, tokenId: bigint, event: any) => {
      handler({ from, to, tokenId }, event?.log ?? event);
    });
    return () => { this.contract.off(filter, handler as any); };
  }
}

// Factories
export function getProvider(rpcUrl: string) {
  const provider = new JsonRpcProvider(rpcUrl);
  
  // Disable ENS resolution for non-Ethereum mainnet networks
  // Override ENS-related methods to prevent errors
  (provider as any).getEnsAddress = () => {
    throw new Error("ENS resolution not supported on this network");
  };
  
  (provider as any).getEnsName = () => {
    throw new Error("ENS resolution not supported on this network");
  };
  
  (provider as any).getEnsResolver = () => {
    throw new Error("ENS resolution not supported on this network");
  };
  
  // Override the resolveName method which is commonly used internally
  (provider as any).resolveName = (name: string) => {
    // If it's already an address, return it
    if (name.startsWith('0x') && name.length === 42) {
      return Promise.resolve(name);
    }
    // Otherwise, throw an error for ENS names
    throw new Error("ENS resolution not supported on this network");
  };
  
  // Override lookupAddress method
  (provider as any).lookupAddress = (address: string) => {
    throw new Error("ENS resolution not supported on this network");
  };
  
  // Override the _getAddress method which is used internally by ethers
  (provider as any)._getAddress = (nameOrAddress: string) => {
    // If it's already an address, return it
    if (nameOrAddress.startsWith('0x') && nameOrAddress.length === 42) {
      return Promise.resolve(nameOrAddress);
    }
    // Otherwise, throw an error for ENS names
    throw new Error("ENS resolution not supported on this network");
  };
  
  // Add fallback for missing methods
  const originalSend = provider.send.bind(provider);
  provider.send = async (method: string, params: any[]) => {
    try {
      return await originalSend(method, params);
    } catch (error) {
      // Handle specific method not found errors
      if (error instanceof Error && error.message.includes("Method not found")) {
        console.warn(`Method ${method} not supported by RPC endpoint: ${rpcUrl}`);
        
        // Provide fallbacks for common methods
        switch (method) {
          case "eth_chainId":
            // Try to get chainId from network
            try {
              const network = await provider.getNetwork();
              return `0x${network.chainId.toString(16)}`;
            } catch (networkError) {
              // Default to ZetaChain testnet
              return "0x1b58"; // 7000 in hex
            }
          default:
            throw error;
        }
      }
      throw error;
    }
  };
  
  return provider;
}

export function getWallet(privateKey: string, provider: JsonRpcProvider) {
  const wallet = new Wallet(privateKey, provider);
  
  // Override ENS methods on the wallet's provider
  if (wallet.provider) {
    (wallet.provider as any).getEnsAddress = () => {
      throw new Error("ENS resolution not supported on this network");
    };
    
    (wallet.provider as any).getEnsName = () => {
      throw new Error("ENS resolution not supported on this network");
    };
    
    (wallet.provider as any).getEnsResolver = () => {
      throw new Error("ENS resolution not supported on this network");
    };
    
    (wallet.provider as any).resolveName = (name: string) => {
      if (name.startsWith('0x') && name.length === 42) {
        return Promise.resolve(name);
      }
      throw new Error("ENS resolution not supported on this network");
    };
    
    (wallet.provider as any).lookupAddress = () => {
      throw new Error("ENS resolution not supported on this network");
    };
    
    (wallet.provider as any)._getAddress = (nameOrAddress: string) => {
      if (nameOrAddress.startsWith('0x') && nameOrAddress.length === 42) {
        return Promise.resolve(nameOrAddress);
      }
      throw new Error("ENS resolution not supported on this network");
    };
  }
  
  return wallet;
}

export function getZetaNFTWithProvider(rpcUrl: string, address?: string) {
  const provider = getProvider(rpcUrl);
  return new ZetaChainUniversalNFTClient(provider, { address });
}

// Specialized provider for ZetaChain that completely bypasses ENS
export function getZetaChainProvider(rpcUrl: string) {
  // Create a custom network without ENS support
  const zetaNetwork = new Network("zetachain", 7001);
  // Explicitly disable ENS
  (zetaNetwork as any).ensAddress = null;
  
  const provider = new JsonRpcProvider(rpcUrl, zetaNetwork);
  
  // Disable ENS resolution for non-Ethereum mainnet networks
  // Override ENS-related methods to prevent errors
  (provider as any).getEnsAddress = () => {
    throw new Error("ENS resolution not supported on this network");
  };
  
  (provider as any).getEnsName = () => {
    throw new Error("ENS resolution not supported on this network");
  };
  
  (provider as any).getEnsResolver = () => {
    throw new Error("ENS resolution not supported on this network");
  };
  
  // Override the resolveName method which is commonly used internally
  (provider as any).resolveName = (name: string) => {
    // If it's already an address, return it
    if (name.startsWith('0x') && name.length === 42) {
      return Promise.resolve(name);
    }
    // Otherwise, throw an error for ENS names
    throw new Error("ENS resolution not supported on this network");
  };
  
  // Override lookupAddress method
  (provider as any).lookupAddress = (address: string) => {
    throw new Error("ENS resolution not supported on this network");
  };
  
  // Override the _getAddress method which is used internally by ethers
  (provider as any)._getAddress = (nameOrAddress: string) => {
    // If it's already an address, return it
    if (nameOrAddress.startsWith('0x') && nameOrAddress.length === 42) {
      return Promise.resolve(nameOrAddress);
    }
    // Otherwise, throw an error for ENS names
    throw new Error("ENS resolution not supported on this network");
  };
  
  // Additional ENS bypass for ZetaChain-specific operations
  const originalGetCode = provider.getCode.bind(provider);
  provider.getCode = async (addressOrName: string, blockTag?: any) => {
    // Ensure we're working with an address, not an ENS name
    if (typeof addressOrName === 'string' && !addressOrName.startsWith('0x')) {
      throw new Error("ENS resolution not supported on this network");
    }
    return originalGetCode(addressOrName, blockTag);
  };
  
  const originalGetBalance = provider.getBalance.bind(provider);
  provider.getBalance = async (addressOrName: string, blockTag?: any) => {
    // Ensure we're working with an address, not an ENS name
    if (typeof addressOrName === 'string' && !addressOrName.startsWith('0x')) {
      throw new Error("ENS resolution not supported on this network");
    }
    return originalGetBalance(addressOrName, blockTag);
  };
  
  // Add fallback for missing methods
  const originalSend = provider.send.bind(provider);
  provider.send = async (method: string, params: any[]) => {
    try {
      return await originalSend(method, params);
    } catch (error) {
      // Handle specific method not found errors
      if (error instanceof Error && error.message.includes("Method not found")) {
        console.warn(`Method ${method} not supported by RPC endpoint: ${rpcUrl}`);
        
        // Provide fallbacks for common methods
        switch (method) {
          case "eth_chainId":
            // Try to get chainId from network
            try {
              const network = await provider.getNetwork();
              return `0x${network.chainId.toString(16)}`;
            } catch (networkError) {
              // Default to ZetaChain testnet
              return "0x1b59"; // 7001 in hex
            }
          default:
            throw error;
        }
      }
      throw error;
    }
  };
  
  return provider;
}

export function getZetaNFTWithSigner(signer: EthersLikeSigner, address?: string) {
  return new ZetaChainUniversalNFTClient(signer, { address });
}

// Example usage:
// const provider = getProvider(process.env.NEXT_PUBLIC_RPC!);
// const client = new ZetaChainUniversalNFTClient(provider);
// const name = await client.name();

