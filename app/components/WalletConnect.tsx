"use client";

import { ConnectWallet } from "@coinbase/onchainkit/wallet";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { useAccount, useConnect } from "wagmi";

export function WalletConnect() {
  const { context } = useMiniKit();
  const { isConnected, address } = useAccount();
  const { connect, connectors } = useConnect();

  // 開発環境でのみデバッグ情報を表示
  const isDev = process.env.NEXT_PUBLIC_ENVIRONMENT === "development";

  // プラットフォームタイプを取得（型安全のため）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const platformType = (context as any)?.platformType || (context as any)?.client?.platform || 'unknown';

  // デスクトップ環境で手動接続が必要な場合のフォールバック
  const handleManualConnect = () => {
    const farcasterConnector = connectors.find(
      (c) => c.name === "Farcaster MiniApp"
    );
    if (farcasterConnector) {
      connect({ connector: farcasterConnector });
    }
  };

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
          Platform: {platformType} |
          Connected: {isConnected ? 'Yes' : 'No'}
          {address && ` | ${address.slice(0, 6)}...${address.slice(-4)}`}
          {!isConnected && platformType === 'desktop' && (
            <button
              onClick={handleManualConnect}
              style={{
                marginLeft: '8px',
                fontSize: '10px',
                padding: '4px 8px',
                cursor: 'pointer',
                border: '1px solid #ccc',
                borderRadius: '4px',
                background: '#fff',
              }}
            >
              Manual Connect (Debug)
            </button>
          )}
        </div>
      )}
    </div>
  );
}


