let capture;
let font;
let letters = " .,;xe$"; // palette caratteri
// let letters = "_|";      // palette alternativa
let charW = 8;           // larghezza cella caratteri
let charH = 12;          // altezza cella caratteri
let captureReady = false;

async function setup() {
  createCanvas(640, 480);
  
  // フォントを非同期で読み込み
  try {
    font = await loadFont("Inconsolata-Regular.ttf");
    textFont(font, 16);
  } catch(e) {
    console.log("Font not loaded, using default");
    textSize(16);
  }
  
  fill(255);
  
  capture = createCapture(VIDEO);
  capture.size(floor(width / charW), floor(height / charH));
  capture.hide();
  
  // カメラの準備ができるまで待つ
  setTimeout(function() {
    captureReady = true;
  }, 1500);
}

function draw() {
  try {
    background(0);
    
    // カメラの準備ができていない場合は処理をスキップ
    if (!captureReady || !capture || capture.width === 0 || capture.height === 0) {
      push();
      fill(255);
      noStroke();
      textAlign(CENTER, CENTER);
      // 文字列リテラルとして直接描画
      let msg = "Loading camera...";
      for (let i = 0; i < msg.length; i++) {
        let c = msg.charAt(i);
        text(String(c), width / 2 - 80 + i * 10, height / 2);
      }
      pop();
      return;
    }
    
    capture.loadPixels();
    
    // ピクセルデータが利用可能かチェック
    if (!capture.pixels || capture.pixels.length === 0) {
      return;
    }
    
    // 描画設定
    fill(255);
    noStroke();
    textAlign(LEFT, BASELINE);
    
    // Y座標オフセット
    let offsetY = 9;
    
    for (let y = 0; y < capture.height; y++) {
      for (let x = 0; x < capture.width; x++) {
        let iPix = (x + y * capture.width) * 4;
        
        // 配列の範囲チェック
        if (iPix + 2 >= capture.pixels.length) {
          continue;
        }
        
        let r = capture.pixels[iPix] || 0;
        let g = capture.pixels[iPix + 1] || 0;
        let b = capture.pixels[iPix + 2] || 0;
        
        let lum = r + g + b;
        let tone = map(lum, 0, 765, 0, letters.length - 1);
        tone = floor(constrain(tone, 0, letters.length - 1));
        
        let ch = letters.charAt(tone);
        
        // 空白以外を描画、Stringオブジェクトとして明示的に変換
        if (ch && ch !== ' ') {
          text(String(ch), x * charW, y * charH + offsetY);
        }
      }
    }
  } catch(e) {
    // エラーをキャッチして続行
    console.error("Draw error:", e);
    noLoop(); // エラーが続く場合はループを停止
  }
}
