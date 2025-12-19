# BaseCamera Smart Contract Documentation

https://basescan.org/address/0xAE0AFfDc416Bf7b2D4BE033e90646Cb689CAF630#code

## 概要

BaseCamera は、画像データを完全にオンチェーンで保存・管理するための ERC721 NFT コントラクトです。SSTORE2 を活用した効率的なストレージ戦略により、PNG、GIF、SVG 形式の画像をブロックチェーン上に永続的に保存できます。

## 主要機能

### 1. **完全オンチェーン画像ストレージ**
- SSTORE2 ライブラリを使用した効率的なデータ保存
- チャンク分割による大容量画像の対応
- PNG、GIF、SVG の3つの画像形式をサポート

### 2. **柔軟なメタデータ管理**
- カスタムタイトル設定（最大20文字）
- ENS 名による作者識別
- シリーズ管理機能
- ミント年の記録

### 3. **Base64 エンコードによる統合**
- 画像データを Base64 エンコードして tokenURI に直接埋め込み
- 外部依存なしで完全に自己完結したメタデータ

## コントラクト構造

### 状態変数

```solidity
uint256 private _tokenIds;           // トークンIDカウンター
uint256 public platformFee;          // ミント手数料（デフォルト: 0.0005 ETH）
string public series;                // シリーズ名（デフォルト: "Mark I"）

enum ImageType { PNG, GIF, SVG }    // サポートされる画像形式
```

### 主要データ構造

```solidity
struct ImageMetadata {
    address[] chunks;      // SSTORE2 ストレージアドレスの配列
    ImageType imageType;   // 画像形式
    uint256 totalLength;   // 総データサイズ
}
```

## 主要関数

### ミント関数

```solidity
function mint(
    bytes[] calldata imageChunks,  // 画像データのチャンク配列
    ImageType imageType,           // 画像形式（PNG/GIF/SVG）
    string memory ensName,         // 作者の ENS 名
    string memory mintYear,        // ミント年
    string memory title            // カスタムタイトル（オプション）
) public payable returns (uint256)
```

**要件:**
- `msg.value >= platformFee`
- ENS 名は `.eth` で終わるか `"N/A"`
- タイトルは20文字以内
- 少なくとも1つの画像チャンクが必要

**動作:**
1. 手数料とバリデーションチェック
2. 新しいトークンIDの生成
3. タイトルの検証とフォーマット
4. SSTORE2 による画像チャンクの保存
5. トークンのミントと tokenURI 生成
6. `ImageMinted` イベントの発行

### データ取得関数

```solidity
// 完全な画像データを取得
function getImageData(uint256 tokenId) public view returns (bytes memory)

// 画像形式を取得
function getImageType(uint256 tokenId) public view returns (ImageType)

// タイトルを取得（カスタムまたはデフォルト）
function getTitle(uint256 tokenId) public view returns (string memory)

// ENS 名を取得
function getEnsName(uint256 tokenId) public view returns (string memory)
```

### 管理者関数

```solidity
// プラットフォーム手数料の更新
function setPlatformFee(uint256 newFee) public onlyOwner

// シリーズ名の更新
function setSeries(string memory newSeries) public onlyOwner

// ENS 名の更新
function setEnsName(uint256 tokenId, string memory newEns) public onlyOwner

// 手数料の引き出し
function withdraw() public onlyOwner
```

## 使用例

### 基本的なミント

```solidity
// 画像データを準備
bytes[] memory chunks = new bytes[](1);
chunks[0] = /* your PNG data */;

// ミント実行
uint256 tokenId = baseCamera.mint{value: 0.0005 ether}(
    chunks,
    BaseCamera.ImageType.PNG,
    "artist.eth",
    "2024",
    "Sunset Photography"
);
```

### 大容量画像のチャンク分割ミント

```solidity
// 大きな画像を複数チャンクに分割
bytes[] memory chunks = new bytes[](3);
chunks[0] = /* chunk 1 */;
chunks[1] = /* chunk 2 */;
chunks[2] = /* chunk 3 */;

uint256 tokenId = baseCamera.mint{value: 0.0005 ether}(
    chunks,
    BaseCamera.ImageType.GIF,
    "creator.eth",
    "2024",
    "Animated Art"
);
```

### データ取得

```solidity
// 画像データ全体を取得
bytes memory imageData = baseCamera.getImageData(tokenId);

// メタデータ取得
string memory title = baseCamera.getTitle(tokenId);
string memory ensName = baseCamera.getEnsName(tokenId);
BaseCamera.ImageType imageType = baseCamera.getImageType(tokenId);
```

## タイトルのバリデーションルール

1. **空のタイトル:** `IMG_<tokenId>` 形式に自動変換
2. **`IMG_<数字のみ>` 形式:** `IMG_<tokenId>` に自動変換（重複防止）
3. **その他:** 入力されたタイトルをそのまま使用（最大20文字）

### 例

```solidity
// タイトル未指定 → "IMG_1"
mint(..., "")

// 数字のみのIMG形式 → "IMG_1" に変換
mint(..., "IMG_123")

// カスタムタイトル → そのまま保存
mint(..., "My Artwork")
mint(..., "IMG_Custom_001")
```

## ENS 名のバリデーション

有効な ENS 名の条件:
- `.eth` で終わる文字列（最小5文字）
- または `"N/A"` 文字列

```solidity
// ✅ 有効
"artist.eth"
"creator.eth"
"N/A"

// ❌ 無効
"artist"        // .eth がない
".eth"          // 短すぎる
"name.com"      // .eth ではない
```

## tokenURI 構造

生成される JSON メタデータの構造:

```json
{
  "name": "タイトル",
  "description": "This image was created with BaseCamera and is stored entirely on-chain.",
  "image": "data:image/[png|gif|svg+xml];base64,[画像データ]",
  "attributes": [
    {"trait_type": "Series", "value": "Mark I"},
    {"trait_type": "Year", "value": "2024"},
    {"trait_type": "Artist (0x)", "value": "0x..."},
    {"trait_type": "Artist (ENS)", "value": "artist.eth"}
  ],
  "format": "PNG|GIF|SVG"
}
```

## イベント

```solidity
event ImageMinted(
    uint256 indexed tokenId,
    address indexed minter,
    uint256 fee,
    ImageType imageType
);

event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);
event SeriesUpdated(string oldSeries, string newSeries);
event EnsUpdated(uint256 indexed tokenId, string oldEns, string newEns);
```

## セキュリティ考慮事項

1. **Ownable パターン:** 管理者機能は所有者のみ実行可能
2. **入力バリデーション:**
   - ENS 名の形式チェック
   - タイトル長の制限
   - 手数料の確認
3. **存在チェック:** すべてのトークン固有操作で存在確認を実施
4. **再入攻撃対策:** withdraw 関数は単純な transfer を使用

## ガス最適化

1. **SSTORE2 使用:** 効率的なストレージコスト
2. **チャンク分割:** 大容量データの段階的保存
3. **Unchecked 演算:** オーバーフロー保護が不要な箇所で使用
4. **最小限の状態変数:** 必要最小限のストレージ使用

## 依存関係

- **Solady (v0.0.x):** ERC721, Ownable, LibString, LibBytes, Base64
- **SSTORE2:** 効率的なオンチェーンストレージ

## ライセンス

MIT License

## クレジット

- **作者:** Lanton Mills (2024)
- **支援:** Claude AI
- **インスピレーション:** vectorized, diid, xtremetom
