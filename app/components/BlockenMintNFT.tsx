"use client";

import { useEffect, useState, useMemo } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  useChainId,
} from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { blockenCameraNFTABI } from "../contracts/blockenCameraNFTABI";
import styles from "./BlockenMintNFT.module.css";

interface BlockenMintNFTProps {
  svgData: string;
}

export function BlockenMintNFT({ svgData }: BlockenMintNFTProps) {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const [mintedTokenId, setMintedTokenId] = useState<bigint | null>(null);

  // 環境判定
  const isDev =
    process.env.NEXT_PUBLIC_ENVIRONMENT === "development" ||
    process.env.NODE_ENV === "development";

  // コントラクトアドレス
  const contractAddress = (
    isDev
      ? process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS_SEPOLIA
      : process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS_MAINNET
  ) as `0x${string}` | undefined;

  // ターゲットチェーン
  const targetChain = isDev ? baseSepolia : base;

  // プラットフォーム手数料を読み取り
  const { data: platformFee } = useReadContract({
    address: contractAddress,
    abi: blockenCameraNFTABI,
    functionName: "platformFee",
    chainId: targetChain.id,
    query: {
      enabled: Boolean(contractAddress),
    },
  });

  // mint関数を実行
  const {
    data: hash,
    error,
    isPending,
    writeContract,
  } = useWriteContract();

  // トランザクション確認
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  // 現在のトークンIDを取得
  const { data: currentTokenId } = useReadContract({
    address: contractAddress,
    abi: blockenCameraNFTABI,
    functionName: "getCurrentTokenId",
    chainId: targetChain.id,
    query: {
      enabled: Boolean(contractAddress) && isConfirmed,
    },
  });

  // ミント成功時にトークンIDを設定
  useEffect(() => {
    if (isConfirmed && typeof currentTokenId === "bigint") {
      setMintedTokenId(currentTokenId - BigInt(1));
    }
  }, [isConfirmed, currentTokenId]);

  const handleMint = async () => {
    if (!svgData || !contractAddress) {
      return;
    }

    try {
      writeContract({
        address: contractAddress,
        abi: blockenCameraNFTABI,
        functionName: "mint",
        args: [svgData],
        value: platformFee ?? BigInt(0),
        chain: targetChain,
      });
    } catch (err) {
      console.error("Mint error:", err);
    }
  };

  // エラーメッセージを統合
  const errorMessage = useMemo(() => {
    if (!contractAddress) {
      return "コントラクトアドレスが設定されていません";
    }
    if (!isConnected) {
      return "ウォレットを接続してください";
    }
    if (chainId !== targetChain.id) {
      return `${targetChain.name}に切り替えてください`;
    }
    if (error) {
      return `エラー: ${error.message}`;
    }
    return null;
  }, [contractAddress, isConnected, chainId, targetChain, error]);

  // ボタンのdisabled状態
  const isButtonDisabled =
    !contractAddress ||
    !isConnected ||
    chainId !== targetChain.id ||
    isPending ||
    isConfirming ||
    !svgData;

  // ボタンテキスト
  const buttonText = isPending
    ? "署名を確認中..."
    : isConfirming
      ? "トランザクション処理中..."
      : "NFTをミント";

  return (
    <div className={styles.container}>
      {errorMessage && <div className={styles.error}>{errorMessage}</div>}

      {!(isConfirmed && mintedTokenId !== null) && (
        <button
          onClick={handleMint}
          disabled={isButtonDisabled}
          className={styles.mintButton}
          type="button"
        >
          {buttonText}
        </button>
      )}

      {isConfirmed && mintedTokenId !== null && (
        <div className={styles.success}>
          <p>✅ NFTのミントに成功しました！</p>
          {hash && (
            <p>
              <a
                href={`${targetChain.blockExplorers?.default.url}/tx/${hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.txLink}
              >
                Basescanで確認
              </a>
            </p>
          )}
        </div>
      )}
      {/* 画像保存ボタン */}
      <button
        onClick={async () => {
          try {
            const blob = new Blob([svgData], { type: "image/svg+xml" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `blocken_camera_${Date.now()}.svg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          } catch (err) {
            console.error("Save error:", err);
          }
        }}
        className={styles.mintButton}
        type="button"
      >
        画像を保存
      </button>
    </div>
  );
}
