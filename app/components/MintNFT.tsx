"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from "wagmi";
import { baseSepolia, base } from "wagmi/chains";
import { timestampNFTABI } from "../contracts/timestampNFTABI";
import styles from "./MintNFT.module.css";

const isDev = process.env.NEXT_PUBLIC_ENVIRONMENT === "development";
const targetChain = isDev ? baseSepolia : base;

const contractAddress = (isDev
  ? process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS_SEPOLIA
  : process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS_MAINNET) as `0x${string}` | undefined;

export function MintNFT() {
  const { chain, isConnected } = useAccount();
  const [mintedTokenId, setMintedTokenId] = useState<bigint | null>(null);

  const { data: hash, writeContract, isPending, error: writeError } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
  } = useWaitForTransactionReceipt({
    hash,
  });

  // 最新のトークンIDを取得
  const { data: currentTokenId } = useReadContract({
    address: contractAddress,
    abi: timestampNFTABI,
    functionName: "getCurrentTokenId",
    chainId: targetChain.id,
    query: {
      enabled: Boolean(contractAddress) && isConfirmed,
    },
  });

  useEffect(() => {
    if (isConfirmed && typeof currentTokenId === "bigint") {
      // mint() 実装上、_tokenIdCounter はミント後に +1 されるので、実際にミントされたトークンIDは -1 する
      setMintedTokenId(currentTokenId - BigInt(1));
    }
  }, [isConfirmed, currentTokenId]);

  const handleMint = async () => {
    if (!isConnected) {
      alert("ウォレットを接続してください");
      return;
    }

    // wagmi からチェーン情報が取得できない、もしくはターゲットチェーンと異なる場合はミントさせない
    if (!chain || chain.id !== targetChain.id) {
      alert("ウォレットのネットワークをBaseの対象チェーンに切り替えてください");
      return;
    }

    if (!contractAddress) {
      alert("コントラクトアドレスが設定されていません");
      return;
    }

    try {
      writeContract({
        address: contractAddress,
        abi: timestampNFTABI,
        functionName: "mint",
        // wagmi / viem にターゲットチェーンを明示的に渡す
        chain: targetChain,
      });
    } catch (err) {
      // wagmi側でエラーを拾うのでここではロギングのみ
      console.error("ミントエラー:", err);
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Timestamp NFTをミント</h2>
      <p className={styles.description}>
        現在のUnixタイムスタンプが記録されたNFTをミントします。
        <br />
        ガス代はユーザー負担です。
      </p>

      {(!chain || chain.id !== targetChain.id) && (
        <p className={styles.error}>
          現在のネットワークはサポート外です。Base{" "}
          {isDev ? "Sepolia Testnet" : "Mainnet"} に切り替えてください。
        </p>
      )}

      {writeError && (
        <p className={styles.error}>
          エラー: {writeError.message}
        </p>
      )}

      {isConfirmed && (
        <p className={styles.success}>
          ✅ NFTのミントに成功しました！
          {mintedTokenId !== null && <> Token ID: {mintedTokenId.toString()}</>}
        </p>
      )}

      {isConfirming && (
        <p className={styles.loading}>
          ⏳ トランザクションを確認中...
        </p>
      )}

      <button
        onClick={handleMint}
        disabled={
          !isConnected ||
          !chain ||
          chain.id !== targetChain.id ||
          isPending ||
          isConfirming
        }
        className={styles.mintButton}
        type="button"
      >
        {!isConnected
          ? "ウォレットを接続してください"
          : isPending || isConfirming
          ? "ミント中..."
          : "NFTをミント"}
      </button>

      {isDev && (
        <p className={styles.devNote}>
          🔧 開発モード: Base Sepolia Testnet
        </p>
      )}

      {hash && (
        <div className={styles.txInfo}>
          <p className={styles.txHash}>
            トランザクション:{" "}
            <a
              href={`https://${isDev ? "sepolia." : ""}basescan.org/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Basescanで確認
            </a>
          </p>
        </div>
      )}
    </div>
  );
}


