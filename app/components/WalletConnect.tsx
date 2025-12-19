"use client";

import { ConnectWallet } from "@coinbase/onchainkit/wallet";

export function WalletConnect() {
  return (
    <div style={{
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '1rem',
    }}>
      <ConnectWallet />
    </div>
  );
}


