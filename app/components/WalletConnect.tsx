"use client";

import { ConnectWallet } from "@coinbase/onchainkit/wallet";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { useAccount } from "wagmi";

export function WalletConnect() {
  const { context } = useMiniKit();
  const { isConnected, address } = useAccount();

  // 開発環境でのみデバッグ情報を表示
  const isDev = process.env.NEXT_PUBLIC_ENVIRONMENT === "development";

  return (
    <div>
      <ConnectWallet />
      {isDev && context && (
        <div style={{
          fontSize: '10px',
          marginTop: '8px',
          opacity: 0.7,
          fontFamily: 'monospace',
        }}>
          Platform: {context.platformType || 'unknown'} |
          Connected: {isConnected ? 'Yes' : 'No'}
          {address && ` | ${address.slice(0, 6)}...${address.slice(-4)}`}
        </div>
      )}
    </div>
  );
}


