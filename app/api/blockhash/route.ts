import { NextRequest, NextResponse } from "next/server";

/**
 * Basescan APIから最新ブロックのトランザクションハッシュを取得
 *
 * エンドポイント: GET /api/blockhash
 * レスポンス: { success: boolean, txHash: string, blockNumber?: string, network?: string }
 *
 * 環境による動作の違い:
 * - 開発環境: Base Sepolia testnetのトランザクションを取得
 * - 本番環境: Base mainnetのトランザクションを取得
 * - エラー時: 開発環境ではダミーハッシュを返す
 */

const IS_DEV = process.env.NODE_ENV !== "production";

// Etherscan API v2設定（Base chainもサポート）
const ETHERSCAN_API_URL = "https://api.etherscan.io/v2/api";

// Base Chain ID
const BASE_MAINNET_CHAIN_ID = "8453";
const BASE_SEPOLIA_CHAIN_ID = "84532";

const CHAIN_ID = IS_DEV ? BASE_SEPOLIA_CHAIN_ID : BASE_MAINNET_CHAIN_ID;
const API_KEY = process.env.NEXT_PUBLIC_BASESCAN_API_KEY || "";

export async function GET(_request: NextRequest) {
  try {
    // 最新ブロック情報を取得（Etherscan API v2形式）
    const params = new URLSearchParams({
      chainid: CHAIN_ID,
      module: "proxy",
      action: "eth_getBlockByNumber",
      tag: "latest",
      boolean: "true",
      apikey: API_KEY
    });

    const response = await fetch(`${ETHERSCAN_API_URL}?${params.toString()}`, {
      next: { revalidate: 0 } // キャッシュしない（常に最新を取得）
    });

    if (!response.ok) {
      throw new Error(`Etherscan API v2 error: ${response.status}`);
    }

    const data = await response.json();

    // エラーハンドリング
    if (data.error) {
      console.error("Etherscan API v2 error:", data.error);
      throw new Error(data.error.message || "Etherscan API v2 error");
    }

    if (!data.result || !data.result.transactions || data.result.transactions.length === 0) {
      throw new Error("No transactions found in latest block");
    }

    // 最初のトランザクションハッシュを取得
    const txHash = data.result.transactions[0].hash;
    const blockNumber = data.result.number;

    console.log(`[blockhash] Fetched tx hash: ${txHash} from block: ${blockNumber} (Chain ID: ${CHAIN_ID})`);

    return NextResponse.json({
      success: true,
      txHash,
      blockNumber,
      network: IS_DEV ? "Base Sepolia" : "Base Mainnet",
      chainId: CHAIN_ID
    });

  } catch (error) {
    console.error("Error fetching block hash:", error);

    // フォールバック: 固定のダミーハッシュを返す（開発環境のみ）
    if (IS_DEV) {
      const dummyHash = "0xb0dc294088cf10a0dbfad35f4bf01ac9b43db54065f9abcd1234567890";
      console.log("[DEV] Returning dummy hash for fallback");
      return NextResponse.json({
        success: true,
        txHash: dummyHash,
        blockNumber: "0x0",
        network: "Base Sepolia (Fallback)",
        isDummy: true
      });
    }

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
