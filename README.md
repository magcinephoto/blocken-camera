# Blocken Camera

## プロジェクト概要

このプロジェクトは、Next.js 15、OnchainKit、Farcaster SDKを使用して構築されたFarcaster Mini Appです。Base appとFarcasterエコシステムに公開するためのウェイトリスト登録アプリケーションです。React 19とwagmiを使用してBaseチェーン上でブロックチェーンとのやり取りを行います。

## 開発コマンド

```bash
# 開発サーバー起動
npm run dev

# 本番環境用ビルド
npm run build

# 本番サーバー起動
npm start

# リンター実行
npm run lint
```

## 環境変数設定

必須の環境変数（`.example.env`参照）：
- `NEXT_PUBLIC_URL` - アプリの公開URL（本番環境ではVercel環境変数から自動検出）
- `NEXT_PUBLIC_ONCHAINKIT_API_KEY` - Coinbase Developer Platform APIキー
- `NEXT_PUBLIC_PROJECT_NAME` - アプリ名

アプリは環境に基づいてURLを自動決定：
- 本番環境: `NEXT_PUBLIC_URL`または`VERCEL_PROJECT_PRODUCTION_URL`を使用
- 開発環境: `http://localhost:3000`にフォールバック

## アーキテクチャ

### 認証フロー

アプリは2つのモードを持つ認証システムを実装しています：

**本番モード** (`app/page.tsx:43-56`):
- OnchainKitの`useQuickAuth`フックを使用してJWTトークンを検証
- FarcasterがMiniApp SDK経由で`Authorization`ヘッダーにJWTを提供
- トークンは`/api/auth`でアプリのドメインに対して検証される

**開発モード** (`app/page.tsx:57-68`):
- `/api/auth`エンドポイントへ直接フェッチ
- Farcasterコンテキストなしでローカルテスト用のダミーユーザーデータを返す

**トークン検証** (`app/api/auth/route.ts:40-96`):
- `@farcaster/quick-auth`クライアントを使用してJWTトークンを検証
- リクエストヘッダーからドメインを抽出（Origin > Host > 環境変数の優先順位）
- 検証成功時にユーザーFID（Farcaster ID）を返す
- 開発環境では`NODE_ENV !== "production"`の場合にダミーユーザーを返す

### プロバイダーアーキテクチャ

**RootProvider** (`app/rootProvider.tsx`):
- アプリ全体を`OnchainKitProvider`でラップ
- Baseチェーン接続を設定
- MiniKitをautoConnectで有効化
- ウォレットモーダル表示を提供

**Layout** (`app/layout.tsx`):
- `minikit.config.ts`から動的メタデータを生成
- Base app ID: `694149d4d19763ca26ddc34b`を含む
- 起動ボタン付きのFarcasterフレームメタデータを作成
- 子要素をOnchainKitの`SafeArea`コンポーネントでラップ

### マニフェスト設定

**minikit.config.ts**:
- Farcaster Mini Appマニフェストの中心的な設定
- `accountAssociation`オブジェクト（署名済み認証情報）を含む
- アプリのメタデータ（名前、説明、画像、URL）を定義
- マニフェストは`app/.well-known/farcaster.json/route.ts`で提供

**重要**: アカウントアソシエーションの認証情報は既に設定済みで、Farcasterの開発者ポータルでマニフェストを再署名する場合を除き、変更しないでください。

## 主要な統合ポイント

### OnchainKit統合
- MiniKitフック: `useMiniKit`, `useQuickAuth`
- コンテキストがユーザーデータを提供: `context.user.displayName`
- フレームの準備状態は`setFrameReady()`で管理

### Farcaster SDK
- `@farcaster/quick-auth`によるJWT検証
- `withValidManifest`によるマニフェスト検証
- アプリ署名用のアカウントアソシエーション

## デプロイワークフロー

1. Vercelにデプロイ: `vercel --prod`
2. Vercelに環境変数を追加:
   ```bash
   vercel env add NEXT_PUBLIC_PROJECT_NAME production
   vercel env add NEXT_PUBLIC_ONCHAINKIT_API_KEY production
   vercel env add NEXT_PUBLIC_URL production
   ```
3. マニフェストを変更する場合は、https://farcaster.xyz/~/developers/mini-apps/manifest で再署名
4. 公開前に https://base.dev/preview でテスト

## 重要事項

- Base app IDは`app/layout.tsx:13`にハードコード
- Webpack設定で`pino-pretty`、`lokijs`、`encoding`をビルドの問題を避けるために除外
- コードベースの一部（`app/page.tsx:33-58`）に日本語コメントあり
- アカウントアソシエーション署名は環境固有でデプロイされたドメインに紐付けられている
