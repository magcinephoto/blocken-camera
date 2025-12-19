# BlockenCameraNFT 実装ガイド

## 概要

BlockenCameraNFTは、ASCIICameraで生成されたSVG画像をオンチェーンに完全保存するNFTコントラクトです。

- **ライセンス**: MIT
- **Solidity バージョン**: ^0.8.24
- **ライブラリ**: OpenZeppelin ERC721, Ownable
- **チェーン**: Base (Mainnet & Sepolia Testnet)

## 主要機能

### ユーザー機能
- `mint(string svgData)`: SVG画像をNFTとしてミント（手数料支払い）
- `tokenURI(uint256 tokenId)`: NFTのメタデータを取得（完全オンチェーン）
- `getSvgData(uint256 tokenId)`: SVGデータを取得
- `getCurrentTokenId()`: 現在のトークンIDを取得

### 管理者機能
- `setPlatformFee(uint256 newFee)`: プラットフォーム手数料を設定
- `withdraw()`: 蓄積された手数料を引き出し

## デプロイ手順

### 1. 環境変数の設定

```bash
# contracts/.env ファイルを作成
cd contracts
cp .env.example .env
```

`.env`ファイルに以下を追加:
```env
PRIVATE_KEY=your_private_key_here
BASESCAN_API_KEY=your_basescan_api_key_here
```

### 2. テストの実行

```bash
# 全テストを実行
forge test

# BlockenCameraNFTのテストのみ実行
forge test --match-contract BlockenCameraNFTTest

# 詳細出力
forge test --match-contract BlockenCameraNFTTest -vvv
```

### 3. Base Sepoliaへのデプロイ

```bash
# コンパイル
forge build

# デプロイ
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url baseSepolia \
  --broadcast \
  --verify

# 出力例:
# BlockenCameraNFT deployed to: 0x1234567890123456789012345678901234567890
```

### 4. フロントエンド設定

プロジェクトルートの`.env.local`に追加:
```env
NEXT_PUBLIC_BLOCKEN_CONTRACT_ADDRESS_SEPOLIA=0x1234567890123456789012345678901234567890
NEXT_PUBLIC_ENVIRONMENT=development
```

### 5. 統合テスト

```bash
# フロントエンドを起動
cd ..
npm run dev
```

ブラウザで`http://localhost:3000`を開き:
1. ウォレットを接続（Base Sepoliaに切り替え）
2. ASCIICameraで写真を撮影
3. プレビューモードで「NFTをミント」ボタンをクリック
4. トランザクションを確認
5. Basescanでミント結果を確認

### 6. Base Mainnetへのデプロイ

```bash
cd contracts

# 本番環境へのデプロイ（慎重に！）
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url base \
  --broadcast \
  --verify
```

`.env.local`を更新:
```env
NEXT_PUBLIC_BLOCKEN_CONTRACT_ADDRESS_MAINNET=0xYourMainnetAddress
NEXT_PUBLIC_ENVIRONMENT=production
```

## コントラクト仕様

### 状態変数
```solidity
uint256 private _tokenIdCounter;                    // トークンIDカウンター
uint256 public platformFee;                         // プラットフォーム手数料（初期値0）
mapping(uint256 => string) private tokenSvgData;    // SVGデータ保存
mapping(uint256 => uint256) public tokenTimestamps; // ミント時刻記録
```

### バリデーション
- SVGデータが空でないこと
- SVGサイズが100KB以下
- 手数料が十分であること（`msg.value >= platformFee`）

### イベント
```solidity
event NFTMinted(address indexed to, uint256 indexed tokenId, uint256 timestamp, uint256 fee);
event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);
event FundsWithdrawn(address indexed owner, uint256 amount);
```

## テスト概要

全22テストケースが実装されています:

### 基本機能テスト（6テスト）
- ✅ デプロイメント確認
- ✅ 有効なSVGでmint成功
- ✅ 空のSVGでmint失敗
- ✅ 大きすぎるSVGでmint失敗
- ✅ 複数ミントの確認
- ✅ ETH受信機能

### 手数料機能テスト（5テスト）
- ✅ 手数料不足でmint失敗
- ✅ 正確な手数料でmint成功
- ✅ 過剰な手数料でも成功
- ✅ オーナーによる手数料変更
- ✅ 非オーナーによる手数料変更失敗

### 資金管理テスト（3テスト）
- ✅ オーナーによる引き出し成功
- ✅ 非オーナーによる引き出し失敗
- ✅ 残高0での引き出し失敗

### tokenURI生成テスト（4テスト）
- ✅ tokenURIの正しい生成
- ✅ 存在しないトークンでrevert
- ✅ SVGデータの正しい取得
- ✅ 存在しないトークンのSVGデータ取得失敗

### イベント・統合テスト（4テスト）
- ✅ NFTMintedイベントの発火
- ✅ PlatformFeeUpdatedイベントの発火
- ✅ FundsWithdrawnイベントの発火
- ✅ フルミントフローの統合テスト

## ガスコスト見積もり

### デプロイ
- コントラクトデプロイ: 約2,000,000ガス

### mint関数（SVGサイズ別）
- 小サイズ（10KB）: 約150,000ガス
- 中サイズ（50KB）: 約250,000ガス
- 大サイズ（100KB）: 約400,000ガス

### 管理者操作
- setPlatformFee: 約30,000ガス
- withdraw: 約35,000ガス
- tokenURI読み取り: 無料（view関数）

## フロントエンド統合

### BlockenMintNFT.tsx

新しいReactコンポーネントが`app/components/BlockenMintNFT.tsx`に実装されています。

**主要機能**:
- SVGデータをpropsで受け取る
- プラットフォーム手数料を自動読み取り
- wagmi/viemを使ったトランザクション管理
- チェーン切り替え検出
- トランザクション状態の表示

### ASCIICamera.tsx統合

ASCIICameraコンポーネントのプレビューモードにBlockenMintNFTが統合されています:

```typescript
// SVG文字列抽出関数
const extractSvgString = (svgDataUrl: string): string => {
  const base64Data = svgDataUrl.split(',')[1];
  return atob(base64Data);
};

// プレビューモードでの表示
{mode === 'preview' && svgDataUrl && (
  <BlockenMintNFT svgData={extractSvgString(svgDataUrl)} />
)}
```

## セキュリティ考慮事項

### 実装されている保護
- ✅ OpenZeppelin標準ライブラリの使用
- ✅ `onlyOwner`修飾子で管理者機能を保護
- ✅ `call`を使った安全な資金転送
- ✅ SVGサイズ制限でDoS攻撃を防止
- ✅ 再入攻撃対策（単純なtransfer使用）

### ベストプラクティス
- ✅ `calldata`の使用でガス節約
- ✅ `unchecked`ブロックでカウンター効率化
- ✅ 短絡評価の活用
- ✅ イベント発火による透明性確保

## よくある質問

### Q: プラットフォーム手数料はいくらですか？
A: 初期値は0 ETHです。オーナーが`setPlatformFee`関数で変更できます。

### Q: SVGデータのサイズ制限は？
A: 100KB（100,000バイト）までです。これを超えるとmintが失敗します。

### Q: ガスコストを最適化するには？
A: SVGサイズを50KB以下に抑えることを推奨します。フロントエンドでSVGを圧縮（不要な空白削除）することも効果的です。

### Q: 既存のTimestampNFTとの違いは？
A:
- TimestampNFT: タイムスタンプのみをオンチェーン保存、SVGはコントラクト内生成
- BlockenCameraNFT: フロントエンドで生成されたSVG画像をオンチェーン保存

### Q: SSTORE2は使っていますか？
A: いいえ。簡略版の実装では、mappingに直接SVG文字列を保存しています。将来的にSSTORE2への移行を検討できます。

## トラブルシューティング

### テストが失敗する
```bash
# 依存関係を再インストール
forge install

# キャッシュをクリア
forge clean

# 再度ビルド
forge build

# テスト実行
forge test
```

### デプロイが失敗する
- 環境変数（PRIVATE_KEY）が正しく設定されているか確認
- ウォレットに十分なETHがあるか確認
- RPCエンドポイントが正常か確認

### フロントエンドでコントラクトが見つからない
- `.env.local`に正しいコントラクトアドレスが設定されているか確認
- `NEXT_PUBLIC_ENVIRONMENT`が正しい環境（development/production）に設定されているか確認
- Next.jsサーバーを再起動（環境変数の変更後）

## 今後の拡張案

### 短期的改善
1. SVG圧縮機能の追加（フロントエンド）
2. ミント履歴の表示
3. NFTギャラリー機能

### 長期的改善
1. SSTORE2への移行（ストレージコスト削減）
2. バッチミント機能
3. レイヤー2（Optimism、Arbitrum）への展開
4. ENS名機能の追加
5. シリーズ管理機能

## リンク

- **Base Sepolia Explorer**: https://sepolia.basescan.org/
- **Base Mainnet Explorer**: https://basescan.org/
- **OpenZeppelin Docs**: https://docs.openzeppelin.com/
- **Foundry Book**: https://book.getfoundry.sh/

## ライセンス

MIT License
