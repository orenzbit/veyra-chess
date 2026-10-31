// Shared puzzle board (cm-chessboard + the rules layer). Used by the personal-training and Rush views.
// The board is created once; input always goes through refs so it sees the current puzzle.
const Chess = (window as any).ChessLib.Chess;
const Chessboard = (window as any).ChessBoardLib.Chessboard;
const COLOR = (window as any).ChessBoardLib.COLOR;
const BORDER_TYPE = (window as any).ChessBoardLib.BORDER_TYPE;
const h = React.createElement;
const useState = React.useState as <T>(v: T | (() => T)) => [T, (v: T | ((p: T) => T)) => void];
const useRef = React.useRef as <T>(v: T) => { current: T };
const useEffect = React.useEffect as (fn: () => void | (() => void), deps?: unknown[]) => void;

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const PROMO_PIECES = [
  { letter: 'q', name: 'מלכה', white: '♕', black: '♛' },
  { letter: 'r', name: 'צריח', white: '♖', black: '♜' },
  { letter: 'b', name: 'רץ', white: '♗', black: '♝' },
  { letter: 'n', name: 'פרש', white: '♘', black: '♞' },
];

export type Verdict = 'correct' | 'wrong' | 'illegal';
export function sanFor(fen: string, uci: string): string {
  try {
    const mv = new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined });
    return mv && mv.san ? mv.san : uci;
  } catch { return uci; }
}
export function sideName(fen: string): string { return fen.split(' ')[1] === 'w' ? 'לבן' : 'שחור'; }

/**
 * Props: fen (position), locked (ignore input), animate, onMove(uci) -> verdict.
 * 'correct' keeps the piece where it was dropped; 'wrong' / 'illegal' snap it back.
 */
export function PuzzleBoard({ fen, locked, animate, onMove, label }: { fen: string; locked: boolean; animate: boolean; onMove: (uci: string) => Verdict; label?: string }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const boardRef = useRef<any>(null);
  const fenRef = useRef(fen);
  const lockedRef = useRef(locked);
  const onMoveRef = useRef(onMove);
  const [promo, setPromo] = useState<{ from: string; to: string } | null>(null);
  fenRef.current = fen;
  lockedRef.current = locked;
  onMoveRef.current = onMove;

  useEffect(() => {
    if (!hostRef.current) return;
    const b = new Chessboard(hostRef.current, {
      position: START_FEN, orientation: COLOR.white, responsive: true, assetsUrl: '/vendor/cm-chessboard/',
      style: { borderType: BORDER_TYPE.none, cssClass: 'default', pieces: { file: 'pieces/standard.svg' }, animationDuration: 200 },
    });
    boardRef.current = b;
    b.enableMoveInput((ev: any) => {
      if (lockedRef.current) return false;
      if (ev.type === 'moveInputStarted') return true;
      if (ev.type !== 'validateMoveInput') return true;
      try {
        const piece = new Chess(fenRef.current).get(ev.squareFrom);
        const last = ev.squareTo[1] === '1' || ev.squareTo[1] === '8';
        if (piece && piece.type === 'p' && last && !ev.promotion) { setPromo({ from: ev.squareFrom, to: ev.squareTo }); return false; }
      } catch { return false; }
      return onMoveRef.current(ev.squareFrom + ev.squareTo + (ev.promotion ? String(ev.promotion).toLowerCase() : '')) === 'correct';
    });
    return () => { try { b.destroy(); } catch { /* already gone */ } };
  }, []);

  // New position: set it, and face the side that has to move.
  useEffect(() => {
    const b = boardRef.current;
    if (!b) return;
    setPromo(null);
    const want = fen.split(' ')[1] === 'w' ? COLOR.white : COLOR.black;
    try {
      b.setPosition(fen, animate);
      if (b.getOrientation() !== want) b.setOrientation(want, animate);
    } catch { /* board is being torn down */ }
  }, [fen]);

  function choose(letter: string) {
    const p = promo; setPromo(null);
    if (!p) return;
    const verdict = onMoveRef.current(p.from + p.to + letter);
    const b = boardRef.current;
    if (!b) return;
    if (verdict === 'correct') {
      try { const c = new Chess(fenRef.current); c.move({ from: p.from, to: p.to, promotion: letter }); b.setPosition(c.fen(), true); } catch { b.setPosition(fenRef.current, true); }
    } else b.setPosition(fenRef.current, true);
  }
  function cancel() { setPromo(null); const b = boardRef.current; if (b) b.setPosition(fenRef.current, true); }

  const white = fen.split(' ')[1] === 'w';
  return h('div', null,
    h('div', { className: 'board-wrap bot-board-wrap' }, h('div', { ref: hostRef, className: 'board', role: 'img', 'aria-label': label || 'לוח שחמט', 'data-ready': locked ? 'false' : 'true' })),
    promo && h('div', { className: 'puzzle-promo' },
      h('span', { className: 'muted' }, 'בחר כלי להכתרה:'),
      ...PROMO_PIECES.map((pc) => h('button', { key: pc.letter, onClick: () => choose(pc.letter) }, (white ? pc.white : pc.black) + ' ' + pc.name)),
      h('button', { onClick: cancel }, 'ביטול')));
}

/** Verdict for a move on a puzzle: accepted list, or any checkmate. Returns null when the move is illegal.
 * The one move rule: the streak, personal and Rush views all call this. */
export function judge(p: { fen: string; solution: string[]; accepted?: string[] }, uci: string): { verdict: 'correct' | 'wrong' | null; viaAlt: boolean } {
  let g: any;
  try { g = new Chess(p.fen); g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined }); } catch { return { verdict: null, viaAlt: false }; }
  const list = p.accepted && p.accepted.length ? p.accepted : p.solution;
  if (list.includes(uci)) return { verdict: 'correct', viaAlt: uci !== p.solution[0] };
  if (g.isCheckmate()) return { verdict: 'correct', viaAlt: true };
  return { verdict: 'wrong', viaAlt: false };
}
