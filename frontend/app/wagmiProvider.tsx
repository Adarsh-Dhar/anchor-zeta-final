'use client'

import { createConfig, http, WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors'

// Custom ZetaChain testnet configuration
const zetaTestnetChain = {
  id: 7001,
  name: 'ZetaChain Athens Testnet',
  nativeCurrency: {
    name: 'ZETA',
    symbol: 'ZETA',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://zetachain-athens-evm.blockpi.network/v1/rpc/public'],
    },
    public: {
      http: ['https://zetachain-athens-evm.blockpi.network/v1/rpc/public'],
    },
  },
  blockExplorers: {
    default: {
      name: 'ZetaScan',
      url: 'https://explorer.zetachain.com',
    },
  },
} as const

const config = createConfig({
  chains: [zetaTestnetChain],
  transports: {
    [zetaTestnetChain.id]: http('https://zetachain-athens-evm.blockpi.network/v1/rpc/public')
  },
  connectors: [
    injected({
      target: 'metaMask',
      shimDisconnect: true,
    }),
    injected({
      target: 'coinbaseWallet',
      shimDisconnect: true,
    }),
    injected({
      target: 'tokenPocket',
      shimDisconnect: true,
    }),
    injected({
      target: 'trust',
      shimDisconnect: true,
    }),
    coinbaseWallet({
      appName: 'Anchor Zeta',
      appLogoUrl: 'https://example.com/logo.png',
    }),
    walletConnect({
      projectId: 'YOUR_WALLETCONNECT_PROJECT_ID', // You can get this from https://cloud.walletconnect.com/
      metadata: {
        name: 'Anchor Zeta',
        description: 'Cross-chain NFT platform',
        url: 'https://example.com',
        icons: ['https://example.com/logo.png'],
      },
    }),
    // Generic injected connector as fallback
    injected({
      shimDisconnect: true,
    }),
  ],
})

const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}