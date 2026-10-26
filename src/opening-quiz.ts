// Opening-trainer move matching. A typed move is judged by the position it produces, not by its spelling:
// "nf3", "Ne5" for Nxe5, "e8Q" for e8=Q and UCI "g1f3" all count when they lead to the expected position.
// The rules engine is passed in, so this runs in the browser (window.ChessLib) and in scripts/check-openings.mjs.

export interface LegalMove {
  from: string;
  to: string;
  piece: string;
  promotion?: string;
  flags: string;
}

export interface QuizPosition {
  moves(opts: { verbose: true }): LegalMove[];
  move(input: string | MoveInput): unknown;
  fen(): string;
}

export type QuizChessCtor = new (fen: string) => QuizPosition;

export type MoveInput = { from: string; to: string; promotion?: string };

/** Board-only key: placement, side to move, castling and en passant (move counters ignored). */
function positionKey(fen: string): string {
  return String(fen).split(' ').slice(0, 4).join(' ');
}

/** Spelling comparison, used only when the typed text cannot be played at all. */
function normSan(s: string): string {
  return String(s || '').replace(/[+#!?\s]/g, '').replace(/0/g, 'O').replace(/^o-o-o$/i, 'O-O-O').replace(/^o-o$/i, 'O-O');
}

// Resolves SAN-like text to exactly one legal move. Piece letters are upper-case and files lower-case, as in SAN.
// Works from the engine's legal-move list rather than its string parser, which computes SAN for every legal move.
const SAN_RE = /^([NBRQK])?([a-h])?([1-8])?x?([a-h][1-8])(?:=?([NBRQnbrq]))?$/;
function resolveText(legal: LegalMove[], text: string): MoveInput | null {
  const castle = /^O-O(-O)?$/.exec(text.replace(/0/g, 'O').toUpperCase());
  if (castle) {
    const side = castle[1] ? 'q' : 'k';
    const hits = legal.filter((m) => m.piece === 'k' && m.flags.includes(side));
    return hits.length === 1 ? { from: hits[0].from, to: hits[0].to } : null;
  }
  const mt = SAN_RE.exec(text);
  if (!mt) return null;
  const [, pc, ff, fr, dest, pr] = mt;
  const piece = pc ? pc.toLowerCase() : 'p';
  const hits = legal.filter((m) => m.piece === piece && m.to === dest &&
    (!ff || m.from[0] === ff) && (!fr || m.from[1] === fr) &&
    (piece !== 'p' || (ff ? m.from[0] !== m.to[0] : m.from[0] === m.to[0])) && // a pawn capture names its file; a push never does
    (pr ? m.promotion === pr.toLowerCase() : !m.promotion));
  return hits.length === 1 ? { from: hits[0].from, to: hits[0].to, promotion: hits[0].promotion } : null;
}

// Plays one move from a FEN. Returns the resulting position key, or null if the move is illegal or unparseable.
function playedKey(Chess: QuizChessCtor, fen: string, input: string | MoveInput): string | null {
  try {
    const pos = new Chess(fen);
    const move = typeof input === 'string' ? resolveText(pos.moves({ verbose: true }), input) : input;
    return move && pos.move(move) ? positionKey(pos.fen()) : null;
  } catch {
    return null;
  }
}

// Ways to read the typed text, most specific first. The first reading that parses decides.
function readings(text: string): Array<string | MoveInput> {
  const uci = /^([a-h][1-8])([a-h][1-8])([qrbn])?$/.exec(text);
  if (uci) return [{ from: uci[1], to: uci[2], promotion: uci[3] }];
  // A leading lower-case n/b/r/q/k is read as written first, so "bxc6" and "b4" stay pawn moves; only if that fails is it a piece.
  const out: Array<string | MoveInput> = [text];
  if (/^[nbrqk]/.test(text)) out.push(text[0].toUpperCase() + text.slice(1));
  return out;
}

/**
 * True when the typed move, played from `fenBefore`, reaches the same position as `expectedSan`.
 * Illegal or wrong moves never match. The spelling comparison only applies when the typed text cannot be played.
 */
export function quizMoveMatches(Chess: QuizChessCtor, fenBefore: string, typed: string, expectedSan: string): boolean {
  const spellingMatch = () => normSan(typed) === normSan(expectedSan);
  const expected = playedKey(Chess, fenBefore, expectedSan.replace(/[+#!?]+$/, ''));
  if (expected === null) return false; // the expected move itself is not legal here, so nothing can be matched
  const text = String(typed || '').trim().replace(/[+#!?]+$/, '');
  if (!text) return false;
  for (const input of readings(text)) {
    const got = playedKey(Chess, fenBefore, input);
    if (got !== null) return got === expected;
  }
  return spellingMatch();
}
