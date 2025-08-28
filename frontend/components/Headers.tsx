"use client";

import React from "react";
import { WalletButton } from "@/components/SolanaWalletButton";
import WagmiWalletButton from "@/components/WagmiWalletButton";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200/20 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold">Anchor Zeta</span>
        </div>
        <div className="flex items-center gap-3">
          <WagmiWalletButton />
          <WalletButton />
        </div>
      </div>
    </header>
  );
}


