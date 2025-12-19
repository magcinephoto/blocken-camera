"use client";
import { P5Canvas, Sketch } from "@p5-wrapper/react";
import { useState, useCallback, useRef } from "react";
import styles from "./ASCIICamera.module.css";

export function ASCIICamera() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<'camera' | 'preview'>('camera');
  const [svgDataUrl, setSvgDataUrl] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [sketchKey, setSketchKey] = useState(0);
  const currentASCIIRef = useRef<string>('');

  // SVG生成関数
  const generateSVGDataUrl = useCallback((asciiText: string): string => {
    const lines = asciiText.split('\n').filter(line => line.length > 0);

    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="340" height="328">`;
    svgContent += `<rect width="100%" height="100%" fill="#FFFFFF"/>`;

    lines.forEach((line, index) => {
      const y = 20 + (index * 4.8);
      const escapedLine = line
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
      svgContent += `<text x="20" y="${y}" font-family="'Courier New', monospace" font-size="8px" fill="#1100FA" letter-spacing="0">${escapedLine}</text>`;
    });

    svgContent += `</svg>`;

    const base64 = btoa(unescape(encodeURIComponent(svgContent)));
    return `data:image/svg+xml;base64,${base64}`;
  }, []);

  // シャッターボタンハンドラ
  const handleShutter = useCallback(() => {
    if (!currentASCIIRef.current || isLoading || error) {
      return;
    }

    try {
      const svgUrl = generateSVGDataUrl(currentASCIIRef.current);
      setSvgDataUrl(svgUrl);
      setMode('preview');
    } catch (err) {
      console.error('Capture error:', err);
    }
  }, [isLoading, error, generateSVGDataUrl]);

  // 削除ボタンハンドラ
  const handleDelete = useCallback(() => {
    setSvgDataUrl(null);
    setMode('camera');
  }, []);

  // カメラ切り替えハンドラ
  const handleToggleCamera = useCallback(() => {
    setIsLoading(true);
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    setSketchKey(prev => prev + 1);
  }, []);

  const sketch: Sketch = useCallback((p5) => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    let video: any;
    let asciiDiv: any;
    let graphics: any; // グラフィックスバッファ
    /* eslint-enable @typescript-eslint/no-explicit-any */

    // 仕様書の定義に従う
    //const density = "0xb0dc294088cf10a0dbfad35f4bf01ac9b43db54065f961ee21d3d9e7d7bbcdbf";
    const density = "Ñ@#W$9876543210?!abc;:+=-,._          ";
    const threshold = 0.375;
    const videoWidth = 50;
    const videoHeight = 50; // 1:1の縦横比

    p5.setup = () => {
      p5.noCanvas(); // デフォルトキャンバスを無効化

      // グラフィックスバッファを作成（ピクセルデータ取得用）
      graphics = p5.createGraphics(videoWidth, videoHeight);

      // カメラキャプチャの設定
      video = p5.createCapture({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: videoWidth },
          height: { ideal: videoHeight }
        },
        audio: false
      }, () => {
        video.size(videoWidth, videoHeight);
        video.hide();
        setIsLoading(false);
      });

      // エラーハンドリング用のイベントリスナーを追加
      if (video.elt) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        video.elt.addEventListener("error", (err: any) => {
          console.error("Camera error:", err);
          // カメラ切り替え失敗の場合は元に戻す
          setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
          setError("カメラの切り替えに失敗しました。このデバイスではこのカメラが利用できない可能性があります。");
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
      asciiDiv.style("font-size", "8px");
      asciiDiv.style("line-height", "4.8px"); // 等幅フォントの文字幅に合わせて縦横比を1:1に
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

          // 通常の
          //const charIndex = p5.floor(
          //  p5.map(brightness, threshold, 1, 0, density.length - 1)
          //);
          //asciiImage += density.charAt(charIndex);

          // 2値化
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

      // Refに保存（シャッター用）
      currentASCIIRef.current = asciiImage;

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
  }, [facingMode]);

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
      <div className={styles.cameraContainer}>
        {mode === 'camera' ? (
          <>
            <div className={styles.asciiWrapper}>
              <P5Canvas sketch={sketch} key={sketchKey} />
            </div>
            <button
              className={styles.flipButton}
              onClick={handleToggleCamera}
              disabled={isLoading || Boolean(error)}
              aria-label="カメラ切り替え"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#1100FA" strokeWidth="2">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                <path d="M21 3v5h-5"/>
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                <path d="M3 21v-5h5"/>
              </svg>
            </button>
            <button
              className={styles.shutterButton}
              onClick={handleShutter}
              disabled={isLoading || Boolean(error)}
              aria-label="シャッター"
            />
          </>
        ) : (
          <>
            {svgDataUrl && (
              <img
                src={svgDataUrl}
                alt="Captured ASCII Art"
                className={styles.previewImage}
              />
            )}
            <button
              className={styles.deleteButton}
              onClick={handleDelete}
              aria-label="削除"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
