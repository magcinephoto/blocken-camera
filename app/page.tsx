"use client";
import dynamic from "next/dynamic";
import styles from "./page.module.css";
import { MintNFT } from "./components/MintNFT";
import { WalletConnect } from "./components/WalletConnect";

// ASCIICameraを動的にインポート（SSR無効化）
const ASCIICamera = dynamic(
  () => import("./components/ASCIICamera").then((mod) => mod.ASCIICamera),
  { ssr: false }
);

export default function Home() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* ウォレット接続ボタン */}
        <WalletConnect />

        {/* ASCIIカメラコンポーネント */}
        <ASCIICamera />

        {/* NFTミントコンポーネント */}
        <MintNFT />
      </div>
    </div>
  );
}
