"use client";

import { ConnectWallet } from "@coinbase/onchainkit/wallet";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { useAccount } from "wagmi";
import styles from "./WalletConnect.module.css";

export function WalletConnect() {
  const { context } = useMiniKit();
  const { isConnected, address } = useAccount();

  // 開発環境でのみデバッグ情報を表示
  const isDev = process.env.NEXT_PUBLIC_ENVIRONMENT === "development";

  return (
    <div>
      <ConnectWallet className={styles.connectButton} />
      {isDev && context && (
        <div className={styles.connectButton}>
          Platform: {context.platformType || 'unknown'} |
          Connected: {isConnected ? 'Yes' : 'No'}
          {address && ` | ${address.slice(0, 6)}...${address.slice(-4)}`}
        </div>
      )}
    </div>
  );
}


