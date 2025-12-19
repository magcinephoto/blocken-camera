"use client";

import { useEffect, useState } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  useChainId,
} from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { blockenCameraNFTABI } from "../contracts/blockenCameraNFTABI";

interface BlockenMintNFTProps {
  svgData: string;
}

export function BlockenMintNFT({ svgData }: BlockenMintNFTProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [mintedTokenId, setMintedTokenId] = useState<bigint | null>(null);

  // 環境判定
  const isDev =
    process.env.NEXT_PUBLIC_ENVIRONMENT === "development" ||
    process.env.NODE_ENV === "development";

  // コントラクトアドレス
  const contractAddress = (
    isDev
      ? process.env.NEXT_PUBLIC_BLOCKEN_CONTRACT_ADDRESS_SEPOLIA
      : process.env.NEXT_PUBLIC_BLOCKEN_CONTRACT_ADDRESS_MAINNET
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
    if (!svgData) {
      alert("SVGデータがありません");
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

  // チェーン切り替えが必要かチェック
  const needsChainSwitch = isConnected && chainId !== targetChain.id;

  if (!contractAddress) {
    return (
      <div style={{ padding: "20px", color: "red" }}>
        コントラクトアドレスが設定されていません。環境変数を確認してください。
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div style={{ padding: "20px" }}>
        NFTをミントするにはウォレットを接続してください。
      </div>
    );
  }

  if (needsChainSwitch) {
    return (
      <div style={{ padding: "20px", color: "orange" }}>
        {targetChain.name}に切り替えてください。
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <h3>Blocken Camera NFT をミント</h3>

      {platformFee && platformFee > BigInt(0) && (
        <p>
          手数料: {(Number(platformFee) / 1e18).toFixed(6)} ETH
        </p>
      )}

      <button
        onClick={handleMint}
        disabled={isPending || isConfirming || !svgData}
        style={{
          padding: "10px 20px",
          fontSize: "16px",
          cursor:
            isPending || isConfirming || !svgData ? "not-allowed" : "pointer",
          backgroundColor:
            isPending || isConfirming || !svgData ? "#ccc" : "#0052FF",
          color: "white",
          border: "none",
          borderRadius: "5px",
        }}
      >
        {isPending
          ? "署名を確認中..."
          : isConfirming
            ? "トランザクション処理中..."
            : "NFTをミント"}
      </button>

      {error && (
        <div style={{ marginTop: "10px", color: "red" }}>
          エラー: {error.message}
        </div>
      )}

      {isConfirmed && mintedTokenId !== null && (
        <div style={{ marginTop: "20px", color: "green" }}>
          <p>✅ NFTのミントに成功しました！</p>
          <p>Token ID: {mintedTokenId.toString()}</p>
          {hash && (
            <p>
              <a
                href={`${targetChain.blockExplorers?.default.url}/tx/${hash}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#0052FF" }}
              >
                Basescanで確認
              </a>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
