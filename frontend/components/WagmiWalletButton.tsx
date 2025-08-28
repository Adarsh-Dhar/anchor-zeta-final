"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAccount, useConnect, useDisconnect, Connector } from "wagmi";
import Button from "./ui/Button";

const WagmiWalletButton = () => {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [showConnectors, setShowConnectors] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowConnectors(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleConnect = () => {
    if (connectors.length === 1) {
      // If only one connector, connect directly
      if (connectors[0]?.ready) {
        connect({ connector: connectors[0] });
      }
    } else {
      // Show connector options
      setShowConnectors(!showConnectors);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setShowConnectors(false);
  };

  const connectWithConnector = (connector: Connector) => {
    if (connector.ready) {
      connect({ connector });
      setShowConnectors(false);
    }
  };

  const getDisplayText = () => {
    if (isConnected && address) {
      const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
      return shortAddress;
    }
    return isPending ? "Connecting..." : "Connect Wallet";
  };

  const availableConnectors = connectors.filter(connector => connector.ready);

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        outlined={isConnected}
        text={getDisplayText()}
        className="font-semibold"
        onClick={isConnected ? handleDisconnect : handleConnect}
        disabled={isPending}
      />
      
      {/* Connector Options Dropdown */}
      {showConnectors && !isConnected && availableConnectors.length > 1 && (
        <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          <div className="py-2">
            {availableConnectors.map((connector) => (
              <button
                key={connector.uid}
                onClick={() => connectWithConnector(connector)}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors first:rounded-t-lg last:rounded-b-lg"
              >
                {connector.name || 'Unknown Wallet'}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WagmiWalletButton;
