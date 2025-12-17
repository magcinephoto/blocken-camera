"use client";
import { useState, useEffect } from "react";
import { useMiniKit, useQuickAuth } from "@coinbase/onchainkit/minikit";
import { useRouter } from "next/navigation";
import { minikitConfig } from "../minikit.config";
import styles from "./page.module.css";
import { MintNFT } from "./components/MintNFT";

interface AuthResponse {
  success: boolean;
  user?: {
    fid: number; // FID is the unique identifier for the user
    issuedAt?: number;
    expiresAt?: number;
  };
  message?: string; // Error messages come as 'message' not 'error'
}


export default function Home() {
  const { isFrameReady, setFrameReady, context } = useMiniKit();
  const [error, setError] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const router = useRouter();
  const isProd = process.env.NODE_ENV === "production";

  // Initialize the  miniapp
  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);
 
  // 本番では QuickAuth で JWT 付きリクエストを使う・開発では直接 /api/auth を叩く
  const { data: authData, isLoading: isAuthLoading, error: authError } =
    useQuickAuth<AuthResponse>("/api/auth", { method: "GET" });

  // 手動で /api/auth を叩いて認証を確認する（開発や SDK がブロックされる場合のフォールバック）
  const handleJoinClick = async () => {
    setError("");
    setIsJoining(true);

    try {
      if (isProd) {
        // 本番: QuickAuth の結果を信頼する（Farcaster MiniApp コンテキスト前提）
        if (isAuthLoading) {
          setError("Please wait while we verify your identity...");
          return;
        }

        if (authError || !authData?.success) {
          setError(authData?.message || "Please authenticate to join the waitlist");
          return;
        }

        console.log("User authenticated (quickauth):", authData.user);
        router.push("/success");
      } else {
        // 開発: 直接 /api/auth を叩く（route.ts 側に dev バイパスあり）
        const res = await fetch("/api/auth", { method: "GET" });
        const data: AuthResponse = await res.json();

        if (!res.ok || !data.success) {
          setError(data.message || "Please authenticate to join the waitlist");
          return;
        }

        console.log("User authenticated (dev fetch):", data.user);
        router.push("/success");
      }
    } catch (err) {
      console.error("Auth request failed", err);
      setError("Please authenticate to join the waitlist");
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className={styles.container}>
      <button className={styles.closeButton} type="button">
        ✕
      </button>
      
      <div className={styles.content}>
        <div className={styles.waitlistForm}>
          <h1 className={styles.title}>Join {minikitConfig.miniapp.name.toUpperCase()}</h1>

          <p className={styles.subtitle}>
            Hey {context?.user?.displayName || "there"}, Get early access and be the first to
            experience the future of
            <br />
            crypto marketing strategy.
          </p>

          <div className={styles.form}>
            {error && <p className={styles.error}>{error}</p>}

            <button
              type="button"
              onClick={handleJoinClick}
              className={styles.joinButton}
              disabled={isJoining}
            >
              {isJoining ? "VERIFYING..." : "JOIN WAITLIST"}
            </button>
          </div>
        </div>

        {/* NFTミントコンポーネント */}
        <MintNFT />
      </div>
    </div>
  );
}
