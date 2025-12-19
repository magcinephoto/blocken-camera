# トランザクションハッシュベース ASCII パレット機能

## 概要

このドキュメントは、Baseチェーンの最新トランザクションハッシュを使用してASCIIアートのパレットを動的に選択する機能について説明します。

## 機能の目的

カメラで撮影されるASCIIアートの見た目をブロックチェーンの状態に紐付けることで、以下を実現します：

1. **一意性**: 各撮影セッションで異なるトランザクションハッシュが使用されるため、同じ被写体でも異なるビジュアル表現が得られる
2. **ブロックチェーンとの統合**: NFTとしてミントされるアート作品が、Baseチェーンの特定のブロック状態と関連付けられる
3. **予測不可能性**: ユーザーがどのパレットが選択されるかを事前に知ることができず、偶然性が生まれる

## アーキテクチャ

### データフロー

```
ユーザーがカメラページにアクセス
  ↓
ASCIICameraコンポーネントがマウント
  ↓
useEffect で /api/blockhash にリクエスト
  ↓
API Routeが環境に応じてBasescan APIを呼び出し
  ↓
最新ブロックの最初のトランザクションハッシュを取得
  ↓
フロントエンドで selectPaletteFromHash() を実行
  ↓
パレットとdensity変換関数が決定
  ↓
p5.js draw()関数で各フレームに適用
```

### コンポーネント構成

```
app/
├── api/
│   └── blockhash/
│       └── route.ts          # Basescan API統合
├── components/
│   └── ASCIICamera.tsx       # カメラUI + p5.js統合
└── utils/
    └── asciiPalette.ts       # パレット選択ロジック
```

## パレットの選択方法

### 7つのASCIIパレット

以下の7つのパレットから1つがランダムに選択されます：

| インデックス | パレット | 特徴 |
|------------|---------|------|
| 0 | `" .'`^\",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$"` | 標準的な64文字パレット（最も細かい階調） |
| 1 | `" .,:;irsXA253hMHN$#"` | シンプルな18文字パレット |
| 2 | `" ░▒▓█▄▀■▌▐"` | Unicodeブロック要素（グラフィカル） |
| 3 | `" .-/\\|<>v^<>o*+xX%#&@"` | 記号中心のパレット |
| 4 | `"$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`'. "` | 逆順パレット（暗→明） |
| 5 | `" .:-=+*#%@"` | ミニマルな10文字パレット |
| 6 | `"Ñ@#W$9876543210?!abc;:+=-,._          "` | 数字とスペース中心 |

### 虹の7色定義

トランザクションハッシュに基づいてカラーモードも決定されます。レインボーモードの場合、以下の7色が使用されます：

| インデックス | 色名 | RGB値 | 16進数 |
|------------|------|-------|--------|
| 0 | 赤 (Red) | `(255, 0, 0)` | `#FF0000` |
| 1 | 橙 (Orange) | `(255, 127, 0)` | `#FF7F00` |
| 2 | 黄 (Yellow) | `(255, 255, 0)` | `#FFFF00` |
| 3 | 緑 (Green) | `(0, 255, 0)` | `#00FF00` |
| 4 | 青 (Blue) | `(0, 0, 255)` | `#0000FF` |
| 5 | 藍 (Indigo) | `(75, 0, 130)` | `#4B0082` |
| 6 | 紫 (Violet) | `(148, 0, 211)` | `#9400D3` |

### 選択アルゴリズム

トランザクションハッシュ（例: `0xb0dc294088cf10a0dbfad35f4bf01ac9b43db54065f9...`）から以下のように選択します：

```javascript
// 1. "0x"プレフィックスを除去
const cleanHash = txHash.replace(/^0x/, '');

// 2. 最初の1文字（16進数）でパレットインデックスを決定
const firstChar = cleanHash.charAt(0);  // 例: 'b'
const firstValue = parseInt(firstChar, 16);  // 'b' → 11
const paletteIndex = firstValue % 7;  // 11 % 7 = 4

// 3. パレット4が選択される
const selectedPalette = ASCII_PALETTES[4];

// 4. 2番目の文字でカラーモードを決定（偶数=rainbow、奇数=monochrome）
const secondChar = cleanHash.charAt(1);  // 例: '0'
const secondValue = parseInt(secondChar, 16);  // '0' → 0
const colorMode = secondValue % 2 === 0 ? 'rainbow' : 'monochrome';  // 0は偶数なのでrainbow
```

### カラーモード

- **rainbow**: 虹の7色を使用。文字インデックスに基づいて色が循環的に適用される
- **monochrome**: 白色のみ（従来の表示方法）

## Density変換（ノイズ適用）

トランザクションハッシュは、各ピクセルのbrightness値にノイズを加えるためにも使用されます。

### アルゴリズム

```javascript
// 1. ハッシュ全体を数値配列に変換
const hashValues = cleanHash.split('').map(char => parseInt(char, 16));
// 例: ['b','0','d','c',...] → [11, 0, 13, 12, ...]

// 2. ピクセル座標からハッシュ配列のインデックスを計算
const index = (x + y * 50) % hashValues.length;
const hashNoise = hashValues[index] / 15;  // 0-1に正規化

// 3. 元のbrightness値にノイズを適用（影響度10%）
const modifiedBrightness = brightness * 0.9 + hashNoise * 0.1;
```

### ノイズの効果

- **影響度**: 10%（控えめに適用し、元の画像構造を維持）
- **パターン**: トランザクションハッシュの文字列順序に基づいて決定論的に適用
- **視覚的効果**: 明度の階調に微妙な揺らぎを加え、より有機的な見た目になる

## 色の適用（レインボーモード）

レインボーモードが選択された場合、各ASCII文字に虹の7色が循環的に適用されます。

### アルゴリズム

```javascript
// 1. 文字インデックスから色インデックスを計算
const colorIndex = charIndex % RAINBOW_COLORS.length;  // 0-6

// 2. 虹の7色から色を取得
const color = RAINBOW_COLORS[colorIndex];

// 3. p5.jsで色を設定
p5.fill(color.r, color.g, color.b);

// 4. 文字を描画
p5.text(ch, x, y);
```

### 色の視覚効果

- **文字ごとに色が変わる**: パレット内の文字インデックスに基づいて色が決定
- **循環的な色変化**: 7色を繰り返し使用するため、グラデーション的な効果
- **予測不可能性**: トランザクションハッシュの2番目の文字でランダムに決定
- **ブロックチェーンとの結びつき**: 各撮影セッションで異なる色モードが選択される

## Etherscan API v2統合（Base Chain対応）

### エンドポイント

Etherscan API v2を使用し、単一のエンドポイントですべてのチェーンをサポート：

| 環境 | Chain ID | Network |
|------|----------|---------|
| 開発環境 | 84532 | Base Sepolia |
| 本番環境 | 8453 | Base Mainnet |

**統一APIエンドポイント**: `https://api.etherscan.io/v2/api`

### APIリクエスト

```
GET https://api.etherscan.io/v2/api?chainid=8453&module=proxy&action=eth_getBlockByNumber&tag=latest&boolean=true&apikey=YOUR_API_KEY
```

**パラメータ:**
- `chainid`: チェーンID（Base Mainnet: 8453, Base Sepolia: 84532）
- `module=proxy`: Ethereumノードへのプロキシ呼び出し
- `action=eth_getBlockByNumber`: 特定ブロックの情報を取得
- `tag=latest`: 最新ブロックを指定
- `boolean=true`: トランザクション詳細を含める
- `apikey`: Etherscan APIキー（Etherscanから取得、全チェーンで使用可能）

### レスポンス構造

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "number": "0x1234567",
    "hash": "0xabcdef...",
    "transactions": [
      {
        "hash": "0xb0dc294088cf10a0dbfad35f4bf01ac9b43db54065f9...",
        "from": "0x...",
        "to": "0x...",
        ...
      },
      ...
    ]
  }
}
```

**使用するデータ:**
- `result.transactions[0].hash`: 最初のトランザクションハッシュ

## エラーハンドリング

### 1. API呼び出し失敗

**開発環境:**
```javascript
// 固定のダミーハッシュを返す
const dummyHash = "0xb0dc294088cf10a0dbfad35f4bf01ac9b43db54065f9abcd1234567890";
```

**本番環境:**
```javascript
// デフォルトパレット（インデックス0）にフォールバック
const defaultPalette = ASCII_PALETTES[0];
```

### 2. タイムアウト

- Next.jsのデフォルトfetchタイムアウト: 10秒
- タイムアウト時は catch ブロックで捕捉され、デフォルトパレット使用

### 3. パレット選択が完了していない場合

p5.js の `draw()` 関数内で早期リターン:
```javascript
if (!paletteSelection) {
  return; // まだ描画しない
}
```

## パフォーマンス

### 取得頻度

- **マウント時に1回のみ**: コンポーネントがマウントされた時点で1回だけトランザクションハッシュを取得
- **セッション中は固定**: 同じパレットが撮影中ずっと使用される
- **リロード時に更新**: ページをリロードすると新しいトランザクションハッシュが取得される

### 計算コスト

- **パレット選択**: O(1) - ハッシュの最初の1文字のみ使用
- **Density変換**: O(1) - 配列のインデックスアクセスのみ
- **メモリ使用**: 軽量（パレット文字列 + クロージャ関数）

### レート制限

**Etherscan API v2:**
- 無料枠: 1秒あたり5リクエスト
- APIキー使用時: レート制限が緩和される
- この実装では1ユーザーあたり1リクエストのみなので問題なし
- **重要**: Etherscanから取得したAPIキーは、Base Chainを含む60以上のサポート対象チェーンすべてで使用可能

## 実装詳細

### app/utils/asciiPalette.ts

```typescript
export const RAINBOW_COLORS = [/* 虹の7色定義 */];
export type ColorMode = 'rainbow' | 'monochrome';

export interface PaletteSelection {
  palette: string;
  colorMode: ColorMode;
  densityModifier: (brightness: number, x: number, y: number) => number;
  getColor: (charIndex: number) => { r: number; g: number; b: number };
}

export function selectPaletteFromHash(txHash: string): PaletteSelection
```

**責務:**
- 7つのパレット定義と虹の7色定義を管理
- トランザクションハッシュからパレットとカラーモードを選択
- Density変換関数を生成（クロージャでハッシュ値を保持）
- 文字インデックスから色を取得する関数を提供

### app/api/blockhash/route.ts

```typescript
export async function GET(_request: NextRequest)
```

**責務:**
- Etherscan API v2を使用してBase Chainのトランザクションを取得
- 環境に応じてChain ID（8453 or 84532）を切り替え
- 最新ブロックのトランザクションハッシュを取得
- エラー時のフォールバック処理

### app/components/ASCIICamera.tsx

**追加state:**
```typescript
const [paletteSelection, setPaletteSelection] = useState<PaletteSelection | null>(null);
```

**useEffect:**
```typescript
useEffect(() => {
  // マウント時に1回だけ実行
  fetchAndSelectPalette();
}, []);
```

**p5.js統合:**
```typescript
// パレット使用
const letters = paletteSelection.palette;

// Density変換適用
brightness = paletteSelection.densityModifier(brightness, i, j);

// 文字インデックスから色を取得
const color = paletteSelection.getColor(charIndex);
p5.fill(color.r, color.g, color.b);

// 文字を描画
p5.text(ch, x, y);
```

## 環境変数

### .example.env

```env
# Etherscan API Key (https://etherscan.io/myapikey から取得)
# Base Chainを含む全チェーンで使用可能（optional - 無料枠で動作可能）
NEXT_PUBLIC_BASESCAN_API_KEY=

# Environment (development or production)
NEXT_PUBLIC_ENVIRONMENT=development
```

### 使用箇所

**サーバーサイド（API Route）:**
```typescript
const IS_DEV = process.env.NODE_ENV !== "production";
```

**クライアントサイド:**
```typescript
const isDev = process.env.NEXT_PUBLIC_ENVIRONMENT === "development";
```

## テスト方法

### 開発環境

```bash
# 開発サーバー起動
npm run dev

# APIエンドポイント確認
curl http://localhost:3000/api/blockhash

# 期待されるレスポンス
{
  "success": true,
  "txHash": "0x...",
  "blockNumber": "0x...",
  "network": "Base Sepolia"
}
```

### 動作確認

1. カメラページにアクセス
2. ブラウザのコンソールを開く
3. `[ASCIICamera] Selected palette from tx: 0x...` のログを確認
4. 異なる時間にリロード → 異なるパレットが選択される
5. ネットワークタブで `/api/blockhash` のリクエストを確認

### 本番環境（Vercel）

```bash
# 環境変数設定
vercel env add NEXT_PUBLIC_BASESCAN_API_KEY production
vercel env add NEXT_PUBLIC_ENVIRONMENT production

# デプロイ
vercel --prod
```

## 将来の拡張

### 1. パレット手動選択UI

ユーザーがパレットとカラーモードを選択できるUI:
```typescript
const [manualPaletteIndex, setManualPaletteIndex] = useState<number | null>(null);
const [manualColorMode, setManualColorMode] = useState<ColorMode | null>(null);
```

### 2. 定期更新モード

数秒ごとに新しいトランザクションハッシュを取得:
```typescript
useEffect(() => {
  const interval = setInterval(() => {
    fetchAndSelectPalette();
  }, 5000);  // 5秒ごと

  return () => clearInterval(interval);
}, []);
```

### 3. カスタムカラーパレット

虹の7色以外のカラースキーム（パステルカラー、ダークカラーなど）:
```typescript
const PASTEL_COLORS = [
  { r: 255, g: 182, b: 193 },  // ライトピンク
  { r: 176, g: 224, b: 230 },  // パウダーブルー
  // ...
];
```

## トラブルシューティング

### APIエラー: "No transactions found"

**原因**: ブロックにトランザクションが含まれていない（稀）

**対処**: API Routeが自動的に次のブロックを試行するか、ダミーハッシュを返す

### パレットが選択されない

**原因**: API呼び出しが失敗している

**確認事項**:
1. ブラウザのネットワークタブで `/api/blockhash` のレスポンスを確認
2. コンソールログでエラーメッセージを確認
3. デフォルトパレットが使用されているか確認

### レート制限エラー

**原因**: Etherscan API v2のレート制限に達した

**対処**:
1. 環境変数 `NEXT_PUBLIC_BASESCAN_API_KEY` を設定
2. Etherscan (https://etherscan.io/myapikey) でAPIキーを取得（無料）
3. このキーはBase Chainを含む60以上のチェーンで使用可能

## 参考リンク

- [Etherscan API v2 Documentation](https://docs.etherscan.io/)
- [Etherscan API v2 Migration Guide](https://docs.etherscan.io/v2-migration)
- [Etherscan API Key](https://etherscan.io/myapikey) - APIキー取得ページ
- [Base Chain Documentation](https://docs.base.org/)
- [p5.js Reference](https://p5js.org/reference/)
- [ASCII Art Wikipedia](https://en.wikipedia.org/wiki/ASCII_art)

## まとめ

この機能により、Blocken Cameraで撮影されるASCIIアートは、Baseチェーンの状態と紐付けられ、ブロックチェーンの一意性と予測不可能性を活かした作品となります。

### 主な特徴

1. **7つのASCIIパレット**: トランザクションハッシュの最初の文字で決定
2. **虹の7色カラーモード**: トランザクションハッシュの2番目の文字で決定（rainbow or monochrome）
3. **Density変換**: ハッシュベースのノイズで有機的な見た目を実現
4. **一意性**: 各撮影セッションで異なるパレット・カラーモードが選択される
5. **予測不可能性**: ユーザーは事前に結果を知ることができない
6. **ブロックチェーンとの統合**: Baseチェーンの特定のブロック状態と関連付けられる

同じ被写体でも、パレットと色の組み合わせにより、毎回異なるビジュアル表現が得られます。
