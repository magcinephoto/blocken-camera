"use client";
import { useEffect } from "react";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import dynamic from "next/dynamic";
import styles from "./page.module.css";
import { WalletConnect } from "./components/WalletConnect";

// ASCIICameraを動的にインポート（SSR無効化）
const ASCIICamera = dynamic(
  () => import("./components/ASCIICamera").then((mod) => mod.ASCIICamera),
  { ssr: false }
);

export default function Home() {
  const { isFrameReady, setFrameReady } = useMiniKit();

  // コントラクトURL生成ロジック
  const isDev = process.env.NEXT_PUBLIC_ENVIRONMENT === 'development';
  const contractAddress = isDev
    ? process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS_SEPOLIA
    : process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS_MAINNET;

  const baseScanUrl = isDev
    ? 'https://sepolia.basescan.org'
    : 'https://basescan.org';

  const contractUrl = contractAddress
    ? `${baseScanUrl}/address/${contractAddress}`
    : null;

  // Initialize the miniapp
  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* グリッチタイトル */}
        <h1 className={styles.glitchTitle}>
          B̶̦̝̲͚͖̲͎͈̔͒͝L̵̟̈̓̔͌͋Õ̶̢̤̻̣̪̲̯̾̏C̸̤̻͉̟̅̑͋͒̈̔͘K̷̫͕̬̼̤̫̮̯̑̓̌͒͛͋͝Ê̸̜̲͌̚ͅN̸̛͎͓̺̲̋͌͆͐͌̕ͅ ̴̡̢̗̱̦̀͂C̸̡̡̡̼͎̩̩̓́̒͝A̴̧̝̦̟͍̥̪̓ͅM̸̻͇͋̈́̄̂̃̃̕͠E̴̜̩̩̥͇̟̪͋̈́ͅR̵̡̦̱̦̟̩͛̏̅̑͊Ą̵̠͖̝̹̺̰̇̀͒̀͝
        </h1>

        {/* ウォレット接続ボタン */}
        <WalletConnect />

        {/* ASCIIカメラコンポーネント */}
        <ASCIICamera />
      </div>

      {/* コントラクトリンク */}
      {contractUrl && (
        <div className={styles.footer}>
          <a href={contractUrl} target="_blank" rel="noopener noreferrer">
            Contract
          </a>
        </div>
      )}
    </div>
  );
}
