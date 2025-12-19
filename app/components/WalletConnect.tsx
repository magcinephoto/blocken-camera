"use client";

import { ConnectWallet } from "@coinbase/onchainkit/wallet";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { useAccount } from "wagmi";
import styles from "./WalletConnect.module.css";

export function WalletConnect() {
  return (
    <div>
      <ConnectWallet className={styles.connectButton} />
    </div>
  );
}


