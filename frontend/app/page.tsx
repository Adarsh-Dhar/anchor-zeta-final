"use client";
import { useEffect, useMemo } from "react";
import WagmiWalletButton from "@/components/WagmiWalletButton";
import { WalletButton as SolanaWalletButton } from "@/components/SolanaWalletButton";
import { ContractInitializer, getConfigFromEnv } from "@/lib/init";
import { useWalletClient, usePublicClient } from "wagmi";

export default function Home() {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const initializer = useMemo(() => {
    const config = getConfigFromEnv();
    return new ContractInitializer(config);
  }, []);

  // Initialize Solana immediately on page load and log status
  useEffect(() => {
    (async () => {
      try {
        const solStatus = await initializer.initializeSolana();
        console.log("initializeSolana:", solStatus);
      } catch (e) {
        console.error("initializeSolana failed:", e);
      }
    })();
  }, [initializer]);

  // Initialize Zeta when EVM wallet is available and log status
  useEffect(() => {
    if (!walletClient || !publicClient) return;
    (async () => {
      try {
        const zetaStatus = await initializer.initializeZetaChain(walletClient, publicClient);
        console.log("initializeZeta:", zetaStatus);
      } catch (e) {
        console.error("initializeZeta failed:", e);
      }
    })();
  }, [walletClient, publicClient, initializer]);

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
