"use client";
import { P5Canvas, Sketch } from "@p5-wrapper/react";
import { useState, useCallback } from "react";
import styles from "./ASCIICamera.module.css";

export function ASCIICamera() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const sketch: Sketch = useCallback((p5) => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    let video: any;
    let asciiDiv: any;
    let graphics: any; // グラフィックスバッファ
    /* eslint-enable @typescript-eslint/no-explicit-any */

    // 仕様書の定義に従う
    const density = "0xb0dc294088cf10a0dbfad35f4bf01ac9b43db54065f961ee21d3d9e7d7bbcdbf";
    const threshold = 0.375;
    const videoWidth = 64;
    const videoHeight = 64; // 1:1の縦横比

    p5.setup = () => {
      p5.noCanvas(); // デフォルトキャンバスを無効化

      // グラフィックスバッファを作成（ピクセルデータ取得用）
      graphics = p5.createGraphics(videoWidth, videoHeight);

      // カメラキャプチャの設定
      video = p5.createCapture(p5.VIDEO, () => {
        video.size(videoWidth, videoHeight);
        video.hide();
        setIsLoading(false);
      });

      // エラーハンドリング用のイベントリスナーを追加
      if (video.elt) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        video.elt.addEventListener("error", (err: any) => {
          console.error("Camera error:", err);
          setError("カメラの読み込みに失敗しました。");
          setIsLoading(false);
        });

        // getUserMediaのエラーを捕捉（ストリーム取得後）
        setTimeout(() => {
          if (video.elt.srcObject) {
            const tracks = video.elt.srcObject.getTracks();
            if (tracks.length > 0) {
              tracks[0].addEventListener("ended", () => {
                setError("カメラへのアクセスが停止されました。");
              });
            }
          }
        }, 100);
      }

      // タイムアウト処理を追加（カメラが起動しない場合）
      setTimeout(() => {
        if (!video || !video.elt || !video.elt.srcObject) {
          setError(
            "カメラへのアクセスに失敗しました。ブラウザの設定を確認してください。"
          );
          setIsLoading(false);
        }
      }, 5000);

      // ASCII 表示用の div 要素を作成
      asciiDiv = p5.createDiv();
      // 仕様書通りのスタイル設定
      asciiDiv.style("font-family", "'Courier New', Courier, monospace");
      asciiDiv.style("font-size", "10px");
      asciiDiv.style("line-height", "6px"); // 等幅フォントの文字幅に合わせて縦横比を1:1に
      asciiDiv.style("letter-spacing", "0");
      asciiDiv.style("color", "#1100FA"); // 青色
      asciiDiv.style("background-color", "#FFFFFF"); // 白背景
      asciiDiv.style("padding", "20px");
      asciiDiv.style("white-space", "pre");
      asciiDiv.style("overflow", "hidden");
      asciiDiv.style("border-radius", "8px");
    };

    p5.draw = () => {
      // ビデオが準備できているか確認
      if (!video || !video.elt) return;
      if (video.elt.readyState < 2) return; // HAVE_CURRENT_DATA (2) 以上を待つ

      // ビデオをgraphicsバッファに描画
      graphics.image(video, 0, 0, videoWidth, videoHeight);

      // graphicsからピクセルデータを取得
      graphics.loadPixels();
      if (!graphics.pixels || graphics.pixels.length === 0) return;

      let asciiImage = "";

      // 64x48 ピクセルを走査
      for (let j = 0; j < videoHeight; j++) {
        for (let i = 0; i < videoWidth; i++) {
          const pixelIndex = (i + j * videoWidth) * 4;
          const r = graphics.pixels[pixelIndex];
          const g = graphics.pixels[pixelIndex + 1];
          const b = graphics.pixels[pixelIndex + 2];

          // 明度計算（仕様書通り）
          const avg = (r + g + b) / 3;
          const brightness = avg / 255;

          // 閾値判定と文字選択
          if (brightness > threshold) {
            const charIndex = p5.floor(
              p5.map(brightness, threshold, 1, 0, density.length - 1)
            );
            asciiImage += density.charAt(charIndex);
          } else {
            asciiImage += " ";
          }
        }
        asciiImage += "\n";
      }

      asciiDiv.html(asciiImage);
    };

    // クリーンアップ処理
    return () => {
      // ビデオストリームを停止
      if (video && video.elt && video.elt.srcObject) {
        const tracks = video.elt.srcObject.getTracks();
        tracks.forEach((track: MediaStreamTrack) => track.stop());
      }
      // ビデオ要素を削除
      if (video && video.remove) {
        video.remove();
      }
      // ASCII表示用divを削除
      if (asciiDiv && asciiDiv.remove) {
        asciiDiv.remove();
      }
      // グラフィックスバッファを削除
      if (graphics && graphics.remove) {
        graphics.remove();
      }
    };
  }, []);

  // エラー UI
  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorIcon}>⚠️</div>
        <h2 className={styles.errorTitle}>カメラエラー</h2>
        <p className={styles.errorMessage}>{error}</p>
        <button
          className={styles.retryButton}
          onClick={() => window.location.reload()}
        >
          再試行
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {isLoading && (
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p className={styles.loadingText}>カメラを起動中...</p>
        </div>
      )}
      <div className={styles.asciiWrapper}>
        <P5Canvas sketch={sketch} />
      </div>
    </div>
  );
}
