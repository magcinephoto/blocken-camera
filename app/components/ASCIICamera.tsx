"use client";
import { P5Canvas, Sketch } from "@p5-wrapper/react";
import { useState, useCallback, useRef } from "react";
import styles from "./ASCIICamera.module.css";
import { BlockenMintNFT } from "./BlockenMintNFT";

export function ASCIICamera() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<'camera' | 'preview'>('camera');
  const [svgDataUrl, setSvgDataUrl] = useState<string | null>(null);
  const currentASCIIRef = useRef<string>('');

  // SVG文字列抽出関数
  const extractSvgString = useCallback((svgDataUrl: string): string => {
    // "data:image/svg+xml;base64,XXXXX" からXXXXXを抽出してデコード
    const base64Data = svgDataUrl.split(',')[1];
    return atob(base64Data);
  }, []);

  // SVG生成関数
  const generateSVGDataUrl = useCallback((asciiText: string): string => {
    const lines = asciiText.split('\n').filter(line => line.length > 0);

    // 動的サイズ計算の定数
    const fontSize = 8;
    const lineHeight = 4.8;
    const padding = 20;
    const charWidth = 4.8; // Courier Newの文字幅（フォントサイズと同じ比率）

    // SVGサイズを動的に計算
    const maxLineLength = Math.max(...lines.map(line => line.length));
    const svgWidth = Math.ceil(maxLineLength * charWidth + (padding * 2));
    const svgHeight = Math.ceil(lines.length * lineHeight + (padding * 2));

    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}">`;
    svgContent += `<rect width="100%" height="100%" fill="#FFFFFF"/>`;

    lines.forEach((line, index) => {
      const y = padding + (index * lineHeight);
      const escapedLine = line
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
      svgContent += `<text x="${padding}" y="${y}" font-family="'Inconsolata', 'Courier New', monospace" font-size="${fontSize}px" fill="#1100FA" letter-spacing="0" dominant-baseline="hanging">${escapedLine}</text>`;
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

  const sketch: Sketch = useCallback((p5) => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    let video: any;
    let font: any;
    let fontLoaded = false;
    let captureCanvas: any; // ビデオからピクセルを取得するための隠しキャンバス
    let captureContext: any;
    /* eslint-enable @typescript-eslint/no-explicit-any */

    // sampleAscii.jsから採用
    const letters = " .,;xe$";
    const videoWidth = 50;
    const videoHeight = 50; // 1:1の縦横比
    const charW = 8;  // 文字幅
    const charH = 12; // 文字高さ
    const canvasWidth = videoWidth * charW;   // 400px
    const canvasHeight = videoHeight * charH;  // 600px

    p5.setup = async () => {
      // スマホ対応：画面幅に応じてキャンバスサイズを調整
      const maxWidth = Math.min(p5.windowWidth - 40, 400);
      const aspectRatio = canvasHeight / canvasWidth;
      const actualWidth = maxWidth;
      const actualHeight = maxWidth * aspectRatio;

      // キャンバスを作成（sampleAscii.jsのアプローチ）
      p5.createCanvas(actualWidth, actualHeight);

      // ネイティブのCanvasでビデオからピクセルを取得（createGraphicsの代わり）
      captureCanvas = document.createElement('canvas');
      captureCanvas.width = videoWidth;
      captureCanvas.height = videoHeight;
      captureContext = captureCanvas.getContext('2d', { willReadFrequently: true });

      // フォントを非同期で読み込み（sampleAscii.jsと同じアプローチ）
      try {
        font = await p5.loadFont('/fonts/Inconsolata-Regular.ttf');
        fontLoaded = true;
      } catch (e) {
        console.log('Font not loaded, using default:', e);
      }

      // フォントサイズをキャンバスサイズに応じてスケーリング
      const scaleX = actualWidth / canvasWidth;
      const fontSize = 16 * scaleX;

      if (font) {
        p5.textFont(font, fontSize);
      } else {
        p5.textSize(fontSize);
      }

      p5.fill('#1100FA'); // 青色
      p5.background('#FFFFFF'); // 白背景

      // カメラキャプチャの設定
      video = p5.createCapture({
        video: {
          facingMode: { ideal: 'environment' },
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
          setError("カメラへのアクセスに失敗しました。このデバイスではカメラが利用できない可能性があります。");
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
    };

    p5.draw = () => {
      try {
        // ビデオが準備できているか確認
        if (!video || !video.elt) return;
        if (video.elt.readyState < 2) return; // HAVE_CURRENT_DATA (2) 以上を待つ

        // 毎フレーム背景をクリア
        p5.background('#FFFFFF');

        // ネイティブCanvasにビデオを描画してピクセルデータを取得
        captureContext.drawImage(video.elt, 0, 0, videoWidth, videoHeight);
        const imageData = captureContext.getImageData(0, 0, videoWidth, videoHeight);
        if (!imageData || !imageData.data || imageData.data.length === 0) return;

        // キャンバスサイズに応じたスケール係数を計算
        const scaleX = p5.width / canvasWidth;
        const scaleY = p5.height / canvasHeight;

        // テキスト描画設定
        p5.fill('#1100FA');
        p5.noStroke();
        p5.textAlign(p5.LEFT, p5.BASELINE);

        let asciiImage = "";
        const offsetY = 9 * scaleY; // Y座標オフセット（スケーリング適用）

        for (let j = 0; j < videoHeight; j++) {
          for (let i = 0; i < videoWidth; i++) {
            const pixelIndex = (i + j * videoWidth) * 4;

            // 配列の範囲チェック
            if (pixelIndex + 2 >= imageData.data.length) {
              continue;
            }

            const r = imageData.data[pixelIndex] || 0;
            const g = imageData.data[pixelIndex + 1] || 0;
            const b = imageData.data[pixelIndex + 2] || 0;

            const avg = (r + g + b) / 3;
            const brightness = avg / 255;

            // lettersパレットを使用
            const charIndex = p5.floor(
              p5.map(brightness, 0, 1, 0, letters.length - 1)
            );
            const ch = letters.charAt(charIndex);

            // キャンバスに文字を描画（スケーリング適用）
            if (ch && ch !== ' ') {
              p5.text(String(ch), i * charW * scaleX, j * charH * scaleY + offsetY);
            }

            asciiImage += ch;
          }
          asciiImage += "\n";
        }

        // Refに保存（シャッター用）
        currentASCIIRef.current = asciiImage;
      } catch (e) {
        // エラーをキャッチして続行
        console.error('Draw error:', e);
      }
    };

    // ウィンドウリサイズ時の対応
    p5.windowResized = () => {
      const maxWidth = Math.min(p5.windowWidth - 40, 400);
      const aspectRatio = canvasHeight / canvasWidth;
      const actualWidth = maxWidth;
      const actualHeight = maxWidth * aspectRatio;
      p5.resizeCanvas(actualWidth, actualHeight);

      // フォントサイズも再調整
      const scaleX = actualWidth / canvasWidth;
      const fontSize = 16 * scaleX;

      if (font) {
        p5.textFont(font, fontSize);
      } else {
        p5.textSize(fontSize);
      }
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
      // captureCanvasを削除
      if (captureCanvas) {
        captureCanvas.remove();
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
      <div className={styles.cameraContainer}>
        {mode === 'camera' ? (
          <>
            <div className={styles.asciiWrapper}>
              <P5Canvas sketch={sketch} />
            </div>
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
              <>
                <img
                  src={svgDataUrl}
                  alt="Captured ASCII Art"
                  className={styles.previewImage}
                />
                <div className={styles.mintButtonWrapper}>
                  <BlockenMintNFT svgData={extractSvgString(svgDataUrl)} />
                </div>
              </>
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
