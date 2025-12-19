# PC版Farcasterでのウォレット接続問題 修正プラン

## 問題の概要

**症状**: Connect Walletボタンがモバイルでは動作するが、PCのFarcasterアプリ内では動作しない
**環境**: PCのFarcasterアプリ内、コンソールエラーなし
**影響範囲**: デスクトップユーザーがウォレット接続できない

## 原因分析

調査の結果、以下の可能性が特定されました：

1. **プラットフォーム検出の欠如**: デスクトップ環境を検出して適切に処理していない
2. **OnchainKitのautoConnect制限**: デスクトップ環境で期待通りに動作していない可能性
3. **Farcasterコネクターの明示的統合の欠如**: `@farcaster/miniapp-wagmi-connector`が未インストール

現在の実装はOnchainKitの自動設定のみに依存しており、デスクトップ特有の問題に対処できていません。

## 実装方針

**段階的アプローチ**を採用し、最小限の変更から開始して問題を特定・解決します。

### フェーズ1: 問題の特定（推奨開始点）

まずデバッグ情報を追加してPCでの動作状況を把握します。

**変更ファイル**:
- `app/components/WalletConnect.tsx`
- `app/page.tsx`

### フェーズ2: Farcasterコネクターの明示的統合

フェーズ1で問題が解決しない場合、公式推奨のコネクターを導入します。

**変更ファイル**:
- `package.json`（パッケージ追加）
- `app/wagmi.config.ts`（新規作成）
- `app/rootProvider.tsx`

### フェーズ3: プラットフォーム別UI実装

最終手段として、デスクトップ専用のウォレット接続UIを実装します。

**変更ファイル**:
- `app/components/DesktopWalletConnect.tsx`（新規作成）
- `app/components/WalletConnect.tsx`

---

## フェーズ1: デバッグ情報の追加と問題特定

### 目的
- プラットフォーム検出が正しく動作しているか確認
- ウォレット接続状態を可視化
- コンソールログで問題の原因を特定

### 変更内容

#### 1. `app/components/WalletConnect.tsx`

```typescript
"use client";

import { ConnectWallet } from "@coinbase/onchainkit/wallet";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { useAccount } from "wagmi";

export function WalletConnect() {
  const { context } = useMiniKit();
  const { isConnected, address } = useAccount();

  // 開発環境でのみデバッグ情報を表示
  const isDev = process.env.NEXT_PUBLIC_ENVIRONMENT === "development";

  return (
    <div>
      <ConnectWallet />
      {isDev && context && (
        <div style={{
          fontSize: '10px',
          marginTop: '8px',
          opacity: 0.7,
          fontFamily: 'monospace',
        }}>
          Platform: {context.platformType || 'unknown'} |
          Connected: {isConnected ? 'Yes' : 'No'}
          {address && ` | ${address.slice(0, 6)}...${address.slice(-4)}`}
        </div>
      )}
    </div>
  );
}
```

**追加機能**:
- MiniKitコンテキストからプラットフォーム情報を取得
- wagmiの`useAccount`でウォレット接続状態を確認
- 開発環境でのみデバッグ情報を表示

#### 2. `app/page.tsx`

既存の`useEffect`にコンソールログを追加：

```typescript
// 既存コード（32-36行目）を以下に置き換え
useEffect(() => {
  if (!isFrameReady) {
    // デバッグログ追加
    console.log('[MiniKit Debug] Platform:', context?.platformType);
    console.log('[MiniKit Debug] Context:', context);
    console.log('[MiniKit Debug] Calling setFrameReady()');
    setFrameReady();
  }
}, [setFrameReady, isFrameReady, context]);
```

**追加情報**:
- プラットフォームタイプ（"mobile" or "desktop"）
- MiniKitコンテキスト全体
- `setFrameReady()`呼び出しのタイミング

### 検証手順

1. PCのFarcasterアプリで開発環境にアクセス
2. 画面下部のデバッグ情報を確認：
   - Platform値が"desktop"か確認
   - Connected状態を確認
3. ブラウザコンソールを開いてログを確認
4. Connect Walletボタンをクリック
5. エラーメッセージやwarningを記録

### 期待される結果

- `Platform: desktop`と表示される
- `Connected: No`のまま変わらない → フェーズ2へ
- エラーログがある → エラー内容に応じた対処
- Platform値が`unknown` → MiniKitコンテキストの問題

---

## フェーズ2: Farcasterコネクターの明示的統合

### 目的
- Farcaster公式推奨の`@farcaster/miniapp-wagmi-connector`を導入
- カスタムwagmi configでFarcasterコネクターを明示的に設定
- OnchainKitの自動設定と共存させる

### 変更内容

#### 1. パッケージのインストール

```bash
npm install @farcaster/miniapp-wagmi-connector
```

#### 2. `app/wagmi.config.ts`（新規作成）

```typescript
import { http, cookieStorage, createConfig, createStorage } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { coinbaseWallet } from "wagmi/connectors";
import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";

const isDev = process.env.NEXT_PUBLIC_ENVIRONMENT === "development";

export function getWagmiConfig() {
  return createConfig({
    chains: [isDev ? baseSepolia : base],
    connectors: [
      farcasterMiniApp(), // Farcasterコネクターを最優先
      coinbaseWallet({
        appName: process.env.NEXT_PUBLIC_PROJECT_NAME || "Blocken Camera",
        preference: "all",
      }),
    ],
    storage: createStorage({
      storage: cookieStorage,
    }),
    ssr: true,
    transports: {
      [base.id]: http(),
      [baseSepolia.id]: http(),
    },
  });
}

declare module "wagmi" {
  interface Register {
    config: ReturnType<typeof getWagmiConfig>;
  }
}
```

**重要ポイント**:
- `farcasterMiniApp()`を最優先のコネクターとして配置
- Coinbase Walletをフォールバックとして保持
- SSRサポートを有効化

#### 3. `app/rootProvider.tsx`

```typescript
"use client";
import { ReactNode, useState } from "react";
import { base, baseSepolia } from "wagmi/chains";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getWagmiConfig } from "./wagmi.config";
import "@coinbase/onchainkit/styles.css";

const isDev = process.env.NEXT_PUBLIC_ENVIRONMENT === "development";
const chain = isDev ? baseSepolia : base;

export function RootProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [wagmiConfig] = useState(() => getWagmiConfig());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider
          apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
          chain={chain}
          config={{
            appearance: {
              mode: "auto",
            },
            wallet: {
              display: "modal",
              preference: "all",
            },
          }}
          miniKit={{
            enabled: true,
            autoConnect: true,
            notificationProxyUrl: undefined,
          }}
        >
          {children}
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

**変更点**:
- `WagmiProvider`と`QueryClientProvider`を追加
- カスタムwagmi configを使用
- OnchainKitProviderは内側に配置

#### 4. `app/components/WalletConnect.tsx`（オプション強化）

デスクトップ環境で手動接続のフォールバックを追加：

```typescript
"use client";

import { ConnectWallet } from "@coinbase/onchainkit/wallet";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { useAccount, useConnect } from "wagmi";

export function WalletConnect() {
  const { context } = useMiniKit();
  const { isConnected, address } = useAccount();
  const { connect, connectors } = useConnect();

  const isDev = process.env.NEXT_PUBLIC_ENVIRONMENT === "development";

  // デスクトップ環境で手動接続が必要な場合のフォールバック
  const handleManualConnect = () => {
    const farcasterConnector = connectors.find(
      (c) => c.name === "Farcaster MiniApp"
    );
    if (farcasterConnector) {
      connect({ connector: farcasterConnector });
    }
  };

  return (
    <div>
      <ConnectWallet />
      {isDev && context && (
        <div style={{
          fontSize: "10px",
          marginTop: "8px",
          opacity: 0.7,
          fontFamily: "monospace",
        }}>
          Platform: {context.platformType || "unknown"} |
          Connected: {isConnected ? "Yes" : "No"}
          {address && ` | ${address.slice(0, 6)}...${address.slice(-4)}`}
          {!isConnected && context.platformType === "desktop" && (
            <button
              onClick={handleManualConnect}
              style={{
                marginLeft: "8px",
                fontSize: "10px",
                padding: "4px 8px",
                cursor: "pointer",
              }}
            >
              Manual Connect (Debug)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
```

**追加機能**:
- デスクトップ環境で手動接続ボタンを表示
- Farcasterコネクターを明示的に呼び出し

### 検証手順

1. パッケージインストール後、`npm run dev`でアプリを起動
2. PCのFarcasterアプリで開発環境にアクセス
3. Connect Walletボタンをクリック
4. 動作しない場合は"Manual Connect"ボタンをクリック
5. コンソールログでコネクター一覧を確認

### 期待される結果

- Farcasterコネクターが自動的に使用される
- デスクトップでもウォレット接続が成功
- モバイルでも引き続き動作する

---

## フェーズ3: プラットフォーム別UI実装（最終手段）

### 目的
- デスクトップとモバイルで異なるウォレット接続UIを提供
- デスクトップ特有の制限に対処

### 変更内容

#### 1. `app/components/DesktopWalletConnect.tsx`（新規作成）

```typescript
"use client";

import { useConnect, useAccount, useDisconnect } from "wagmi";

export function DesktopWalletConnect() {
  const { connect, connectors, isPending } = useConnect();
  const { isConnected, address } = useAccount();
  const { disconnect } = useDisconnect();

  const handleConnect = () => {
    const farcasterConnector = connectors.find(
      (c) => c.name === "Farcaster MiniApp"
    );
    if (farcasterConnector) {
      connect({ connector: farcasterConnector });
    }
  };

  if (isConnected) {
    return (
      <div style={{
        padding: "12px",
        background: "#f0f0f0",
        borderRadius: "8px",
        display: "flex",
        alignItems: "center",
        gap: "8px",
      }}>
        <span>Connected: {address?.slice(0, 6)}...{address?.slice(-4)}</span>
        <button
          onClick={() => disconnect()}
          style={{
            padding: "4px 8px",
            background: "#ff4444",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={isPending}
      style={{
        padding: "12px 24px",
        background: isPending ? "#cccccc" : "#1100FA",
        color: "white",
        border: "none",
        borderRadius: "8px",
        cursor: isPending ? "not-allowed" : "pointer",
      }}
    >
      {isPending ? "Connecting..." : "Connect Wallet"}
    </button>
  );
}
```

#### 2. `app/components/WalletConnect.tsx`

プラットフォーム検出による分岐を追加：

```typescript
"use client";

import { ConnectWallet } from "@coinbase/onchainkit/wallet";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { DesktopWalletConnect } from "./DesktopWalletConnect";

export function WalletConnect() {
  const { context } = useMiniKit();

  // プラットフォーム検出
  const isDesktop = context?.platformType === "desktop";

  // デスクトップ環境では専用コンポーネントを使用
  if (isDesktop) {
    return <DesktopWalletConnect />;
  }

  // モバイル環境ではOnchainKitの標準コンポーネント
  return <ConnectWallet />;
}
```

**重要な変更**:
- `context.platformType`で環境を判定
- デスクトップでは独自実装のUIを使用
- モバイルでは既存のOnchainKit UIを維持

---

## リスクと対策

### リスク1: モバイルでの動作が壊れる
**対策**:
- プラットフォーム検出で条件分岐
- モバイルでは既存コードを維持
- 両環境で十分なテスト

### リスク2: OnchainKitとwagmi configの競合
**対策**:
- プロバイダーの正しいネスト順序を守る
- `WagmiProvider` > `QueryClientProvider` > `OnchainKitProvider`

### リスク3: デスクトップ環境の根本的な制限
**対策**:
- Farcaster公式ドキュメントで制限を確認
- 必要に応じて「モバイルで操作してください」のメッセージ表示

---

## 実装順序

1. **フェーズ1を実装** → PCでテスト → 問題特定
2. 問題が解決しない場合 → **フェーズ2を実装** → 再テスト
3. それでも解決しない場合 → **フェーズ3を実装**

各フェーズ後にモバイルでもテストし、リグレッションがないことを確認します。

---

## 成功基準

### PCのFarcasterアプリ
- [ ] Connect Walletボタンがクリック可能
- [ ] ウォレット接続が完了する
- [ ] NFTミント機能が使用可能

### モバイルのFarcasterアプリ
- [ ] 既存の動作が維持される
- [ ] パフォーマンス低下がない

### 両環境
- [ ] チェーン検証が正常動作
- [ ] トランザクション署名が可能

---

## 参考資料

- [Farcaster Mini Apps - Wallet Integration](https://miniapps.farcaster.xyz/docs/guides/wallets)
- [OnchainKit MiniKit Overview](https://docs.base.org/builderkits/minikit/overview)
- [Wagmi Configuration](https://wagmi.sh/react/config)
