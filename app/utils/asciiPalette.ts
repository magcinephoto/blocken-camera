/**
 * ASCIIパレット選択とdensity変換のユーティリティ関数
 *
 * Baseチェーンのトランザクションハッシュから以下を生成:
 * 1. 7つのASCIIパレットから1つを選択
 * 2. ハッシュベースのdensity変換関数（ノイズ適用）
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

export interface PaletteSelection {
  palette: string;
  densityModifier: (brightness: number, x: number, y: number) => number;
}

/**
 * トランザクションハッシュからパレットを選択し、density変換関数を生成
 *
 * @param txHash - トランザクションハッシュ (例: "0xb0dc294088cf10a0dbfad35f4bf01ac9b43db54065f9")
 * @returns パレットとdensity変換関数
 *
 * @example
 * const selection = selectPaletteFromHash("0xb0dc294088...");
 * console.log(selection.palette); // 選択されたASCII文字列
 * const modifiedBrightness = selection.densityModifier(0.5, 10, 20);
 */
export function selectPaletteFromHash(txHash: string): PaletteSelection {
  // "0x"プレフィックスを除去
  const cleanHash = txHash.replace(/^0x/, '');

  // 最初の1文字でパレットを選択 (0-f → 0-15 → 0-6にマッピング)
  const firstChar = cleanHash.charAt(0);
  const firstValue = parseInt(firstChar, 16); // 0-15
  const paletteIndex = firstValue % ASCII_PALETTES.length; // 0-6
  const selectedPalette = ASCII_PALETTES[paletteIndex];

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

  return {
    palette: selectedPalette,
    densityModifier
  };
}

/**
 * フォールバック用のデフォルトパレット選択
 * APIエラー時や開発環境でトランザクションハッシュが取得できない場合に使用
 *
 * @returns デフォルトのパレット選択（ノイズなし）
 */
export function getDefaultPalette(): PaletteSelection {
  return {
    palette: ASCII_PALETTES[0], // 最初のパレットをデフォルトとする
    densityModifier: (brightness: number) => brightness // ノイズなし
  };
}
