# ASCIIカメラ機能仕様書

## 概要
p5.jsを使用したリアルタイムASCII変換カメラ機能の仕様書

## 機能要件
- ウェブカメラからのビデオキャプチャ
- 64x48ピクセルへのリサイズ
- 明度ベースのASCII変換
- リアルタイム表示(約30fps)

## 技術仕様

### 使用ライブラリ
- **p5.js**: クライアントサイドグラフィックスライブラリ
- **@p5-wrapper/react**: Next.js統合用の公式Reactラッパー
- **統合方法**: ReactP5Wrapperコンポーネント + sketch関数パターン

### ASCII変換パラメータ
- **密度文字列**: `"0xb0dc294088cf10a0dbfad35f4bf01ac9b43db54065f961ee21d3d9e7d7bbcdbf"`
- **閾値**: 0.375(明るさフィルター)
- **ビデオサイズ**: 64x48ピクセル
- **フレームレート**: デフォルト(約30fps)

### アルゴリズム
1. カメラからビデオキャプチャを取得
2. 各ピクセルのRGB値を読み取り
3. 平均値で明度を計算: `(r + g + b) / 3 / 255`
4. 閾値0.375以上の場合、密度文字列から文字を選択
5. 閾値未満の場合、スペース文字を出力

## UI/UXデザイン

### カラーパレット
- **ASCII文字色**: #1100FA(鮮やかな青)
- **背景色**: #FFFFFF(白)
- **ミニマルデザイン**: 2色のみで構成

### タイポグラフィ
- **フォントファミリー**: `'Courier New', Courier, monospace`
- **フォントサイズ**: 8-10px
- **行高**: 8-10px
- **文字間隔**: 0(letter-spacing: 0)

### レイアウト
- ページ最上部に全画面配置
- レスポンシブ対応(モバイル/デスクトップ)

## セキュリティとプライバシー

### カメラアクセス
- ブラウザの`getUserMedia` APIを使用
- ユーザーの明示的な承認が必須
- 権限拒否時は適切なエラーメッセージを表示

### データ処理
- ビデオストリームはローカル処理のみ
- サーバーへの送信なし
- プライバシー保護

## エラーハンドリング

### エラーケース
1. **カメラアクセス拒否**: 「カメラへのアクセスが拒否されました」
2. **カメラデバイスなし**: 「カメラが見つかりませんでした」
3. **p5.js読み込み失敗**: 「カメラの読み込みに失敗しました」
4. **ブラウザ非対応**: 「お使いのブラウザはカメラをサポートしていません」

### エラー表示
- ユーザーフレンドリーなメッセージ
- 日本語表示
- エラー時の代替UI提供

## パフォーマンス考慮事項

### 最適化
- 64x48ピクセルの低解像度で軽量化(3,072ピクセル)
- `draw()`関数は約30fpsで実行
- メモリ使用量: 約5-10MB(ビデオストリーム含む)

### ベンチマーク目標
- **フレームレート**: 25-30 fps
- **初期ロード時間**: < 2秒
- **CPU使用率**: < 15%

### クリーンアップ
- ReactP5Wrapperが自動的にp5インスタンスを管理
- コンポーネントアンマウント時に自動クリーンアップ
- ビデオストリームの適切な停止処理
- メモリリーク防止

## 実装ガイドライン

### コンポーネント構成
- **ファイル**: `app/components/ASCIICamera.tsx`
- **スタイル**: `app/components/ASCIICamera.module.css`
- **パターン**: 関数コンポーネント + ReactP5Wrapper + sketch関数

### 依存関係
```bash
npm install @p5-wrapper/react
npm install --save-dev @types/p5
```

**注意**: `@p5-wrapper/react`はp5.jsを内部依存として含むため、p5.jsの個別インストールは不要です。

### コード例(骨格)
```typescript
"use client";
import { ReactP5Wrapper, Sketch } from "@p5-wrapper/react";
import { useState } from "react";

export function ASCIICamera() {
  const [error, setError] = useState<string | null>(null);

  const sketch: Sketch = (p5) => {
    let video: any;
    let asciiDiv: any;
    const density = "0xb0dc294088cf10a0dbfad35f4bf01ac9b43db54065f961ee21d3d9e7d7bbcdbf";
    
    p5.setup = () => {
      p5.noCanvas();
      
      // カメラキャプチャ
      video = p5.createCapture(p5.VIDEO, () => {
        video.size(64, 48);
        video.hide();
      });
      
      // ASCII表示用div
      asciiDiv = p5.createDiv();
      asciiDiv.style('font-family', "'Courier New', Courier, monospace");
      asciiDiv.style('font-size', '10px');
      asciiDiv.style('line-height', '10px');
      asciiDiv.style('letter-spacing', '0');
      asciiDiv.style('color', '#1100FA');
      asciiDiv.style('background-color', '#FFFFFF');
    };
    
    p5.draw = () => {
      video.loadPixels();
      let asciiImage = '';
      
      for (let j = 0; j < video.height; j++) {
        for (let i = 0; i < video.width; i++) {
          const pixelIndex = (i + j * video.width) * 4;
          const r = video.pixels[pixelIndex];
          const g = video.pixels[pixelIndex + 1];
          const b = video.pixels[pixelIndex + 2];
          const avg = (r + g + b) / 3;
          const brightness = avg / 255;
          
          if (brightness > 0.375) {
            const charIndex = p5.floor(p5.map(brightness, 0.375, 1, 0, density.length - 1));
            asciiImage += density.charAt(charIndex);
          } else {
            asciiImage += ' ';
          }
        }
        asciiImage += '<br/>';
      }
      
      asciiDiv.html(asciiImage);
    };
  };

  if (error) {
    return <div style={{ padding: '20px', color: 'red' }}>{error}</div>;
  }

  return <ReactP5Wrapper sketch={sketch} />;
}
```

### @p5-wrapper/reactの利点
1. **SSR/SSG対応**: Next.jsの`use client`ディレクティブと完全互換
2. **自動クリーンアップ**: コンポーネントアンマウント時の自動処理
3. **型安全性**: TypeScript完全サポート
4. **シンプルなAPI**: Dynamic Importの複雑さを排除
5. **公式メンテナンス**: p5.jsコミュニティによる継続的サポート

### 重要な実装ノート
- コンポーネントファイルの先頭に`"use client"`ディレクティブを必ず追加
- sketch関数内で`p5.setup()`と`p5.draw()`を定義
- `p5.noCanvas()`を使用してデフォルトのcanvas要素を無効化
- video要素は`video.hide()`で非表示にし、ASCII表示のみを使用
- エラーハンドリングはsketch関数外のReactコンポーネントレベルで実装

## 今後の拡張案
- スナップショット機能(ASCII画像のキャプチャ)
- ASCIIをNFTとしてミント(MintNFTとの連携)
- フィルター追加(色反転、コントラスト調整)
- 密度文字列のカスタマイズ
- 解像度の動的変更
- Reactのprops経由でsketch関数にパラメータを渡す機能

## 参考リソース
- [@p5-wrapper/react公式ドキュメント](https://github.com/P5-wrapper/react)
- [Next.js統合ガイド](https://github.com/P5-wrapper/next)
- [p5.js公式ドキュメント](https://p5js.org/)
- [p5.js createCapture](https://p5js.org/reference/#/p5/createCapture)
- [MDN - getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
