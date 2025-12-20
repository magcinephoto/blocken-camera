/**
 * ASCIIパレット選択とdensity変換のユーティリティ関数
 *
 * Baseチェーンのトランザクションハッシュから以下を生成:
 * 1. 7つのASCIIパレットから1つを選択
 * 2. ハッシュベースのdensity変換関数（ノイズ適用）
 * 3. 虹の7色を使ったカラーモード
 */

// 7つのASCIIパレット定義
export const ASCII_PALETTES = [
  " .'`^\",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
  " .,:;irsXA253hMHN$#",
  " ░▒▓█▄▀■▌▐",
  " .-/\\|<>v^<>o*+xX%#&@",
  "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`'. ",
  " .:-=+*#%@",
  "Ñ@#W$9876543210?!abc;:+=-,._          "
] as const;

// 虹の7色定義（RGB形式）
export const RAINBOW_COLORS = [
  { r: 255, g: 0, b: 0 },     // 赤 (Red)
  { r: 255, g: 127, b: 0 },   // 橙 (Orange)
  { r: 255, g: 255, b: 0 },   // 黄 (Yellow)
  { r: 0, g: 255, b: 0 },     // 緑 (Green)
  { r: 0, g: 0, b: 255 },     // 青 (Blue)
  { r: 75, g: 0, b: 130 },    // 藍 (Indigo)
  { r: 148, g: 0, b: 211 }    // 紫 (Violet)
] as const;

export type ColorMode = 'rainbow' | 'monochrome';

export interface PaletteSelection {
  palette: string;
  colorMode: ColorMode;
  densityModifier: (brightness: number, x: number, y: number) => number;
  getColor: (charIndex: number) => { r: number; g: number; b: number };
}

/**
 * トランザクションハッシュからパレットを選択し、density変換関数を生成
 *
 * @param txHash - トランザクションハッシュ (例: "0xb0dc294088cf10a0dbfad35f4bf01ac9b43db54065f9")
 * @returns パレット、カラーモード、density変換関数、色取得関数
 *
 * @example
 * const selection = selectPaletteFromHash("0xb0dc294088...");
 * console.log(selection.palette); // 選択されたASCII文字列
 * console.log(selection.colorMode); // 'rainbow' or 'monochrome'
 * const modifiedBrightness = selection.densityModifier(0.5, 10, 20);
 * const color = selection.getColor(5); // { r, g, b }
 */
export function selectPaletteFromHash(txHash: string): PaletteSelection {
  // "0x"プレフィックスを除去
  const cleanHash = txHash.replace(/^0x/, '');

  // TxHashの文字（0-9, a-f）を8番目のパレットとして作成
  const txHashPalette = cleanHash.length > 0 ? cleanHash : '0123456789abcdef';
  const extendedPalettes = [...ASCII_PALETTES, txHashPalette];

  // 最初の1文字でパレットを選択 (0-f → 0-15 → 0-7にマッピング)
  const firstChar = cleanHash.charAt(0);
  const firstValue = parseInt(firstChar, 16); // 0-15
  const paletteIndex = firstValue % extendedPalettes.length; // 0-7
  const selectedPalette = extendedPalettes[paletteIndex];

  // 2番目の文字でカラーモードを決定（偶数=rainbow、奇数=monochrome）
  const secondChar = cleanHash.charAt(1) || '0';
  const secondValue = parseInt(secondChar, 16); // 0-15
  const colorMode: ColorMode = secondValue % 2 === 0 ? 'rainbow' : 'monochrome';

  // ハッシュ全体をdensity変換のシード値として使用
  // 各文字を数値配列に変換 (0-15の範囲)
  const hashValues = cleanHash.split('').map(char => {
    const value = parseInt(char, 16);
    // 無効な文字（16進数以外）の場合は0を返す
    return isNaN(value) ? 0 : value;
  });

  /**
   * brightness値にハッシュベースのノイズを適用
   *
   * @param brightness - 元のbrightness値 (0-1)
   * @param x - ピクセルのx座標
   * @param y - ピクセルのy座標
   * @returns 修正されたbrightness値 (0-1の範囲)
   *
   * アルゴリズム:
   * 1. ピクセル座標からハッシュ配列のインデックスを計算
   * 2. ハッシュ値を0-1に正規化してノイズとして使用
   * 3. 元のbrightness値にノイズを10%の割合で適用
   */
  const densityModifier = (brightness: number, x: number, y: number): number => {
    // 座標からハッシュ配列のインデックスを計算
    // 50はvideoWidthと一致（ASCIICamera.tsx:88）
    const index = (x + y * 50) % hashValues.length;
    const hashNoise = hashValues[index] / 15; // 0-1に正規化

    // ノイズを適用 (ハッシュの影響度: 10%)
    const noiseFactor = 0.1;
    const modifiedBrightness = brightness * (1 - noiseFactor) + hashNoise * noiseFactor;

    // 0-1の範囲にクランプ
    return Math.max(0, Math.min(1, modifiedBrightness));
  };

  /**
   * 文字インデックスから色を取得
   *
   * @param charIndex - パレット内の文字インデックス (0からpalette.length-1)
   * @returns RGB色オブジェクト
   *
   * カラーモードによって動作が変わる:
   * - rainbow: 虹の7色から循環的に選択
   * - monochrome: 常に白色を返す
   */
  const getColor = (charIndex: number): { r: number; g: number; b: number } => {
    if (colorMode === 'monochrome') {
      // モノクロモード: 白色
      return { r: 255, g: 255, b: 255 };
    }

    // レインボーモード: 虹の7色から循環的に選択
    const colorIndex = charIndex % RAINBOW_COLORS.length;
    return RAINBOW_COLORS[colorIndex];
  };

  return {
    palette: selectedPalette,
    colorMode,
    densityModifier,
    getColor
  };
}

/**
 * フォールバック用のデフォルトパレット選択
 * APIエラー時や開発環境でトランザクションハッシュが取得できない場合に使用
 *
 * @returns デフォルトのパレット選択（ノイズなし、モノクロモード）
 */
export function getDefaultPalette(): PaletteSelection {
  return {
    palette: ASCII_PALETTES[0], // 最初のパレットをデフォルトとする
    colorMode: 'monochrome', // デフォルトはモノクロ
    densityModifier: (brightness: number) => brightness, // ノイズなし
    getColor: () => ({ r: 255, g: 255, b: 255 }) // 常に白色
  };
}

/**
 * RGB色を16進数カラーコードに変換
 *
 * @param r - 赤成分 (0-255)
 * @param g - 緑成分 (0-255)
 * @param b - 青成分 (0-255)
 * @returns 16進数カラーコード (例: "#FF7F00")
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = n.toString(16).toUpperCase();
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * RAINBOW_COLORSを16進数形式で取得
 * SVGサイズを削減するため、事前に計算された16進数カラーコードを返す
 */
export const RAINBOW_COLORS_HEX = RAINBOW_COLORS.map(c => rgbToHex(c.r, c.g, c.b));
