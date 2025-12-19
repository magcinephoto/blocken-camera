"use client";

import { ConnectWallet } from "@coinbase/onchainkit/wallet";
import styles from "./WalletConnect.module.css";

export function WalletConnect() {
  return (
    <div>
      <ConnectWallet className={styles.connectButton} />
    </div>
  );
}


