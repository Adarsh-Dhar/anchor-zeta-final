"use client";

import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

export function WalletButton() {
  const { wallet, connected, disconnect, publicKey, connecting } = useWallet();
  const { setVisible } = useWalletModal();

  const handleConnect = () => {
    setVisible(true);
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const getWalletIcon = () => {
    if (wallet?.adapter?.icon) {
      return (
        <img
          src={wallet.adapter.icon}
          alt={wallet.adapter.name}
          className="w-6 h-6 rounded-full"
        />
      );
    }
    return <div className="rounded-full bg-purple-400/30 w-6 h-6"></div>;
  };

  const getDisplayText = () => {
    if (connecting) {
      return "Connecting...";
    }
    if (connected && publicKey) {
      const shortAddress = `${publicKey.toString().slice(0, 4)}...${publicKey.toString().slice(-4)}`;
      return shortAddress;
    }
    return "Connect Solana";
  };

  const getTooltipText = () => {
    if (connecting) {
      return "Connecting to wallet...";
    }
    if (connected && publicKey) {
      return `Connected: ${publicKey.toString()}`;
    }
    return "Devnet Only - Click to connect Solana wallet";
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-block">
            <button
              onClick={connected ? handleDisconnect : handleConnect}
              disabled={connecting}
              className={`bg-black border border-gray-800 rounded-md flex items-center px-3 py-2 gap-2 transition-colors ${
                connecting 
                  ? 'opacity-50 cursor-not-allowed' 
                  : connected 
                    ? 'hover:bg-gray-900' 
                    : 'hover:bg-gray-900'
              }`}
            >
              {getWalletIcon()}
              <span className="text-white text-sm">{getDisplayText()}</span>
            </button>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getTooltipText()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}


