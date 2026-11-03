/** Paket-Schlüssel für Strichdaten: obere Bits des Codepoints in Hex (z. B. "日" → "65"). */
export function chunkKey(char: string): string {
  return (char.codePointAt(0)! >> 8).toString(16);
}
