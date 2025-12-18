# シャッター機能仕様書

## 概要

ASCIICameraコンポーネントにシャッター機能を追加し、リアルタイムで表示されているASCII動画を静止画としてキャプチャできるようにする。キャプチャした画像はSVG形式で保存し、base64エンコードしたdata URLとしてimg要素で表示する。

## 機能要件

### 1. シャッターボタン
- **配置**: 画面中央下部
- **動作**: ボタンを押すとその時点のASCII画像を静止画としてキャプチャ
- **デザイン**: iPhoneカメラアプリのような丸いボタン
- **状態**: カメラ起動中またはエラー時は無効化

### 2. 画像キャプチャ
- リアルタイムで生成されているASCII文字列をキャプチャ
- SVG形式に変換（`<text>`エレメント使用）
- base64エンコードして`data:image/svg+xml;base64,...`形式で保存

### 3. プレビュー表示
- キャプチャした画像をimg要素で表示
- 表示サイズは動画キャンバスと同等
- 削除ボタン（ゴミ箱アイコン）を右下に配置

### 4. 削除機能
- ゴミ箱アイコンをクリックでキャプチャした画像を削除
- カメラモードに戻り、リアルタイム表示を再開

## UI/UX仕様

### モード遷移

```
カメラモード (初期状態)
    ↓ シャッターボタン押下
プレビューモード
    ↓ 削除ボタン押下
カメラモード (初期状態に戻る)
```

### カメラモード
- リアルタイムASCII動画を表示
- 中央下部にシャッターボタンを表示
- カメラ起動中はシャッターボタンを無効化（半透明表示）

### プレビューモード
- キャプチャしたSVG画像を静止画表示
- 右下にゴミ箱アイコン（削除ボタン）を表示
- リアルタイム動画は裏で動作継続（復帰時にスムーズ）

## SVG生成仕様

### フォーマット

```xml
<svg xmlns="http://www.w3.org/2000/svg" width="340" height="328">
  <rect width="100%" height="100%" fill="#FFFFFF"/>
  <text x="20" y="20" font-family="'Courier New', monospace" font-size="10px" fill="#1100FA" letter-spacing="0">
    [1行目の48文字]
  </text>
  <text x="20" y="26" ...>[2行目の48文字]</text>
  ...
  <text x="20" y="308" ...>[48行目の48文字]</text>
</svg>
```

### サイズ計算

- **解像度**: 48行 × 48文字
- **文字サイズ**: 10px（Courier New）
- **文字幅**: 約6px（等幅フォント）
- **行間**: 6px
- **パディング**: 上下左右20px

**SVG全体サイズ**:
- 幅: 48文字 × 6px + パディング40px = **340px**
- 高さ: 48行 × 6px + パディング40px = **328px**

### 色指定

- **背景色**: #FFFFFF（白）
- **テキスト色**: #1100FA（青）
- **フォント**: Courier New, monospace

### XMLエスケープ

ASCII文字列に含まれる可能性のある特殊文字をエスケープ：
- `&` → `&amp;`
- `<` → `&lt;`
- `>` → `&gt;`
- `"` → `&quot;`
- `'` → `&apos;`

### base64エンコード

```javascript
const base64 = btoa(unescape(encodeURIComponent(svgContent)));
const dataUrl = `data:image/svg+xml;base64,${base64}`;
```

## ボタンデザイン仕様

### シャッターボタン

**構造**:
- 外円: 70px × 70px、border 4px solid #FFFFFF
- 内円: 60px × 60px、background #FFFFFF
- 中央配置（position: absolute, left: 50%, transform: translateX(-50%)）

**インタラクション**:
- ホバー: なし（シンプルに保つ）
- アクティブ: 内円が0.9倍にscale
- 無効時: opacity 0.5、cursor not-allowed

**レスポンシブ**:
- モバイル（768px以下）: 60px × 60px（内円50px）

### 削除ボタン

**構造**:
- サイズ: 48px × 48px
- 背景: #FFFFFF、border-radius 50%
- アイコン: ゴミ箱SVG、24px × 24px、fill #1100FA
- 右下配置（position: absolute, bottom: 40px, right: 40px）

**インタラクション**:
- ホバー: scale(1.1)、box-shadow
- アクティブ: なし（ホバーのみ）

**レスポンシブ**:
- モバイル（768px以下）: 40px × 40px（アイコン20px）

### ゴミ箱アイコンSVG

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
</svg>
```

## デザインシステム

### カラーパレット

- **プライマリカラー**: #1100FA（青）
  - 用途: 背景、テキスト、アイコン
- **セカンダリカラー**: #FFFFFF（白）
  - 用途: ボタン、ASCII背景、アイコン背景

### タイポグラフィ

- **ASCIIテキスト**: Courier New, 10px, line-height 6px
- **その他**: システムフォント

### レイアウト

- **カメラコンテナ**: min-height 80vh、中央配置
- **ボタン配置**: absolute positioning
- **シャッターボタン**: bottom 40px（モバイル: 20px）
- **削除ボタン**: bottom 40px, right 40px（モバイル: 20px）

## 技術実装詳細

### 状態管理

```typescript
// 表示モード
const [mode, setMode] = useState<'camera' | 'preview'>('camera');

// SVG画像のdata URL
const [svgDataUrl, setSvgDataUrl] = useState<string | null>(null);

// p5.jsからのASCII文字列取得用
const currentASCIIRef = useRef<string>('');
```

### p5.jsとの連携

**課題**: p5.jsのdraw()ループ内でReact stateを更新すると無限ループのリスク

**解決策**: useRefを使用
```typescript
p5.draw = () => {
  // ASCII生成
  let asciiImage = "";
  // ... ピクセル走査とASCII変換 ...

  // Refに保存（state更新なし）
  currentASCIIRef.current = asciiImage;

  // DOMに表示
  asciiDiv.html(asciiImage);
};
```

### イベントハンドラ

**シャッターボタン**:
```typescript
const handleShutter = useCallback(() => {
  if (!currentASCIIRef.current || isLoading || error) {
    return; // 無効状態では何もしない
  }

  try {
    const svgUrl = generateSVGDataUrl(currentASCIIRef.current);
    setSvgDataUrl(svgUrl);
    setMode('preview');
  } catch (err) {
    console.error('Capture error:', err);
  }
}, [isLoading, error, generateSVGDataUrl]);
```

**削除ボタン**:
```typescript
const handleDelete = useCallback(() => {
  setSvgDataUrl(null);
  setMode('camera');
}, []);
```

### パフォーマンス最適化

- SVG生成関数を`useCallback`でメモ化
- プレビューモード時もp5.jsの描画継続（リアルタイム復帰のため）
- 大きなSVG文字列の生成は一度だけ（キャプチャ時のみ）

### エラーハンドリング

1. **カメラ未起動**: シャッターボタンを無効化
2. **SVG生成失敗**: try-catchでエラーキャッチ、コンソールログ出力
3. **空のASCII文字列**: 早期return

### ブラウザ互換性

- **btoa()**: 全モダンブラウザでサポート
- **SVG `<text>`**: 全モダンブラウザでサポート
- **base64 data URL**: 全モダンブラウザでサポート

## 参考実装

- **iPhoneカメラアプリ**: シャッターボタンのデザインと挙動
- **base.camera**: カメラウェブアプリのUXフロー

## 検証項目

実装後に以下を確認：

- [ ] シャッターボタンが中央下部に正しく表示される
- [ ] ボタン押下でプレビューモードに遷移する
- [ ] SVG画像が正しく生成される
- [ ] SVG画像がimg要素で正しく表示される
- [ ] ASCII文字が正しくレンダリングされる（文字化けなし）
- [ ] 削除ボタンが右下に正しく表示される
- [ ] 削除ボタン押下でカメラモードに戻る
- [ ] カメラ起動中はシャッターボタンが無効化される
- [ ] エラー時にシャッターボタンが無効化される
- [ ] レスポンシブ対応が正しく動作する
- [ ] モバイルでタッチ操作が正常に動作する
- [ ] 背景色が#1100FAに統一されている

## 将来の拡張性

### 可能な機能追加

1. **画像ダウンロード**
   - SVGファイルのダウンロード機能
   - PNG形式への変換機能

2. **複数枚撮影**
   - ギャラリー機能
   - サムネイル表示

3. **NFT連携**
   - キャプチャした画像をNFTとしてミント
   - MintNFTコンポーネントとの統合

4. **エフェクト追加**
   - 異なる密度文字列の選択
   - カラーバリエーション
   - フィルター機能

5. **シェア機能**
   - SNSへの共有
   - URLでの画像共有

## 制約事項

- SVG生成はクライアントサイドのみ（サーバーサイド処理なし）
- 画像はメモリ上に保持（ローカルストレージやDBへの保存なし）
- 1枚のみ保持（複数枚のギャラリー機能なし）
- ダウンロード機能なし（将来の拡張として残す）
