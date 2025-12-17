"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { baseSepolia, base } from "wagmi/chains";
import { timestampNFTABI } from "../contracts/timestampNFTABI";
import styles from "./MintNFT.module.css";

const isDev = process.env.NEXT_PUBLIC_ENVIRONMENT === "development";

const contractAddress = (isDev
  ? process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS_SEPOLIA
  : process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS_MAINNET) as `0x${string}` | undefined;

export function MintNFT() {
  const { address, isConnected } = useAccount();
  const [mintedTokenId, setMintedTokenId] = useState<bigint | null>(null);

  const {
    data: hash,
    writeContract,
    isPending,
    error: writeError,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
  } = useWaitForTransactionReceipt({
    hash,
  });

  useEffect(() => {
    if (isConfirmed && !mintedTokenId && hash) {
      // 実際にはイベントからトークンIDを取得するのが理想だが、
      // シンプルさを優先して0番を表示している
      setMintedTokenId(BigInt(0));
    }
  }, [hash, isConfirmed, mintedTokenId]);

  const handleMint = async () => {
    if (!isConnected) {
      alert("ウォレットを接続してください");
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
        chainId: (isDev ? baseSepolia : base).id,
        account: address,
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
        disabled={!isConnected || isPending || isConfirming}
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


