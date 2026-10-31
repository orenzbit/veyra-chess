// Pure helpers for the opening trainer's learn mode: which line is the "main" line of an opening, where another
// line departs from it, and how to label moves. No DOM and no rules engine, so scripts/check-opening-learn.mjs can run it.

export interface LearnLine {
  id: string;
  name?: string;
  star?: boolean;
  moves: string[][]; // [san, optional comment]
}

export interface LearnOpening {
  id: string;
  lines: LearnLine[];
}

export interface Divergence {
  ply: number; // 0-based index of the first ply where the two lines differ
  moveNumber: number;
  color: 'w' | 'b';
  mainMove: string | null; // null when the main line has already ended
  lineMove: string | null; // null when this line has already ended
}

/** SAN without check, mate or annotation marks, so "Bc4+" and "Bc4" compare equal. */
export function plainSan(san: string): string {
  return String(san || '').replace(/[+#!?]+$/, '');
}

/** The main line: the first starred line, or the opening's first line. */
export function mainLineOf(opening: LearnOpening): LearnLine | null {
  const lines = opening && Array.isArray(opening.lines) ? opening.lines : [];
  return lines.find((l) => l.star) || lines[0] || null;
}

export function isMainLine(opening: LearnOpening, line: LearnLine): boolean {
  const main = mainLineOf(opening);
  return !!main && !!line && main.id === line.id;
}

export function sansOf(line: LearnLine): string[] {
  return (line && Array.isArray(line.moves) ? line.moves : []).map((m) => m[0]);
}

/** First ply where the two SAN lists differ; null when they are identical. A strict prefix departs where the shorter one ends. */
export function findDivergence(mainSans: string[], lineSans: string[]): Divergence | null {
  const n = Math.max(mainSans.length, lineSans.length);
  for (let i = 0; i < n; i++) {
    const a = i < mainSans.length ? plainSan(mainSans[i]) : null;
    const b = i < lineSans.length ? plainSan(lineSans[i]) : null;
    if (a !== b) {
      return {
        ply: i,
        moveNumber: Math.floor(i / 2) + 1,
        color: i % 2 === 0 ? 'w' : 'b',
        mainMove: i < mainSans.length ? mainSans[i] : null,
        lineMove: i < lineSans.length ? lineSans[i] : null,
      };
    }
  }
  return null;
}

/** Divergence of `line` from the opening's main line; null for the main line itself or an identical line. */
export function divergenceFromMain(opening: LearnOpening, line: LearnLine): Divergence | null {
  const main = mainLineOf(opening);
  if (!main || isMainLine(opening, line)) return null;
  return findDivergence(sansOf(main), sansOf(line));
}

/** "5. Ng5" for White's move, "5…h6" for Black's. `ply` is the 0-based index of the move. */
export function moveLabel(ply: number, san: string): string {
  const n = Math.floor(ply / 2) + 1;
  return ply % 2 === 0 ? `${n}. ${san}` : `${n}…${san}`;
}

/** The next `count` moves after the first `ply` moves have been played. */
export function upcomingMoves(sans: string[], ply: number, count = 3): Array<{ ply: number; san: string; label: string }> {
  const out: Array<{ ply: number; san: string; label: string }> = [];
  for (let i = Math.max(0, ply); i < sans.length && out.length < count; i++) out.push({ ply: i, san: sans[i], label: moveLabel(i, sans[i]) });
  return out;
}
