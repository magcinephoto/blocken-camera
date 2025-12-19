import { NextRequest, NextResponse } from "next/server";

/**
 * Base RPCから最新ブロックのトランザクションハッシュを取得
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

// Base RPC エンドポイント
const BASE_MAINNET_RPC = "https://mainnet.base.org";
const BASE_SEPOLIA_RPC = "https://sepolia.base.org";

const RPC_URL = IS_DEV ? BASE_SEPOLIA_RPC : BASE_MAINNET_RPC;

export async function GET(_request: NextRequest) {
  try {
    // 最新ブロック情報を取得（JSON-RPC形式）
    const response = await fetch(RPC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getBlockByNumber",
        params: ["latest", true], // trueでトランザクション詳細を取得
        id: 1,
      }),
      next: { revalidate: 0 }, // キャッシュしない（常に最新を取得）
    });

    if (!response.ok) {
      throw new Error(`Base RPC error: ${response.status}`);
    }

    const data = await response.json();

    // JSON-RPCエラーハンドリング
    if (data.error) {
      console.error("Base RPC error:", data.error);
      throw new Error(data.error.message || "Base RPC error");
    }

    if (!data.result || !data.result.transactions || data.result.transactions.length === 0) {
      throw new Error("No transactions found in latest block");
    }

    // 最初のトランザクションハッシュを取得
    const txHash = data.result.transactions[0].hash;
    const blockNumber = data.result.number;

    console.log(`[blockhash] Fetched tx hash: ${txHash} from block: ${blockNumber} (Network: ${IS_DEV ? "Base Sepolia" : "Base Mainnet"})`);

    return NextResponse.json({
      success: true,
      txHash,
      blockNumber,
      network: IS_DEV ? "Base Sepolia" : "Base Mainnet"
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
