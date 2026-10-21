export type BlindfoldLevel = 1 | 2 | 3 | 4;

/**
 * Returns a display-only FEN with selected piece types removed from the board
 * placement field. All remaining FEN fields are copied unchanged. Callers must
 * keep the original game/FEN as the source of truth for legal moves.
 */
export function blindfoldDisplayFen(fen: string, level: BlindfoldLevel): string {
  if (![1, 2, 3, 4].includes(level)) throw new RangeError("Blindfold level must be 1, 2, 3, or 4");
  const fields = String(fen).trim().split(/\s+/);
  if (fields.length < 4) throw new TypeError("Expected a valid FEN string");
  const ranks = fields[0].split("/");
  if (ranks.length !== 8) throw new TypeError("FEN must contain eight ranks");
  const hidden = level === 1 ? "r" : level === 2 ? "rn" : level === 3 ? "rnbqk" : "rnbqkp";
  const mapped = ranks.map((rank) => {
    let expanded = "";
    for (const token of rank) {
      if (/^[1-8]$/.test(token)) expanded += ".".repeat(Number(token));
      else if (/^[prnbqkPRNBQK]$/.test(token)) expanded += hidden.includes(token.toLowerCase()) ? "." : token;
      else throw new TypeError("Invalid FEN piece placement");
    }
    if (expanded.length !== 8) throw new TypeError("Each FEN rank must contain eight squares");
    let compressed = "";
    let empty = 0;
    for (const square of expanded) {
      if (square === ".") empty++;
      else {
        if (empty) compressed += String(empty);
        empty = 0;
        compressed += square;
      }
    }
    if (empty) compressed += String(empty);
    return compressed;
  });
  fields[0] = mapped.join("/");
  return fields.join(" ");
}
