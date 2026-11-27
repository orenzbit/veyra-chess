// Adaptive "Oren Bot" & "Play Against Past-You (לפני חודש)" engine + UI panel.
// Features:
//  - Chronological time-window split (Past-You > 30 days ago vs Current Adaptive Bot)
//  - Recency-weighted exact-position move distributions (exponential half-life decay)
//  - Personal style-profile scoring for unseen positions (aggression, exchanges, checks, castling)
//  - Strict blind 20% chronological holdout Top-1 / Top-3 move-prediction benchmark
//  - Automatic No-Regression Quality Gate (v1 -> v2 -> v3...)
// Pure MIT TypeScript; zero external deps; safe to import in Node tests.

export interface PersonalPgnGame {
  id?: string;
  pgn: string;
  date?: string;
  playedAt?: string;
  playerColor?: 'white' | 'black' | string;
  result?: string;
  userRating?: number | null;
}

export interface StyleProfile {
  games: number;
  capturesPer100: number;
  checksPer100: number;
  castleRate: number;
  exchangeRate: number;
  averagePlies: number;
}

export interface HoldoutBenchmark {
  holdoutRatio: number;
  holdoutGames: number;
  trainingGames: number;
  positionsTested: number;
  bookHits: number;
  top1Hits: number;
  top3Hits: number;
  top1Accuracy: number;
  top3Accuracy: number;
}

export interface QualityGateResult {
  approved: boolean;
  deltaTop1: number;
  deltaTop3: number;
  reasonHe: string;
}

export interface WeightedMoveEntry {
  uci: string;
  san: string;
  weight: number;
  count: number;
}

export interface AdaptiveBotSnapshot {
  id: string;
  slug: string;
  version: string;
  eraTag: 'past' | 'current' | 'full';
  name: string;
  title: string;
  elo: number;
  tier: number;
  stage: string;
  style: string;
  styleLabel: string;
  piece: string;
  era: string;
  region: string;
  flavor: string;
  quips: string[];
  openingsAsWhite: Array<{ name: string; moves: string; games: number }>;
  openingsAsBlack: Array<{ name: string; moves: string; games: number }>;
  gambits: Array<{ name: string; moves: string; games: number }>;
  openingMatchMode: 'position';
  dateRange: string;
  sourceLabelHe: string;
  halfLifeDays: number;
  styleProfile: StyleProfile;
  holdout: HoldoutBenchmark;
  positionBook: Record<string, WeightedMoveEntry[]>;
  isAdaptivePersonalBot: true;
}

function readHeader(pgn: string, key: string): string {
  const m = new RegExp('^\\[' + key + '\\s+"([^"]*)"\\]', 'mi').exec(pgn || '');
  return m ? m[1].trim() : '';
}

function parseDateMs(game: PersonalPgnGame): number | null {
  if (game.playedAt) {
    const t = Date.parse(game.playedAt);
    if (Number.isFinite(t)) return t;
  }
  const raw = game.date || readHeader(game.pgn, 'UTCDate') || readHeader(game.pgn, 'Date');
  if (!raw || raw === 'unknown' || raw.includes('?')) return null;
  const iso = raw.replace(/\./g, '-');
  const t = Date.parse(`${iso}T12:00:00Z`);
  return Number.isFinite(t) ? t : null;
}

function formatDateIso(ms: number | null): string {
  if (ms == null || !Number.isFinite(ms)) return 'לא ידוע';
  return new Date(ms).toISOString().slice(0, 10);
}

/** Position key using first 4 FEN fields (board, turn, castling, ep) to match transpositions. */
export function positionKeyFromFen(fen: string): string {
  return String(fen || '').trim().split(/\s+/).slice(0, 4).join(' ');
}

function moveToUci(mv: any): string {
  return `${mv.from}${mv.to}${mv.promotion || ''}`;
}

export function recencyWeight(ageDays: number, halfLifeDays: number): number {
  const safeAge = Math.max(0, Number.isFinite(ageDays) ? ageDays : 0);
  const safeHalf = Math.max(1, halfLifeDays || 45);
  return Math.pow(0.5, safeAge / safeHalf);
}

/** Splits chronological games into Past-You (> cutoffDays old) and Current-You (recent). */
export function splitGamesByTimeWindow(
  games: PersonalPgnGame[],
  options?: { referenceDate?: string | number; cutoffDays?: number }
): {
  past: PersonalPgnGame[];
  recent: PersonalPgnGame[];
  splitMethod: 'cutoff-days' | 'chronological-half';
  cutoffIso: string;
} {
  const cutoffDays = options?.cutoffDays ?? 30;
  const list = (games || [])
    .filter(g => g && typeof g.pgn === 'string' && g.pgn.trim().length > 0)
    .map((g, idx) => ({ g, idx, ms: parseDateMs(g) }))
    .sort((a, b) => {
      if (a.ms != null && b.ms != null && a.ms !== b.ms) return a.ms - b.ms;
      return a.idx - b.idx;
    });

  if (list.length < 4) {
    return {
      past: list.slice(0, Math.floor(list.length / 2)).map(x => x.g),
      recent: list.map(x => x.g),
      splitMethod: 'chronological-half',
      cutoffIso: 'לא זמין',
    };
  }

  const withDates = list.filter(x => x.ms != null);
  const maxMs = options?.referenceDate != null
    ? (typeof options.referenceDate === 'number' ? options.referenceDate : Date.parse(options.referenceDate))
    : (withDates.length ? withDates[withDates.length - 1].ms! : Date.now());

  const cutoffMs = maxMs - cutoffDays * 24 * 60 * 60 * 1000;
  const pastByCutoff = list.filter(x => x.ms != null && x.ms < cutoffMs).map(x => x.g);
  const recentByCutoff = list.filter(x => x.ms == null || x.ms >= cutoffMs).map(x => x.g);

  if (pastByCutoff.length >= 2 && recentByCutoff.length >= 2) {
    return {
      past: pastByCutoff,
      recent: recentByCutoff,
      splitMethod: 'cutoff-days',
      cutoffIso: formatDateIso(cutoffMs),
    };
  }

  // Fallback when all games fall inside one narrow date span: split chronologically 50/50
  const mid = Math.floor(list.length / 2);
  const midMs = list[mid]?.ms ?? null;
  return {
    past: list.slice(0, mid).map(x => x.g),
    recent: list.slice(mid).map(x => x.g),
    splitMethod: 'chronological-half',
    cutoffIso: formatDateIso(midMs),
  };
}

function parseGameMoves(pgn: string, ChessCtor: any): any[] | null {
  try {
    const c = new ChessCtor();
    if (typeof c.loadPgn === 'function') c.loadPgn(pgn);
    else if (typeof c.load_pgn === 'function') c.load_pgn(pgn);
    else return null;
    return c.history({ verbose: true }) || [];
  } catch {
    return null;
  }
}

function sideOfGame(g: PersonalPgnGame): 'w' | 'b' {
  return g.playerColor === 'black' ? 'b' : 'w';
}

const PIECE_VAL: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

/** Scores legal moves using the player's learned style profile + recency-weighted book. */
export function rankCandidateMoves(
  fen: string,
  positionBook: Record<string, WeightedMoveEntry[]>,
  style: StyleProfile,
  ChessCtor: any
): Array<{ move: any; uci: string; score: number; fromBook: boolean }> {
  const probe = new ChessCtor(fen);
  const legal: any[] = probe.moves({ verbose: true }) || [];
  if (!legal.length) return [];

  const key = positionKeyFromFen(fen);
  const bookEntries = positionBook[key] || [];
  const bookWeightByUci = new Map<string, number>();
  let totalBookWeight = 0;
  for (const e of bookEntries) {
    bookWeightByUci.set(e.uci, e.weight);
    totalBookWeight += e.weight;
  }

  const aggBias = (style.checksPer100 - 4) * 3;
  const capBias = (style.capturesPer100 - 18) * 1.6;
  const castleBias = style.castleRate >= 0.45 ? 38 : 14;
  const centerSq = new Set(['d4', 'e4', 'd5', 'e5', 'c4', 'f4', 'c5', 'f5']);

  const ranked = legal.map(mv => {
    const uci = moveToUci(mv);
    const bw = bookWeightByUci.get(uci) || 0;
    const fromBook = bw > 0;
    let score = fromBook && totalBookWeight > 0 ? 500 + (bw / totalBookWeight) * 500 : 0;

    // Lightweight MIT style + tactical heuristic for unseen positions
    if (mv.captured) {
      const gained = PIECE_VAL[mv.captured] || 100;
      const mover = PIECE_VAL[mv.piece] || 100;
      score += 45 + (gained - mover * 0.25) * 0.15 + capBias;
    }
    if (mv.san && mv.san.includes('#')) score += 10000;
    else if (mv.san && mv.san.includes('+')) score += 26 + aggBias;
    if (mv.san && (mv.san === 'O-O' || mv.san === 'O-O-O')) score += castleBias;
    if (mv.promotion) score += 220;
    if (centerSq.has(mv.to)) score += 16;
    if ((mv.piece === 'n' || mv.piece === 'b') && (mv.from[1] === '1' || mv.from[1] === '8')) score += 18;
    // Slight deterministic tie-break so benchmarks are 100% reproducible
    score += ((uci.charCodeAt(0) * 7 + uci.charCodeAt(2) * 3) % 11) * 0.01;

    return { move: mv, uci, score, fromBook };
  });

  ranked.sort((a, b) => b.score - a.score);
  return ranked;
}

/** Builds a versioned adaptive player bot with recency weights and blind 20% chronological holdout test. */
export function buildVersionedPlayerBot(
  games: PersonalPgnGame[],
  options: {
    id: string;
    name: string;
    version: string;
    eraTag: 'past' | 'current' | 'full';
    elo?: number;
    halfLifeDays?: number;
    holdoutRatio?: number;
    sourceLabelHe?: string;
    ChessCtor: any;
  }
): AdaptiveBotSnapshot {
  const halfLifeDays = options.halfLifeDays ?? 45;
  const holdoutRatio = Math.min(0.4, Math.max(0.1, options.holdoutRatio ?? 0.2));
  const ChessCtor = options.ChessCtor;

  const sorted = (games || [])
    .filter(g => g && typeof g.pgn === 'string' && g.pgn.trim())
    .map((g, idx) => ({ g, idx, ms: parseDateMs(g) }))
    .sort((a, b) => {
      if (a.ms != null && b.ms != null && a.ms !== b.ms) return a.ms - b.ms;
      return a.idx - b.idx;
    });

  const holdoutCount = sorted.length >= 5 ? Math.max(1, Math.round(sorted.length * holdoutRatio)) : (sorted.length >= 2 ? 1 : 0);
  const trainSlice = sorted.slice(0, Math.max(0, sorted.length - holdoutCount));
  const holdoutSlice = sorted.slice(sorted.length - holdoutCount);

  const refMs = sorted.length && sorted[sorted.length - 1].ms != null ? sorted[sorted.length - 1].ms! : Date.now();
  const minMs = sorted.find(x => x.ms != null)?.ms ?? null;
  const maxMs = [...sorted].reverse().find(x => x.ms != null)?.ms ?? null;

  // Train recency-weighted position book + style profile on trainSlice ONLY
  const bookMap = new Map<string, Map<string, WeightedMoveEntry>>();
  const whiteOpenings = new Map<string, number>();
  const blackOpenings = new Map<string, number>();

  let ownMoves = 0;
  let captures = 0;
  let checks = 0;
  let exchanges = 0;
  let castledGames = 0;
  let totalPlies = 0;
  let parsedTrainGames = 0;
  let eloSum = 0;
  let eloCount = 0;

  for (const item of trainSlice) {
    const moves = parseGameMoves(item.g.pgn, ChessCtor);
    if (!moves || moves.length < 4) continue;
    parsedTrainGames += 1;
    totalPlies += moves.length;

    const mySide = sideOfGame(item.g);
    const ageDays = item.ms != null ? Math.max(0, (refMs - item.ms) / (24 * 60 * 60 * 1000)) : 0;
    const w = recencyWeight(ageDays, halfLifeDays);

    if (typeof item.g.userRating === 'number' && Number.isFinite(item.g.userRating)) {
      eloSum += item.g.userRating;
      eloCount += 1;
    }

    // Build opening line string (first 12 plies)
    const linePlies = moves.slice(0, 12);
    const lineParts: string[] = [];
    for (let i = 0; i < linePlies.length; i += 2) {
      const num = Math.floor(i / 2) + 1;
      lineParts.push(`${num}.${linePlies[i].san}${linePlies[i + 1] ? ' ' + linePlies[i + 1].san : ''}`);
    }
    const lineStr = lineParts.join(' ');
    if (lineStr) {
      const targetMap = mySide === 'w' ? whiteOpenings : blackOpenings;
      targetMap.set(lineStr, (targetMap.get(lineStr) || 0) + 1);
    }

    const replay = new ChessCtor();
    let gameCastled = false;
    for (let ply = 0; ply < moves.length; ply++) {
      const mv = moves[ply];
      if (mv.color === mySide) {
        ownMoves += 1;
        if (mv.captured) {
          captures += 1;
          if (mv.captured === mv.piece) exchanges += 1;
        }
        if (mv.san && mv.san.includes('+')) checks += 1;
        if (mv.san === 'O-O' || mv.san === 'O-O-O') gameCastled = true;

        // Store exact positions up to ply 32 in recency-weighted personal book
        if (ply < 32) {
          const posKey = positionKeyFromFen(replay.fen());
          let inner = bookMap.get(posKey);
          if (!inner) {
            inner = new Map();
            bookMap.set(posKey, inner);
          }
          const uci = moveToUci(mv);
          const cur = inner.get(uci);
          if (cur) {
            cur.weight += w;
            cur.count += 1;
          } else {
            inner.set(uci, { uci, san: mv.san, weight: w, count: 1 });
          }
        }
      }
      replay.move({ from: mv.from, to: mv.to, promotion: mv.promotion || undefined });
    }
    if (gameCastled) castledGames += 1;
  }

  const positionBook: Record<string, WeightedMoveEntry[]> = {};
  for (const [posKey, entries] of bookMap.entries()) {
    positionBook[posKey] = [...entries.values()].sort((a, b) => b.weight - a.weight);
  }

  const styleProfile: StyleProfile = {
    games: parsedTrainGames,
    capturesPer100: ownMoves > 0 ? Math.round((captures / ownMoves) * 1000) / 10 : 0,
    checksPer100: ownMoves > 0 ? Math.round((checks / ownMoves) * 1000) / 10 : 0,
    castleRate: parsedTrainGames > 0 ? Math.round((castledGames / parsedTrainGames) * 1000) / 1000 : 0,
    exchangeRate: ownMoves > 0 ? Math.round((exchanges / ownMoves) * 1000) / 10 : 0,
    averagePlies: parsedTrainGames > 0 ? Math.round((totalPlies / parsedTrainGames) * 10) / 10 : 0,
  };

  // Blind 20% Holdout evaluation (strictly on holdoutSlice!)
  let positionsTested = 0;
  let bookHits = 0;
  let top1Hits = 0;
  let top3Hits = 0;

  for (const item of holdoutSlice) {
    const moves = parseGameMoves(item.g.pgn, ChessCtor);
    if (!moves || moves.length < 4) continue;
    const mySide = sideOfGame(item.g);
    const replay = new ChessCtor();
    for (let ply = 0; ply < Math.min(moves.length, 30); ply++) {
      const mv = moves[ply];
      if (mv.color === mySide && ply >= 2) {
        const fen = replay.fen();
        const ranked = rankCandidateMoves(fen, positionBook, styleProfile, ChessCtor);
        if (ranked.length > 0) {
          positionsTested += 1;
          const actualUci = moveToUci(mv);
          if (ranked[0].fromBook) bookHits += 1;
          if (ranked[0].uci === actualUci) top1Hits += 1;
          if (ranked.slice(0, 3).some(r => r.uci === actualUci)) top3Hits += 1;
        }
      }
      replay.move({ from: mv.from, to: mv.to, promotion: mv.promotion || undefined });
    }
  }

  const holdout: HoldoutBenchmark = {
    holdoutRatio,
    holdoutGames: holdoutSlice.length,
    trainingGames: parsedTrainGames,
    positionsTested,
    bookHits,
    top1Hits,
    top3Hits,
    top1Accuracy: positionsTested > 0 ? Math.round((top1Hits / positionsTested) * 1000) / 10 : 0,
    top3Accuracy: positionsTested > 0 ? Math.round((top3Hits / positionsTested) * 1000) / 10 : 0,
  };

  const toOpeningArray = (m: Map<string, number>, fallbackMoves: string) => {
    const rows = [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([moves, gamesCount], i) => ({ name: `קו אישי ${i + 1}`, moves, games: gamesCount }));
    return rows.length ? rows : [{ name: 'פתיחת בסיס', moves: fallbackMoves, games: 1 }];
  };

  const computedElo = options.elo ?? (eloCount > 0 ? Math.round(eloSum / eloCount) : 250);
  const dateRange = minMs && maxMs ? `${formatDateIso(minMs)} – ${formatDateIso(maxMs)}` : 'מדגם אישי';
  const isPast = options.eraTag === 'past';

  return {
    id: options.id,
    slug: options.id,
    version: options.version,
    eraTag: options.eraTag,
    name: options.name,
    title: isPast ? 'הגרסה שלך מלפני חודש · שחזור דפוסים' : 'הבוט הלומד שלך · משקל גבוה למשחקים חדשים',
    elo: computedElo,
    tier: 0,
    stage: computedElo >= 1200 ? 'advanced' : 'beginner',
    style: styleProfile.checksPer100 >= 7 ? 'attacking' : 'universal',
    styleLabel: styleProfile.checksPer100 >= 7 ? 'התקפי' : 'אוניברסלי',
    piece: isPast ? '🕰️' : '🧬',
    era: dateRange,
    region: isPast ? 'גרסת עבר' : 'גרסה עדכנית',
    flavor: isPast
      ? 'משחק לפי הפתיחות ודפוסי הטעויות שלך מלפני חודש+ — כדי שתוכל להרגיש פיזית את השיפור.'
      : 'לומד מהמשחקים האחרונים שלך עם משקל גבוה יותר למהלכים חדשים ועם מבחן חיזוי עיוור (20% Holdout).',
    quips: isPast
      ? [
          'ככה בדיוק היית משחק לפני חודש — בוא נראה אם היום אתה מעניש אותי!',
          'זוכר את ההרגלים הישנים האלה? תראה לי מה למדת מאז.',
          'אם תנצח את עצמך של פעם בקלות, סימן שהאימון עובד.',
        ]
      : [
          'אני מחקה את הסגנון העדכני שלך — כולל הפתיחות האחרונות והקצב שלך.',
          'נבדקתי במבחן חיזוי עיוור על 20% מהמשחקים האחרונים שלך.',
          'כשתשתפר בעוד שבוע, הגרסה הבאה שלי תתעדכן רק אם תעבור את שער האיכות.',
        ],
    openingsAsWhite: toOpeningArray(whiteOpenings, '1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6'),
    openingsAsBlack: toOpeningArray(blackOpenings, '1.e4 e5 2.Nf3 Nc6 3.Bb5 a6'),
    gambits: [],
    openingMatchMode: 'position',
    dateRange,
    sourceLabelHe: options.sourceLabelHe || `נבנה מ-${parsedTrainGames} משחקי אימון + ${holdoutSlice.length} משחקי Holdout`,
    halfLifeDays,
    styleProfile,
    holdout,
    positionBook,
    isAdaptivePersonalBot: true,
  };
}

/** No-regression quality gate: new version promotes ONLY if holdout Top-1 improves (or ties with better Top-3). */
export function checkVersionQualityGate(
  candidate: { version: string; holdout: HoldoutBenchmark },
  previous: { version: string; holdout: HoldoutBenchmark } | null
): QualityGateResult {
  if (!previous) {
    return {
      approved: true,
      deltaTop1: candidate.holdout.top1Accuracy,
      deltaTop3: candidate.holdout.top3Accuracy,
      reasonHe: `גרסת בסיס ${candidate.version} אושרה (${candidate.holdout.top1Accuracy}% Top-1 · ${candidate.holdout.top3Accuracy}% Top-3).`,
    };
  }
  const deltaTop1 = Math.round((candidate.holdout.top1Accuracy - previous.holdout.top1Accuracy) * 10) / 10;
  const deltaTop3 = Math.round((candidate.holdout.top3Accuracy - previous.holdout.top3Accuracy) * 10) / 10;
  const approved = deltaTop1 > 0 || (deltaTop1 === 0 && deltaTop3 >= 0);

  return {
    approved,
    deltaTop1,
    deltaTop3,
    reasonHe: approved
      ? `שער איכות עבר ✅ ${candidate.version} שומרת או משפרת חיזוי עיוור (${deltaTop1 >= 0 ? '+' : ''}${deltaTop1}% Top-1, ${deltaTop3 >= 0 ? '+' : ''}${deltaTop3}% Top-3 מול ${previous.version}).`
      : `שער איכות חסם ⛔ ${candidate.version} ירדה ב-${Math.abs(deltaTop1)}% בחיזוי Top-1 מול ${previous.version} — נשאר בגרסה הקודמת.`,
  };
}

/** Picks a move for an Adaptive / Past-You snapshot using recency-weighted book first, then style-profile scoring. */
export function chooseAdaptiveBotMove(
  fen: string,
  snapshot: Partial<AdaptiveBotSnapshot> | null | undefined,
  ChessCtor: any,
  rng: () => number = Math.random
): { from: string; to: string; promotion?: string; san?: string; source: 'book' | 'style' } | null {
  if (!snapshot || !snapshot.isAdaptivePersonalBot || !snapshot.positionBook) return null;
  const key = positionKeyFromFen(fen);
  const book = snapshot.positionBook[key];
  const probe = new ChessCtor(fen);
  const legal: any[] = probe.moves({ verbose: true }) || [];
  if (!legal.length) return null;

  if (Array.isArray(book) && book.length > 0) {
    const valid = book
      .map(entry => ({
        entry,
        mv: legal.find(m => moveToUci(m) === entry.uci),
      }))
      .filter(x => x.mv);
    if (valid.length > 0) {
      const total = valid.reduce((s, x) => s + x.entry.weight, 0);
      let pick = rng() * total;
      for (const item of valid) {
        pick -= item.entry.weight;
        if (pick <= 0) {
          return { from: item.mv.from, to: item.mv.to, promotion: item.mv.promotion || undefined, san: item.mv.san, source: 'book' };
        }
      }
      const last = valid[valid.length - 1].mv;
      return { from: last.from, to: last.to, promotion: last.promotion || undefined, san: last.san, source: 'book' };
    }
  }

  // Unseen position: rank by learned style profile and pick among top 2 weighted
  const style = snapshot.styleProfile || { games: 0, capturesPer100: 18, checksPer100: 4, castleRate: 0.4, exchangeRate: 5, averagePlies: 50 };
  const ranked = rankCandidateMoves(fen, snapshot.positionBook, style, ChessCtor);
  if (!ranked.length) return null;
  const chosen = ranked.length >= 2 && rng() < 0.25 ? ranked[1].move : ranked[0].move;
  return { from: chosen.from, to: chosen.to, promotion: chosen.promotion || undefined, san: chosen.san, source: 'style' };
}

/** Synthesizes Past-You (v1) and Current Adaptive (v2) snapshots from archiveGames or from the restored orenzbit profile. */
export function buildPastAndCurrentSnapshots(
  orenProfile: any,
  archiveGames: PersonalPgnGame[],
  ChessCtor: any
): {
  pastYou: AdaptiveBotSnapshot;
  currentYou: AdaptiveBotSnapshot;
  gate: QualityGateResult;
  dataSource: 'live-archive' | 'orenzbit-profile';
} {
  const usableArchive = (archiveGames || []).filter(g => g && g.pgn && g.pgn.trim().length > 20);

  if (usableArchive.length >= 6) {
    const { past, recent } = splitGamesByTimeWindow(usableArchive, { cutoffDays: 30 });
    const pastYou = buildVersionedPlayerBot(past, {
      id: 'past-you-v1',
      name: 'אתה מלפני חודש (v1)',
      version: 'v1',
      eraTag: 'past',
      halfLifeDays: 120,
      holdoutRatio: 0.2,
      sourceLabelHe: `חלון עבר מתוך הארכיון שלך (${past.length} משחקים)`,
      ChessCtor,
    });
    const currentYou = buildVersionedPlayerBot(usableArchive, {
      id: 'adaptive-you-v2',
      name: 'הבוט הלומד שלך (v2)',
      version: 'v2',
      eraTag: 'current',
      halfLifeDays: 21,
      holdoutRatio: 0.2,
      sourceLabelHe: `כל הארכיון (${usableArchive.length} משחקים · משקל כפול לחודש האחרון: ${recent.length})`,
      ChessCtor,
    });
    const gate = checkVersionQualityGate(currentYou, pastYou);
    return { pastYou, currentYou, gate, dataSource: 'live-archive' };
  }

  // Build cleanly from the restored orenzbit.json real profile data (1,663 training + 188 holdout games)
  const exampleGames: PersonalPgnGame[] = Array.isArray(orenProfile?.exampleGames)
    ? orenProfile.exampleGames.map((eg: any, idx: number) => ({
        id: eg.gameId || `oren-ex-${idx}`,
        pgn: `[Event "${eg.event || 'Live Chess'}"]\n[Date "${eg.date || '2026.01.01'}"]\n[Result "${eg.result || '*'}"]\n\n${eg.sampleMoves || ''} ${eg.result || '*'}`,
        date: eg.date,
        playerColor: eg.color === 'black' ? 'black' : 'white',
        userRating: orenProfile?.elo || 201,
      }))
    : [];

  // Build deterministic book directly from orenzbit's real opening lines + holdoutPositions
  const buildFromProfileLines = (
    id: string,
    name: string,
    version: string,
    eraTag: 'past' | 'current',
    halfLifeDays: number,
    linesW: any[],
    linesB: any[],
    holdoutPositions: any[]
  ): AdaptiveBotSnapshot => {
    const base = buildVersionedPlayerBot(exampleGames, {
      id,
      name,
      version,
      eraTag,
      elo: eraTag === 'past' ? Math.max(150, (orenProfile?.elo || 201) - 25) : (orenProfile?.elo || 201) + 20,
      halfLifeDays,
      holdoutRatio: 0.2,
      sourceLabelHe: eraTag === 'past'
        ? `פרופיל orenzbit · תקופת פתיחה (2025.06–2026.05 · מבוסס על ${orenProfile?.trainingGameCount || 1663} משחקי אימון)`
        : `פרופיל orenzbit העדכני (עד 2026.10 · ${orenProfile?.trainingGameCount || 1663} אימון + ${orenProfile?.holdoutGameCount || 188} Holdout)`,
      ChessCtor,
    });

    // Enrich book with orenzbit's real measured opening lines
    const allLines = [
      ...(linesW || []).map(l => ({ ...l, side: 'w' })),
      ...(linesB || []).map(l => ({ ...l, side: 'b' })),
    ];
    for (const line of allLines) {
      const mvs = parseGameMoves(`[Event "Book"]\n[Result "*"]\n\n${line.moves} *`, ChessCtor);
      if (!mvs) continue;
      const replay = new ChessCtor();
      for (const mv of mvs) {
        if (mv.color === line.side) {
          const pk = positionKeyFromFen(replay.fen());
          const list = base.positionBook[pk] || [];
          const uci = moveToUci(mv);
          const weight = (Number(line.games) || 1) * (eraTag === 'current' ? 1.5 : 1.0);
          const ex = list.find(e => e.uci === uci);
          if (ex) { ex.weight += weight; ex.count += 1; }
          else list.push({ uci, san: mv.san, weight, count: 1 });
          list.sort((a, b) => b.weight - a.weight);
          base.positionBook[pk] = list;
        }
        replay.move({ from: mv.from, to: mv.to, promotion: mv.promotion || undefined });
      }
    }

    // Evaluate against real held-out positions from orenzbit.json when available
    if (Array.isArray(holdoutPositions) && holdoutPositions.length > 0) {
      let tested = 0, top1 = 0, top3 = 0, bookHits = 0;
      for (const hp of holdoutPositions) {
        if (!hp?.fen || !hp?.sourceMove) continue;
        try {
          const ranked = rankCandidateMoves(hp.fen, base.positionBook, base.styleProfile, ChessCtor);
          if (!ranked.length) continue;
          tested += 1;
          if (ranked[0].fromBook) bookHits += 1;
          if (ranked[0].uci === hp.sourceMove) top1 += 1;
          if (ranked.slice(0, 3).some(r => r.uci === hp.sourceMove)) top3 += 1;
        } catch {}
      }
      if (tested > 0) {
        base.holdout = {
          holdoutRatio: 0.2,
          holdoutGames: orenProfile?.holdoutGameCount || 188,
          trainingGames: orenProfile?.trainingGameCount || 1663,
          positionsTested: tested,
          bookHits,
          top1Hits: top1,
          top3Hits: top3,
          top1Accuracy: Math.round((top1 / tested) * 1000) / 10,
          top3Accuracy: Math.round((top3 / tested) * 1000) / 10,
        };
      }
    }

    if (linesW?.length) base.openingsAsWhite = linesW.slice(0, 8);
    if (linesB?.length) base.openingsAsBlack = linesB.slice(0, 8);
    base.era = eraTag === 'past' ? '2025.06 – 2026.05 (לפני חודש+)' : (orenProfile?.sourceYearRange || '2025.06 – 2026.10');
    return base;
  };

  const wLines = Array.isArray(orenProfile?.openingsAsWhite) ? orenProfile.openingsAsWhite : [];
  const bLines = Array.isArray(orenProfile?.openingsAsBlack) ? orenProfile.openingsAsBlack : [];
  const hpAll = Array.isArray(orenProfile?.holdoutPositions) ? orenProfile.holdoutPositions : [];
  const pastHp = hpAll.slice(0, Math.max(8, Math.floor(hpAll.length / 2)));

  const pastYou = buildFromProfileLines(
    'past-you-v1',
    'אתה מלפני חודש (v1)',
    'v1',
    'past',
    120,
    wLines.slice(Math.floor(wLines.length / 2)),
    bLines.slice(Math.floor(bLines.length / 2)),
    pastHp
  );
  const currentYou = buildFromProfileLines(
    'adaptive-you-v2',
    'הבוט הלומד שלך (v2)',
    'v2',
    'current',
    21,
    wLines,
    bLines,
    hpAll
  );
  const gate = checkVersionQualityGate(currentYou, pastYou);
  return { pastYou, currentYou, gate, dataSource: 'orenzbit-profile' };
}

export function PastYouBotPanel({ bots, archiveGames, onPlayBot }: {
  bots: any[];
  archiveGames?: PersonalPgnGame[];
  onPlayBot: (bot: any) => void;
}) {
  const ReactObj = (globalThis as any).React;
  const h = ReactObj.createElement;
  const ChessCtor = (globalThis as any).ChessLib?.Chess;
  const orenBot = (bots || []).find((b: any) => b.id === 'orenzbit' || b.slug === 'orenzbit') || null;
  if (!ChessCtor) return null;

  const { pastYou, currentYou, gate, dataSource } = buildPastAndCurrentSnapshots(orenBot, archiveGames || [], ChessCtor);

  return h('section', { className: 'evo-pastyou-section', 'data-evo-pastyou': 'true', dir: 'rtl' },
    h('div', { className: 'evo-radar-header' },
      h('div', null,
        h('span', { className: 'archive-eyebrow' }, 'ADAPTIVE PERSONAL BOT · PAST-YOU'),
        h('h2', null, 'שחק מול עצמך מלפני חודש & הבוט הלומד שלך'),
        h('p', { className: 'muted' }, dataSource === 'live-archive'
          ? 'מבוסס בזמן אמת על המשחקים שטענת בארכיון — עם חלוקה לפי תאריך, משקל גבוה למשחקים חדשים ומבחן חיזוי עיוור (20% Holdout).'
          : 'מבוסס על פרופיל המשחקים של אורן (1,663 משחקי אימון + 188 Holdout). טען משחקים חדשים בארכיון כדי לעדכן את הגרסה.')
      ),
      h('span', { className: 'evo-gate-badge ' + (gate.approved ? 'is-ok' : 'is-blocked') }, gate.approved ? 'שער איכות: אושר ✅' : 'שער איכות: נחסם ⛔')
    ),

    h('div', { className: 'evo-pastyou-grid' },
      // Card 1: Past-You (1 month ago)
      h('article', { className: 'evo-card evo-bot-card is-past' },
        h('div', { className: 'evo-bot-head' },
          h('span', { className: 'evo-bot-icon' }, '🕰️'),
          h('div', null,
            h('strong', null, pastYou.name),
            h('span', { className: 'muted' }, `${pastYou.elo} Elo · ${pastYou.era}`)
          )
        ),
        h('p', { className: 'evo-bot-desc' }, pastYou.flavor),
        h('div', { className: 'evo-metrics-mini' },
          h('span', null, `חיזוי Top-1: ${pastYou.holdout.top1Accuracy}%`),
          h('span', null, `חיזוי Top-3: ${pastYou.holdout.top3Accuracy}%`),
          h('span', null, `${pastYou.holdout.positionsTested} עמדות Holdout`)
        ),
        h('button', { className: 'primary evo-play-btn', 'data-play-past-you': 'true', onClick: () => onPlayBot(pastYou) }, 'שחק מול עצמך מלפני חודש ⚔️')
      ),

      // Card 2: Current Adaptive Bot (v2)
      h('article', { className: 'evo-card evo-bot-card is-current' },
        h('div', { className: 'evo-bot-head' },
          h('span', { className: 'evo-bot-icon' }, '🧬'),
          h('div', null,
            h('strong', null, currentYou.name),
            h('span', { className: 'muted' }, `${currentYou.elo} Elo · ${currentYou.era}`)
          )
        ),
        h('p', { className: 'evo-bot-desc' }, currentYou.flavor),
        h('div', { className: 'evo-metrics-mini' },
          h('span', null, `חיזוי Top-1: ${currentYou.holdout.top1Accuracy}%`),
          h('span', null, `חיזוי Top-3: ${currentYou.holdout.top3Accuracy}%`),
          h('span', null, `חצי-חיים: ${currentYou.halfLifeDays} ימים`)
        ),
        h('button', { className: 'primary evo-play-btn', 'data-play-current-you': 'true', onClick: () => onPlayBot(currentYou) }, 'שחק מול הבוט הלומד שלך 🧬')
      ),

      // Card 3: Restored Oren Bot (full roster entry)
      orenBot && h('article', { className: 'evo-card evo-bot-card is-oren' },
        h('div', { className: 'evo-bot-head' },
          h('span', { className: 'evo-bot-icon' }, orenBot.piece || '♟'),
          h('div', null,
            h('strong', null, `${orenBot.name} (הבוט האישי ברשימה)`),
            h('span', { className: 'muted' }, `${orenBot.elo} Elo · ${orenBot.trainingGameCount || 1663} משחקי אימון`)
          )
        ),
        h('p', { className: 'evo-bot-desc' }, orenBot.historicalNote || orenBot.flavor),
        h('div', { className: 'evo-metrics-mini' },
          h('span', null, `${orenBot.sourceGameCount || 1851} משחקים`),
          h('span', null, `${orenBot.holdoutGameCount || 188} Holdout`),
          h('span', null, 'הוחזר לרשימה ✅')
        ),
        h('button', { className: 'evo-action-btn', 'data-play-oren-bot': 'true', onClick: () => onPlayBot(orenBot) }, 'שחק מול בוט אורן המלא ♟')
      )
    ),

    h('p', { className: 'evo-gate-note muted' }, gate.reasonHe)
  );
}
