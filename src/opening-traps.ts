// Opening traps: well-known short lines where one side's natural-looking move loses material or the game.
// Pure data + matching (no DOM, no rules engine) so the review page, the bot game and scripts/check-opening-traps.mjs share it.
// Matching is by exact move order only: transpositions into a trap are not detected.

export interface Bilingual { he: string; en: string }

export interface OpeningTrap {
  id: string;
  opening: Bilingual;
  name: Bilingual;
  // SAN moves from the initial position, White first.
  moves: string[];
  // 1-based ply of the mistaken move (moves[victimPly - 1]).
  victimPly: number;
  // Colour that played the mistaken move.
  victim: 'w' | 'b';
  explanation: Bilingual;
  punishment: Bilingual;
}

export interface TrapMatch {
  trap: OpeningTrap;
  // True once the history contains the victim ply (the mistaken move was played).
  reached: boolean;
}

export const OPENING_TRAPS: OpeningTrap[] = [
  {
    id: 'fools-mate',
    opening: { he: 'פתיחת בירד/בארנס — טעות', en: 'Bird/Barnes opening blunder' },
    name: { he: 'מט מהיר באלכסון e1–h4', en: 'Quick mate on the e1–h4 diagonal' },
    moves: ['f3', 'e5', 'g4', 'Qh4#'],
    victimPly: 3,
    victim: 'w',
    explanation: {
      he: 'f3 ו-g4 פותחים את האלכסון e1–h4; Qh4 הוא מט.',
      en: 'f3 and g4 open the e1–h4 diagonal; Qh4 is mate.',
    },
    punishment: { he: 'Qh4# הוא מט.', en: 'Qh4# is checkmate.' },
  },
  {
    id: 'scholars-mate',
    opening: { he: 'התקפת מלכה מוקדמת בסגנון הפתיחה האיטלקית', en: 'Italian-type early queen attack' },
    name: { he: 'התקפת מלכה מוקדמת על f7', en: 'Early queen attack on f7' },
    moves: ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6', 'Qxf7#'],
    victimPly: 6,
    victim: 'b',
    explanation: {
      he: 'f7 מוגן רק על ידי המלך; Qxf7 הוא מט (…g6 או …Qe7 במקום …Nf6 מגנים).',
      en: 'f7 is defended only by the king; Qxf7 is mate (…g6 or …Qe7 instead of …Nf6 defends).',
    },
    punishment: { he: 'Qxf7# הוא מט.', en: 'Qxf7# is checkmate.' },
  },
  {
    id: 'queen-sac-knight-mate',
    opening: { he: 'הגנת פילידור', en: 'Philidor Defence' },
    name: { he: 'לקיחת המלכה ומט בשלושה כלים קלים', en: 'Queen grab and a three-minor-piece mate' },
    moves: ['e4', 'e5', 'Nf3', 'd6', 'Bc4', 'Bg4', 'Nc3', 'g6', 'Nxe5', 'Bxd1', 'Bxf7+', 'Ke7', 'Nd5#'],
    victimPly: 10,
    victim: 'b',
    explanation: {
      he: 'לקיחת המלכה ב-…Bxd1 מאפשרת Bxf7+ Ke7 Nd5# — מט בעזרת שלושה כלים קלים.',
      en: 'taking the queen with …Bxd1 allows Bxf7+ Ke7 Nd5# — mate with three minor pieces.',
    },
    punishment: { he: 'Bxf7+ Ke7 Nd5# הוא מט.', en: 'Bxf7+ Ke7 Nd5# is checkmate.' },
  },
  {
    id: 'shilling-gambit',
    opening: { he: 'המשחק האיטלקי, גמביט שילינג', en: 'Italian Game, Shilling Gambit' },
    name: { he: 'תפיסת הרגלי החמדנית על e5', en: 'Greedy pawn grab on e5' },
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nd4', 'Nxe5', 'Qg5', 'Nxf7', 'Qxg2', 'Rf1', 'Qxe4+', 'Be2', 'Nf3#'],
    victimPly: 7,
    victim: 'w',
    explanation: {
      he: 'תפיסת e5 מאפשרת …Qg5 שתוקפת גם את הפרש וגם את g2; Nxf7 Qxg2 Rf1 Qxe4+ Be2 Nf3# הוא מט.',
      en: 'grabbing e5 lets …Qg5 hit both the knight and g2; Nxf7 Qxg2 Rf1 Qxe4+ Be2 Nf3# is mate.',
    },
    punishment: { he: '…Qg5! ובהמשך Nf3# הוא מט.', en: '…Qg5! and later Nf3# is checkmate.' },
  },
  {
    id: 'elephant-trap',
    opening: { he: 'גמביט המלכה הדחוי', en: "Queen's Gambit Declined" },
    name: { he: 'ריתוק מדומה של הפרש ב-f6', en: 'Fake pin on the f6 knight' },
    moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Nbd7', 'cxd5', 'exd5', 'Nxd5', 'Nxd5', 'Bxd8', 'Bb4+', 'Qd2', 'Bxd2+', 'Kxd2', 'Kxd8'],
    victimPly: 11,
    victim: 'w',
    explanation: {
      he: 'הפרש ב-f6 רק נראה מצולב; אחרי Nxd5 Nxd5! Bxd8 Bb4+ שחור מחזיר את המלכה ומסיים עם כלי יותר.',
      en: 'the f6 knight only looks pinned; after Nxd5 Nxd5! Bxd8 Bb4+ Black wins the queen back and ends a piece up.',
    },
    punishment: { he: '…Nxd5! ואז …Bb4+ מחזירים את המלכה וזוכים בכלי.', en: '…Nxd5! then …Bb4+ wins the queen back and a piece.' },
  },
  {
    id: 'englund-gambit-trap',
    opening: { he: 'גמביט אנגלונד', en: 'Englund Gambit' },
    name: { he: 'מט בפלישת מלכה ל-c1', en: 'Queen invasion mate on c1' },
    moves: ['d4', 'e5', 'dxe5', 'Nc6', 'Nf3', 'Qe7', 'Bf4', 'Qb4+', 'Bd2', 'Qxb2', 'Bc3', 'Bb4', 'Qd2', 'Bxc3', 'Qxc3', 'Qc1#'],
    victimPly: 11,
    victim: 'w',
    explanation: {
      he: 'Bc3 נתקל ב-…Bb4! ואחרי Qd2 Bxc3 Qxc3 Qc1# זה מט.',
      en: 'Bc3 runs into …Bb4! and after Qd2 Bxc3 Qxc3 Qc1# it is mate.',
    },
    punishment: { he: '…Bb4! ובהמשך Qc1# הוא מט.', en: '…Bb4! and later Qc1# is checkmate.' },
  },
  {
    id: 'albin-knight-promotion',
    opening: { he: 'גמביט אלבין הנגדי', en: 'Albin Countergambit' },
    name: { he: 'הכתרה לפרש עם שח', en: 'Knight promotion with check' },
    moves: ['d4', 'd5', 'c4', 'e5', 'dxe5', 'd4', 'e3', 'Bb4+', 'Bd2', 'dxe3', 'Bxb4', 'exf2+', 'Ke2', 'fxg1=N+'],
    victimPly: 11,
    victim: 'w',
    explanation: {
      he: 'Bxb4 מאפשר …exf2+ Ke2 fxg1=N+ — הכתרה לפרש עם שח זוכה בחומר.',
      en: 'Bxb4 allows …exf2+ Ke2 fxg1=N+ — promoting to a knight with check wins material.',
    },
    punishment: { he: '…exf2+ ו-…fxg1=N+ זוכים בחומר.', en: '…exf2+ and …fxg1=N+ win material.' },
  },
  {
    id: 'noahs-ark',
    opening: { he: 'רוי לופז', en: 'Ruy Lopez' },
    name: { he: 'רץ לכוד על b3 בין רגלים', en: 'Bishop trapped on b3 by pawns' },
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'd6', 'd4', 'b5', 'Bb3', 'Nxd4', 'Nxd4', 'exd4', 'Qxd4', 'c5', 'Qd5', 'Be6', 'Qc6+', 'Bd7', 'Qd5', 'c4'],
    victimPly: 15,
    victim: 'w',
    explanation: {
      he: 'Qxd4 מאפשר …c5 ו-…c4 שלוכדים את הרץ ב-b3.',
      en: 'Qxd4 lets …c5 and …c4 trap the bishop on b3.',
    },
    punishment: { he: '…c5 ו-…c4 לוכדים את הרץ.', en: '…c5 and …c4 trap the bishop.' },
  },
  {
    id: 'morra-queen-trap',
    opening: { he: "גמביט סמית'-מורה", en: 'Smith-Morra Gambit' },
    name: { he: 'התקפת פרש עם איום מט על h2', en: 'Knight attack with a mate threat on h2' },
    moves: ['e4', 'c5', 'd4', 'cxd4', 'c3', 'dxc3', 'Nxc3', 'Nc6', 'Nf3', 'e6', 'Bc4', 'Qc7', 'O-O', 'Nf6', 'Qe2', 'Ng4', 'h3', 'Nd4', 'Nxd4', 'Qh2#'],
    victimPly: 17,
    victim: 'w',
    explanation: {
      he: 'h3 מאפשר …Nd4! שתוקף את המלכה ומאיים על Qh2#; Nxd4 Qh2# הוא מט.',
      en: 'h3 allows …Nd4!, attacking the queen with Qh2# threatened; Nxd4 Qh2# is mate.',
    },
    punishment: { he: '…Nd4! ואחרי Nxd4 — Qh2# הוא מט.', en: '…Nd4! and after Nxd4, Qh2# is checkmate.' },
  },
  {
    id: 'fishing-pole',
    opening: { he: 'רוי לופז, ברלין', en: 'Ruy Lopez, Berlin' },
    name: { he: 'התקפה על עמודה h הפתוחה', en: 'Attack down the open h-file' },
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6', 'O-O', 'Ng4', 'h3', 'h5', 'hxg4', 'hxg4', 'Ne1', 'Qh4', 'f3', 'g3'],
    victimPly: 11,
    victim: 'w',
    explanation: {
      he: 'hxg4 פותח את עמודה h; …Qh4 מביא איומי מט על h2/h1.',
      en: 'hxg4 opens the h-file; …Qh4 brings mating threats on h2/h1.',
    },
    punishment: { he: '…hxg4 ו-…Qh4 מביאים איומי מט.', en: '…hxg4 and …Qh4 bring mating threats.' },
  },
  {
    id: 'berlin-queen-fork',
    opening: { he: 'רוי לופז, ברלין', en: 'Ruy Lopez, Berlin' },
    name: { he: 'שח מלכה זוכה ברץ', en: 'Queen check wins the bishop' },
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6', 'd3', 'Ne7', 'Nxe5', 'c6', 'Nc4', 'Qa5+'],
    victimPly: 9,
    victim: 'w',
    explanation: {
      he: 'Nxe5 c6 תוקף את הרץ ב-b5; Nc4 Qa5+ זוכה בו עם שח.',
      en: 'Nxe5 c6 attacks the b5 bishop; Nc4 Qa5+ wins it with a check.',
    },
    punishment: { he: '…c6 ובהמשך …Qa5+ זוכים ברץ.', en: '…c6 and later …Qa5+ win the bishop.' },
  },
  {
    id: 'budapest-smothered',
    opening: { he: 'גמביט בודפשט', en: 'Budapest Gambit' },
    name: { he: 'מט פרש על d3', en: 'Knight mate on d3' },
    moves: ['d4', 'Nf6', 'c4', 'e5', 'dxe5', 'Ng4', 'Bf4', 'Nc6', 'Nf3', 'Bb4+', 'Nbd2', 'Qe7', 'a3', 'Ngxe5', 'axb4', 'Nd3#'],
    victimPly: 13,
    victim: 'w',
    explanation: {
      he: 'a3 מאפשר …Ngxe5!; אם axb4 אז …Nd3# הוא מט.',
      en: 'a3 allows …Ngxe5!; if axb4 then …Nd3# is mate.',
    },
    punishment: { he: '…Ngxe5! ואחרי axb4 — …Nd3# הוא מט.', en: '…Ngxe5! and after axb4, …Nd3# is checkmate.' },
  },
  {
    id: 'sicilian-f7-queen',
    opening: { he: 'סיציליאנית, קלאסית', en: 'Sicilian, Classical' },
    name: { he: 'הקרבת רץ זוכה במלכה', en: 'Bishop sacrifice wins the queen' },
    moves: ['e4', 'c5', 'Nf3', 'Nc6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'd6', 'Bc4', 'g6', 'Nxc6', 'bxc6', 'e5', 'dxe5', 'Bxf7+', 'Kxf7', 'Qxd8'],
    victimPly: 16,
    victim: 'b',
    explanation: {
      he: '…dxe5 מאפשר Bxf7+! Kxf7 Qxd8, וזוכה במלכה.',
      en: '…dxe5 allows Bxf7+! Kxf7 Qxd8, winning the queen.',
    },
    punishment: { he: 'Bxf7+! Kxf7 Qxd8 זוכה במלכה.', en: 'Bxf7+! Kxf7 Qxd8 wins the queen.' },
  },
];

// Drops check/mate/annotation marks (and the zero-castling spelling) so "Nf6?!" equals "Nf6".
export function normalizeSan(san: unknown): string {
  return String(san ?? '').replace(/[+#!?]/g, '').replace(/0/g, 'O').trim();
}

// Finds the trap whose line the history follows (compared through the victim ply).
// A history shorter than the victim ply still matches while it is a prefix of the line (reached === false);
// callers that need a played mistake must require reached. Several matches: the longest prefix wins,
// i.e. a reached trap beats a pending one, and among reached traps the later victim ply wins.
export function matchTrap(sanHistory: string[]): TrapMatch | null {
  if (!Array.isArray(sanHistory) || sanHistory.length === 0) return null;
  const history = sanHistory.map(normalizeSan);
  let best: TrapMatch | null = null;
  for (const trap of OPENING_TRAPS) {
    const length = Math.min(history.length, trap.victimPly);
    let same = true;
    for (let i = 0; i < length; i += 1) {
      if (normalizeSan(trap.moves[i]) !== history[i]) { same = false; break; }
    }
    if (!same) continue;
    const reached = history.length >= trap.victimPly;
    if (!best) { best = { trap, reached }; continue; }
    if (reached && !best.reached) best = { trap, reached };
    else if (reached === best.reached && reached && trap.victimPly > best.trap.victimPly) best = { trap, reached };
    else if (reached === best.reached && !reached && trap.victimPly < best.trap.victimPly) best = { trap, reached };
  }
  return best;
}
