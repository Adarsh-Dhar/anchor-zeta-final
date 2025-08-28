# Wallet Setup Guide

This project includes functional wallet connection buttons for both Solana and Ethereum/ZetaChain networks.

## Features

### Solana Wallet Button
- Connects to Solana wallets (Phantom, Solflare, Torus, Ledger, Coinbase, Trust)
- Configured for Solana Devnet
- Shows wallet icon and truncated address when connected
- Tooltip with connection status and full address
- Auto-connect on page reload

### Ethereum/ZetaChain Wallet Button
- Connects to Ethereum wallets (MetaMask, Coinbase Wallet, Trust Wallet, etc.)
- Configured for ZetaChain Athens Testnet
- Shows truncated address when connected
- Dropdown menu for multiple wallet options
- Click outside to close dropdown

## Setup Requirements

### Solana
The Solana wallet integration is already configured with:
- Multiple wallet adapters
- Devnet network configuration
- Auto-connect functionality

### Ethereum/ZetaChain
The Wagmi configuration includes:
- ZetaChain Athens Testnet (Chain ID: 7001)
- Multiple wallet connectors
- WalletConnect support (requires project ID)

## Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run Development Server**
   ```bash
   npm run dev
   ```

3. **Connect Wallets**
   - Click "Connect Solana" to open Solana wallet modal
   - Click "Connect Wallet" to connect Ethereum wallet
   - Both buttons are available in the header and main page

## Configuration

### WalletConnect (Optional)
To enable WalletConnect for mobile wallets:
1. Get a project ID from [WalletConnect Cloud](https://cloud.walletconnect.com/)
2. Update `YOUR_WALLETCONNECT_PROJECT_ID` in `app/wagmiProvider.tsx`

### Custom Networks
- Solana: Update `network` variable in `app/solanaProvider.tsx`
- Ethereum: Modify `zetaTestnetChain` in `app/wagmiProvider.tsx`

## Usage Examples

The wallet buttons automatically:
- Show connection status
- Display truncated wallet addresses
- Handle connection/disconnection
- Provide appropriate tooltips and feedback

## Troubleshooting

- **Solana**: Ensure wallet is set to Devnet
- **Ethereum**: Ensure wallet supports ZetaChain Athens Testnet
- **Connection Issues**: Check browser console for errors
- **Mobile**: Use WalletConnect for better mobile wallet support

## Dependencies

- `@solana/wallet-adapter-*` - Solana wallet integration
- `wagmi` - Ethereum wallet integration
- `@tanstack/react-query` - Data fetching and caching
- `next` - React framework
- `tailwindcss` - Styling
