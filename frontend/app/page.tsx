"use client";
import { useEffect, useMemo, useState } from "react";
import WagmiWalletButton from "@/components/WagmiWalletButton";
import { WalletButton as SolanaWalletButton } from "@/components/SolanaWalletButton";
import { ContractInitializer, getConfigFromEnv } from "@/lib/init";
import { useWalletClient, usePublicClient } from "wagmi";
import { useWallet as useSolanaWallet } from "@solana/wallet-adapter-react";

export default function Home() {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const solanaWallet = useSolanaWallet();
  const [mounted, setMounted] = useState(false);

  const initializer = useMemo(() => {
    const config = getConfigFromEnv();
    return new ContractInitializer(config);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize Solana only when a wallet is connected on the client (debounced)
  useEffect(() => {
    if (!mounted) return;
    if (!solanaWallet?.publicKey || !solanaWallet.connected) return;
    const t = setTimeout(async () => {
      try {
        const solStatus = await initializer.initializeSolana(solanaWallet);
        console.log("initializeSolana:", solStatus);
      } catch (e) {
        console.error("initializeSolana failed:", e);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [mounted, solanaWallet?.publicKey, solanaWallet?.connected, initializer]);

  // Initialize Zeta when EVM wallet is available and log status
  useEffect(() => {
    if (!mounted || !walletClient || !publicClient) return;
    (async () => {
      try {
        const zetaStatus = await initializer.initializeZetaChain(walletClient, publicClient);
        console.log("initializeZeta:", zetaStatus);
      } catch (e) {
        console.error("initializeZeta failed:", e);
      }
    })();
  }, [mounted, walletClient, publicClient, initializer]);

  if (!mounted) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center gap-6 p-6 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Anchor Zeta</h1>
        <p className="text-sm text-gray-500">Loading...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Anchor Zeta</h1>
      <p className="text-sm text-gray-500">Connect wallets to trigger initialization logs.</p>
      <div className="flex items-center gap-3">
        <WagmiWalletButton />
        <SolanaWalletButton />
      </div>
    </main>
  );
}
