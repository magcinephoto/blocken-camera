# スマホでのダブり表示問題 修正仕様書

## 問題の概要

### 現象
スマートフォンでASCIIカメラを表示すると、画像がダブって（重複して）表示されてしまう。

### 原因
現在の`ASCIICamera.tsx`の実装では、以下のアプローチを採用している：

```javascript
p5.noCanvas();  // デフォルトキャンバスを無効化
asciiDiv = p5.createDiv();  // HTML div要素を作成
asciiDiv.html(asciiImage);  // div要素にASCIIテキストを設定
```

この方式では、p5.jsがReact + p5-wrapperの管理下にないDOM要素を直接作成するため、以下の問題が発生する：

1. **DOM要素の二重管理**: ReactとP5.jsの両方がDOMを操作
2. **レイアウトの不整合**: スマホのレンダリングエンジンで要素が重複表示される
3. **予期しない副作用**: React仮想DOMとP5.jsの実DOMの競合

## 解決方法

### アプローチ
`docs/sampleAscii.js`の成功パターンを採用し、HTML要素を使わずにcanvasのみで描画する。

**新しい実装方式:**
```javascript
p5.createCanvas(400, 600);  // キャンバスを作成
p5.text(String(ch), x * charW, y * charH);  // キャンバスに直接文字を描画
```

この方式では：
1. **単一のDOM要素**: canvas要素のみでASCIIアートを表示
2. **React管理下**: P5CanvasコンポーネントがcanvasをReact管理下に配置
3. **副作用なし**: P5.jsはcanvas内部のみを操作、DOMには干渉しない

### 実装の比較

| 項目 | 現在の実装 (createDiv) | 新しい実装 (createCanvas) |
|------|----------------------|--------------------------|
| DOM要素 | div要素 + canvas（無効化） | canvas要素のみ |
| 描画方法 | HTML要素への文字列挿入 | キャンバスへの文字描画 |
| React統合 | P5.jsが独自にDOM操作 | P5CanvasコンポーネントのみがDOM管理 |
| スマホ表示 | ダブり表示が発生 | 正常に表示 |
| パフォーマンス | HTML要素の再レンダリング | canvas描画のみ |

## 技術仕様

### 1. キャンバス設定

```javascript
const videoWidth = 50;   // カメラ解像度（横）
const videoHeight = 50;  // カメラ解像度（縦）
const charW = 8;         // 1文字の幅（ピクセル）
const charH = 12;        // 1文字の高さ（ピクセル）

// キャンバスサイズ = 文字数 × 文字サイズ
const canvasWidth = videoWidth * charW;   // 400px
const canvasHeight = videoHeight * charH;  // 600px
```

**キャンバス作成:**
```javascript
p5.createCanvas(400, 600);
```

### 2. 文字パレット

**採用するパレット** (sampleAscii.jsから):
```javascript
const letters = " .,;xe$";
```

このパレットは、明るい順に7段階の階調を表現：
- ` ` (スペース): 最も明るい（白に近い）
- `.`: 明るい
- `,`: やや明るい
- `;`: 中間
- `x`: やや暗い
- `e`: 暗い
- `$`: 最も暗い（黒に近い）

**参考** (現在の実装で使用されているパレット):
```javascript
const density = "Ñ@#W$9876543210?!abc;:+=-,._          ";
```
このパレットは削除され、上記のsimpleなlettersに置き換えられる。

### 3. 色設定

**文字色**: `#1100FA` (青色)
**背景色**: `#FFFFFF` (白色)

```javascript
p5.fill('#1100FA');      // 文字を青色で描画
p5.background('#FFFFFF'); // 背景を白色で塗りつぶし
```

### 4. フォント設定

**フォントファイル**: `Inconsolata-Regular.ttf`
**配置場所**: `public/fonts/Inconsolata-Regular.ttf`
**読み込み方法**:

```javascript
let font;

p5.preload = () => {
  try {
    font = p5.loadFont('/fonts/Inconsolata-Regular.ttf');
  } catch (e) {
    console.log('Font not loaded, using default');
  }
};

p5.setup = () => {
  if (font) {
    p5.textFont(font, 16);  // フォントサイズ16px
  }
  // ...
};
```

### 5. 描画ロジック

**基本フロー:**

1. **ビデオキャプチャ取得**: `createCapture()`で50x50のカメラ映像を取得
2. **ピクセルデータ読み込み**: `video.loadPixels()`でピクセル配列を取得
3. **明度計算**: 各ピクセルのRGB値の平均を計算
4. **文字マッピング**: 明度に応じて文字パレットから文字を選択
5. **キャンバス描画**: `p5.text()`で各文字をキャンバスに描画
6. **ASCII保存**: シャッター用にASCIIテキストを保存

**コード例:**

```javascript
p5.draw = () => {
  if (!video || !video.elt || video.elt.readyState < 2) return;

  // 毎フレーム背景をクリア
  p5.background('#FFFFFF');

  video.loadPixels();
  if (!video.pixels || video.pixels.length === 0) return;

  // テキスト描画設定
  p5.fill('#1100FA');
  p5.noStroke();
  p5.textAlign(p5.LEFT, p5.BASELINE);

  let asciiImage = "";
  const offsetY = 9;

  for (let j = 0; j < videoHeight; j++) {
    for (let i = 0; i < videoWidth; i++) {
      const pixelIndex = (i + j * videoWidth) * 4;
      const r = video.pixels[pixelIndex];
      const g = video.pixels[pixelIndex + 1];
      const b = video.pixels[pixelIndex + 2];

      const avg = (r + g + b) / 3;
      const brightness = avg / 255;

      const charIndex = p5.floor(
        p5.map(brightness, 0, 1, 0, letters.length - 1)
      );
      const ch = letters.charAt(charIndex);

      // キャンバスに描画
      if (ch && ch !== ' ') {
        p5.text(String(ch), i * charW, j * charH + offsetY);
      }

      asciiImage += ch;
    }
    asciiImage += "\n";
  }

  currentASCIIRef.current = asciiImage;
};
```

### 6. レスポンシブ対応

**CSS設定:**

```css
.asciiWrapper canvas {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}
```

これにより、400x600pxのキャンバスが画面幅に応じて自動的にスケーリングされる。

## 期待される動作

### 正常な動作フロー

1. **カメラ起動**: バックカメラ（environment）が起動
2. **ASCII描画**: カメラ映像がリアルタイムでASCIIアートに変換されてcanvasに描画
3. **スマホ表示**: ダブり表示なく、1つのcanvas要素のみが表示される
4. **シャッター**: ボタンクリックで現在のASCIIテキストをキャプチャ
5. **SVG生成**: キャプチャしたASCIIテキストからSVG画像を生成
6. **プレビュー**: 生成されたSVG画像をプレビュー表示
7. **Mint**: SVGデータをNFTとしてMint

### 既存機能の維持

以下の機能は全て維持される：

- ✅ カメラキャプチャ（バックカメラ優先）
- ✅ リアルタイムASCII変換
- ✅ シャッターボタン
- ✅ SVG生成（base64エンコード）
- ✅ プレビュー表示
- ✅ 削除ボタン
- ✅ BlockenMintNFT統合
- ✅ エラーハンドリング
- ✅ ローディング表示

### パフォーマンス改善

1. **DOM操作の削減**: HTML要素の操作がなくなり、canvas描画のみに
2. **レンダリング効率**: ブラウザのcanvas最適化を活用
3. **メモリ使用量**: グラフィックスバッファ不要で、videoから直接ピクセルデータを取得

## 検証項目

実装後、以下を確認する：

### 必須検証

- [ ] カメラが正常に起動する
- [ ] ASCIIアートがキャンバスに描画される
- [ ] **スマホで画像がダブらない** ⭐ 最重要
- [ ] シャッターボタンが機能する
- [ ] プレビュー画面が正常に表示される
- [ ] SVGデータが正常に生成される
- [ ] Mint機能が正常に動作する

### 追加検証

- [ ] Inconsolataフォントが適用される
- [ ] レスポンシブ対応が機能する
- [ ] エラーハンドリングが適切に動作する
- [ ] パフォーマンスが改善される（フレームレート確認）

## 参考ファイル

- `docs/sampleAscii.js`: 成功パターンの参考実装
- `app/components/ASCIICamera.tsx`: 修正対象ファイル
- `app/components/ASCIICamera.module.css`: スタイル定義
- `docs/Inconsolata-Regular.ttf`: 使用するフォント

## 実装日

2025-12-19

## 備考

- この修正により、P5.jsとReactの統合がよりクリーンになり、将来的なメンテナンス性も向上する
- sampleAscii.jsの実証済みアプローチを採用することで、安定性が保証される
- 文字パレットは変更されるが、既存の色設定（青と白）は維持される
