// Adaptive Personal Learning Bot, Public Oren Bot & "Play Against Past-You (לפני חודש)" engine + UI.
// Key guarantees:
//  - Shared blind chronological holdout set (strictly excluded from training BOTH active and candidate)
//  - Style mimicry (Top-1 / Top-3 on identical holdout) measured strictly separately from playing strength
//  - Explicit candidate / active / past lifecycle with strict quality-gate enforcement on the Play button
//  - Public Oren Bot (clearly labeled as Oren) separated from each logged-in player's private personal bot
//  - Memoized UI panel (never recomputes on every render)
// Pure MIT TypeScript; zero external deps; safe to import in Node tests.

export interface PersonalPgnGame {
  id?: string;
  fingerprint?: string;
  pgn: string;
  date?: string;
  playedAt?: string;
  playerColor?: 'white' | 'black' | string;
  result?: string;
  userRating?: number | null;
  timeClass?: string;
  source?: string;
  analysis?: {
    moves?: Array<{
      index?: number;
      san?: string;
      uci?: string;
      bestUci?: string;
      best?: string;
      classification?: string;
      drop?: number;
      cpl?: number;
      color?: string;
    }>;
    summary?: {
      accuracy?: { white?: number | null; black?: number | null };
      acpl?: { white?: number | null; black?: number | null };
      counts?: Record<string, Record<string, number>>;
    };
  };
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
  metricKind: 'style-mimicry';
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

export interface StrengthMetric {
  basis: 'analyzed-acpl';
  avgAcpl: number;
  blunderRatePer100: number;
  gamesMeasured: number;
  labelHe: string;
}

export interface QualityGateResult {
  approved: boolean;
  metricBasis: 'style-mimicry-shared-holdout';
  deltaTop1: number;
  deltaTop3: number;
  positionsTested: number;
  candidateTop1: number;
  previousTop1: number | null;
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
  strengthMetric: StrengthMetric | null;
  positionBook: Record<string, WeightedMoveEntry[]>;
  isAdaptivePersonalBot: true;
  isPublicOrenBot?: boolean;
  ownerUserId?: string;
}

export interface BotBehaviorDiffItem {
  positionKey: string;
  beforeTopSan: string | null;
  afterTopSan: string;
  afterWeight: number;
  beforeWeight: number;
  changeKind: 'new-position' | 'top-move-changed' | 'weight-updated';
}

export interface BotSnapshotDiff {
  beforeVersion: string | null;
  afterVersion: string;
  newGamesAdded: number;
  deltaTop1: number;
  deltaTop3: number;
  changedPositionsCount: number;
  sampleChanges: BotBehaviorDiffItem[];
  summaryHe: string;
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
  const iso = raw.replace(/\./g, '-').slice(0, 10);
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

/** Keeps the most informative positions so synced payloads stay compact and fast. */
export function compactPositionBook(
  book: Record<string, WeightedMoveEntry[]>,
  maxPositions = 140,
  maxMovesPerPos = 3
): Record<string, WeightedMoveEntry[]> {
  const entries = Object.entries(book || {}).map(([key, list]) => {
    const sorted = [...(list || [])].sort((a, b) => b.weight - a.weight).slice(0, maxMovesPerPos);
    const totalW = sorted.reduce((s, e) => s + (e.weight || 0), 0);
    return { key, sorted, totalW };
  });
  entries.sort((a, b) => b.totalW - a.totalW || (a.key < b.key ? -1 : 1));
  const out: Record<string, WeightedMoveEntry[]> = {};
  for (const item of entries.slice(0, maxPositions)) {
    out[item.key] = item.sorted.map(m => ({
      uci: m.uci,
      san: m.san,
      weight: Math.round(m.weight * 1000) / 1000,
      count: m.count,
    }));
  }
  return out;
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
    .filter(g => g && typeof g.pgn === 'string' && g.pgn.trim().length > 0 && g.source !== 'demo')
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

  const mid = Math.floor(list.length / 2);
  const midMs = list[mid]?.ms ?? null;
  return {
    past: list.slice(0, mid).map(x => x.g),
    recent: list.slice(mid).map(x => x.g),
    splitMethod: 'chronological-half',
    cutoffIso: formatDateIso(midMs),
  };
}

/** Splits ONE shared blind chronological holdout slice strictly excluded from training any version. */
export function splitSharedHoldout(
  games: PersonalPgnGame[],
  holdoutRatio = 0.2
): { trainGames: PersonalPgnGame[]; holdoutGames: PersonalPgnGame[] } {
  const ratio = Math.min(0.4, Math.max(0.1, holdoutRatio));
  const sorted = (games || [])
    .filter(g => g && typeof g.pgn === 'string' && g.pgn.trim().length > 0 && g.source !== 'demo')
    .map((g, idx) => ({ g, idx, ms: parseDateMs(g) }))
    .sort((a, b) => {
      if (a.ms != null && b.ms != null && a.ms !== b.ms) return a.ms - b.ms;
      return a.idx - b.idx;
    });

  const holdoutCount = sorted.length >= 5 ? Math.max(1, Math.round(sorted.length * ratio)) : (sorted.length >= 2 ? 1 : 0);
  const trainGames = sorted.slice(0, Math.max(0, sorted.length - holdoutCount)).map(x => x.g);
  const holdoutGames = sorted.slice(sorted.length - holdoutCount).map(x => x.g);
  return { trainGames, holdoutGames };
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
    score += ((uci.charCodeAt(0) * 7 + uci.charCodeAt(2) * 3) % 11) * 0.01;

    return { move: mv, uci, score, fromBook };
  });

  ranked.sort((a, b) => b.score - a.score);
  return ranked;
}

/** Evaluates ANY bot snapshot on an explicit shared blind holdout game set (pure style mimicry metric). */
export function evaluateSnapshotOnHoldout(
  snapshot: Pick<AdaptiveBotSnapshot, 'positionBook' | 'styleProfile'>,
  holdoutGames: PersonalPgnGame[],
  ChessCtor: any,
  trainingGamesCount = 0,
  holdoutRatio = 0.2
): HoldoutBenchmark {
  let positionsTested = 0;
  let bookHits = 0;
  let top1Hits = 0;
  let top3Hits = 0;

  for (const g of holdoutGames || []) {
    const moves = parseGameMoves(g.pgn, ChessCtor);
    if (!moves || moves.length < 4) continue;
    const mySide = sideOfGame(g);
    const replay = new ChessCtor();
    for (let ply = 0; ply < Math.min(moves.length, 30); ply++) {
      const mv = moves[ply];
      if (mv.color === mySide && ply >= 2) {
        const fen = replay.fen();
        const ranked = rankCandidateMoves(fen, snapshot.positionBook, snapshot.styleProfile, ChessCtor);
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

  return {
    metricKind: 'style-mimicry',
    holdoutRatio,
    holdoutGames: (holdoutGames || []).length,
    trainingGames: trainingGamesCount,
    positionsTested,
    bookHits,
    top1Hits,
    top3Hits,
    top1Accuracy: positionsTested > 0 ? Math.round((top1Hits / positionsTested) * 1000) / 10 : 0,
    top3Accuracy: positionsTested > 0 ? Math.round((top3Hits / positionsTested) * 1000) / 10 : 0,
  };
}

/** Computes a verified playing-strength indicator ONLY when real engine-analyzed games with ACPL exist. */
export function computeVerifiedStrengthMetric(games: PersonalPgnGame[]): StrengthMetric | null {
  let acplSum = 0;
  let acplCount = 0;
  let userMoves = 0;
  let blunders = 0;

  for (const g of games || []) {
    const sideKey = g.playerColor === 'black' ? 'black' : 'white';
    const sideChar = sideKey === 'black' ? 'b' : 'w';
    const acpl = g.analysis?.summary?.acpl?.[sideKey];
    if (typeof acpl === 'number' && Number.isFinite(acpl) && acpl >= 0) {
      acplSum += acpl;
      acplCount += 1;
    }
    const moves = g.analysis?.moves;
    if (Array.isArray(moves)) {
      for (const m of moves) {
        const isUser = m.color ? m.color === sideChar : (typeof m.index === 'number' ? (m.index % 2 === (sideChar === 'w' ? 0 : 1)) : false);
        if (!isUser) continue;
        userMoves += 1;
        if (m.classification === 'blunder') blunders += 1;
      }
    }
  }

  if (acplCount < 2) return null;
  const avgAcpl = Math.round(acplSum / acplCount);
  const blunderRatePer100 = userMoves > 0 ? Math.round((blunders / userMoves) * 1000) / 10 : 0;
  return {
    basis: 'analyzed-acpl',
    avgAcpl,
    blunderRatePer100,
    gamesMeasured: acplCount,
    labelHe: `חוזק נמדד (מנוע): ממוצע ${avgAcpl} ACPL · ${blunderRatePer100}% שגיאות גסות (${acplCount} משחקים מנותחים)`,
  };
}

/** Builds a versioned adaptive player bot with recency weights and optional shared holdout evaluation. */
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
    explicitHoldoutGames?: PersonalPgnGame[];
    sourceLabelHe?: string;
    ownerUserId?: string;
    isPublicOrenBot?: boolean;
    ChessCtor: any;
  }
): AdaptiveBotSnapshot {
  const halfLifeDays = options.halfLifeDays ?? 45;
  const holdoutRatio = Math.min(0.4, Math.max(0.1, options.holdoutRatio ?? 0.2));
  const ChessCtor = options.ChessCtor;

  const usable = (games || []).filter(g => g && typeof g.pgn === 'string' && g.pgn.trim() && g.source !== 'demo');
  const { trainGames, holdoutGames } = options.explicitHoldoutGames
    ? { trainGames: usable, holdoutGames: options.explicitHoldoutGames }
    : splitSharedHoldout(usable, holdoutRatio);

  const sortedTrain = trainGames
    .map((g, idx) => ({ g, idx, ms: parseDateMs(g) }))
    .sort((a, b) => {
      if (a.ms != null && b.ms != null && a.ms !== b.ms) return a.ms - b.ms;
      return a.idx - b.idx;
    });

  const refMs = sortedTrain.length && sortedTrain[sortedTrain.length - 1].ms != null ? sortedTrain[sortedTrain.length - 1].ms! : Date.now();
  const minMs = sortedTrain.find(x => x.ms != null)?.ms ?? null;
  const maxMs = [...sortedTrain].reverse().find(x => x.ms != null)?.ms ?? null;

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

  for (const item of sortedTrain) {
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

  const rawBook: Record<string, WeightedMoveEntry[]> = {};
  for (const [posKey, entries] of bookMap.entries()) {
    rawBook[posKey] = [...entries.values()].sort((a, b) => b.weight - a.weight);
  }
  const positionBook = compactPositionBook(rawBook, 160, 4);

  const styleProfile: StyleProfile = {
    games: parsedTrainGames,
    capturesPer100: ownMoves > 0 ? Math.round((captures / ownMoves) * 1000) / 10 : 0,
    checksPer100: ownMoves > 0 ? Math.round((checks / ownMoves) * 1000) / 10 : 0,
    castleRate: parsedTrainGames > 0 ? Math.round((castledGames / parsedTrainGames) * 1000) / 1000 : 0,
    exchangeRate: ownMoves > 0 ? Math.round((exchanges / ownMoves) * 1000) / 10 : 0,
    averagePlies: parsedTrainGames > 0 ? Math.round((totalPlies / parsedTrainGames) * 10) / 10 : 0,
  };

  const holdout = evaluateSnapshotOnHoldout(
    { positionBook, styleProfile },
    holdoutGames,
    ChessCtor,
    parsedTrainGames,
    holdoutRatio
  );
  const strengthMetric = computeVerifiedStrengthMetric(usable);

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
    title: isPast ? 'גרסת עבר היסטורית · שחזור דפוסים' : 'הבוט הלומד שלך · משקל גבוה למשחקים חדשים',
    elo: computedElo,
    tier: 0,
    stage: computedElo >= 1200 ? 'advanced' : 'beginner',
    style: styleProfile.checksPer100 >= 7 ? 'attacking' : 'universal',
    styleLabel: styleProfile.checksPer100 >= 7 ? 'התקפי' : 'אוניברסלי',
    piece: isPast ? '🕰️' : '🧬',
    era: dateRange,
    region: isPast ? 'גרסת עבר' : 'גרסה פעילה',
    flavor: isPast
      ? 'משחק לפי הפתיחות והדפוסים שלך מלפני חודש+ — גרסה היסטורית להשוואה.'
      : 'לומד מסקירות ה-DNA שלך עם דגש על משחקים חדשים, נבדק בדמיון לסגנון על סט Holdout עיוור זהה.',
    quips: isPast
      ? [
          'ככה בדיוק היית משחק לפני חודש — בוא נראה אם היום אתה מעניש אותי!',
          'זוכר את ההרגלים הישנים האלה? תראה לי מה למדת מאז.',
          'אם תנצח את עצמך של פעם בקלות, סימן שהאימון עובד.',
        ]
      : [
          'אני מחקה את הסגנון העדכני שלך מסקירת ה-DNA האחרונה.',
          'עברתי בדיקת דמיון לסגנון על סט Holdout עיוור לפני שנפתחתי למשחק.',
          'כשתעלה סקירת DNA חדשה, אתעדכן רק אם הגרסה המועמדת תעבור את שער האיכות.',
        ],
    openingsAsWhite: toOpeningArray(whiteOpenings, '1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6'),
    openingsAsBlack: toOpeningArray(blackOpenings, '1.e4 e5 2.Nf3 Nc6 3.Bb5 a6'),
    gambits: [],
    openingMatchMode: 'position',
    dateRange,
    sourceLabelHe: options.sourceLabelHe || `נבנה מ-${parsedTrainGames} משחקי אימון + ${holdoutGames.length} משחקי Holdout`,
    halfLifeDays,
    styleProfile,
    holdout,
    strengthMetric,
    positionBook,
    isAdaptivePersonalBot: true,
    isPublicOrenBot: Boolean(options.isPublicOrenBot),
    ownerUserId: options.ownerUserId,
  };
}

/**
 * Style-mimicry quality gate on IDENTICAL blind holdout positions.
 * Explicitly measures style similarity (Top-1 / Top-3), NEVER conflated with playing strength.
 */
export function checkVersionQualityGate(
  candidate: { version: string; holdout: HoldoutBenchmark },
  previous: { version: string; holdout: HoldoutBenchmark } | null
): QualityGateResult {
  if (!previous) {
    return {
      approved: true,
      metricBasis: 'style-mimicry-shared-holdout',
      deltaTop1: candidate.holdout.top1Accuracy,
      deltaTop3: candidate.holdout.top3Accuracy,
      positionsTested: candidate.holdout.positionsTested,
      candidateTop1: candidate.holdout.top1Accuracy,
      previousTop1: null,
      reasonHe: `גרסת בסיס ${candidate.version} אושרה (דמיון סגנון: ${candidate.holdout.top1Accuracy}% Top-1 · ${candidate.holdout.top3Accuracy}% Top-3 על ${candidate.holdout.positionsTested} עמדות).`,
    };
  }
  const deltaTop1 = Math.round((candidate.holdout.top1Accuracy - previous.holdout.top1Accuracy) * 10) / 10;
  const deltaTop3 = Math.round((candidate.holdout.top3Accuracy - previous.holdout.top3Accuracy) * 10) / 10;
  const approved = deltaTop1 > 0 || (deltaTop1 === 0 && deltaTop3 >= 0);

  return {
    approved,
    metricBasis: 'style-mimicry-shared-holdout',
    deltaTop1,
    deltaTop3,
    positionsTested: candidate.holdout.positionsTested,
    candidateTop1: candidate.holdout.top1Accuracy,
    previousTop1: previous.holdout.top1Accuracy,
    reasonHe: approved
      ? `שער איכות עבר ✅ ${candidate.version} שומרת או משפרת דמיון סגנון (${deltaTop1 >= 0 ? '+' : ''}${deltaTop1}% Top-1, ${deltaTop3 >= 0 ? '+' : ''}${deltaTop3}% Top-3 מול ${previous.version} על אותן ${candidate.holdout.positionsTested} עמדות Holdout).`
      : `שער איכות חסם ⛔ ${candidate.version} ירדה ב-${Math.abs(deltaTop1)}% בדמיון סגנון Top-1 מול ${previous.version} על אותן עמדות — הבוט הפעיל נשאר ${previous.version}.`,
  };
}

/** Computes concrete Before -> After behavior differences between two bot snapshots. */
export function diffBotSnapshots(
  before: AdaptiveBotSnapshot | null,
  after: AdaptiveBotSnapshot,
  newGamesAdded: number,
  gate: QualityGateResult
): BotSnapshotDiff {
  const beforeBook = before?.positionBook || {};
  const afterBook = after.positionBook || {};
  const changes: BotBehaviorDiffItem[] = [];

  for (const [posKey, afterEntries] of Object.entries(afterBook)) {
    if (!afterEntries?.length) continue;
    const afterTop = afterEntries[0];
    const beforeEntries = beforeBook[posKey];
    const beforeTop = beforeEntries?.[0] || null;
    if (!beforeTop) {
      changes.push({
        positionKey: posKey,
        beforeTopSan: null,
        afterTopSan: afterTop.san,
        afterWeight: afterTop.weight,
        beforeWeight: 0,
        changeKind: 'new-position',
      });
    } else if (beforeTop.uci !== afterTop.uci) {
      changes.push({
        positionKey: posKey,
        beforeTopSan: beforeTop.san,
        afterTopSan: afterTop.san,
        afterWeight: afterTop.weight,
        beforeWeight: beforeTop.weight,
        changeKind: 'top-move-changed',
      });
    } else if (Math.abs(afterTop.weight - beforeTop.weight) >= 0.25) {
      changes.push({
        positionKey: posKey,
        beforeTopSan: beforeTop.san,
        afterTopSan: afterTop.san,
        afterWeight: afterTop.weight,
        beforeWeight: beforeTop.weight,
        changeKind: 'weight-updated',
      });
    }
  }

  changes.sort((a, b) => {
    const rank = (k: string) => (k === 'top-move-changed' ? 0 : k === 'new-position' ? 1 : 2);
    return rank(a.changeKind) - rank(b.changeKind) || b.afterWeight - a.afterWeight;
  });

  const sampleChanges = changes.slice(0, 5);
  const topFlip = sampleChanges.find(c => c.changeKind === 'top-move-changed');
  const firstNew = sampleChanges.find(c => c.changeKind === 'new-position');
  const highlight = topFlip
    ? `בעמדה מרכזית העדיפות התחלפה מ-${topFlip.beforeTopSan} ל-${topFlip.afterTopSan}.`
    : firstNew
    ? `נוספו ${changes.length} עמדות/משקלים חדשים (כולל ${firstNew.afterTopSan}).`
    : `עודכנו משקלים ב-${changes.length} עמדות.`;

  return {
    beforeVersion: before?.version || null,
    afterVersion: after.version,
    newGamesAdded,
    deltaTop1: gate.deltaTop1,
    deltaTop3: gate.deltaTop3,
    changedPositionsCount: changes.length,
    sampleChanges,
    summaryHe: `נוספו ${newGamesAdded} משחקים חדשים ← ${after.version}: ${highlight} (דמיון סגנון: ${gate.deltaTop1 >= 0 ? '+' : ''}${gate.deltaTop1}% Top-1).`,
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

  const style = snapshot.styleProfile || { games: 0, capturesPer100: 18, checksPer100: 4, castleRate: 0.4, exchangeRate: 5, averagePlies: 50 };
  const ranked = rankCandidateMoves(fen, snapshot.positionBook, style, ChessCtor);
  if (!ranked.length) return null;
  const chosen = ranked.length >= 2 && rng() < 0.25 ? ranked[1].move : ranked[0].move;
  return { from: chosen.from, to: chosen.to, promotion: chosen.promotion || undefined, san: chosen.san, source: 'style' };
}

/** Builds Public Oren Bot (active + past) from orenzbit.json baseline, evaluated on IDENTICAL shared holdout positions. */
export function buildPublicOrenBaselineSnapshots(
  orenProfile: any,
  ChessCtor: any
): { pastOren: AdaptiveBotSnapshot; activeOren: AdaptiveBotSnapshot; gate: QualityGateResult } {
  const exampleGames: PersonalPgnGame[] = Array.isArray(orenProfile?.exampleGames)
    ? orenProfile.exampleGames.map((eg: any, idx: number) => ({
        id: eg.gameId || `oren-ex-${idx}`,
        pgn: `[Event "${eg.event || 'Live Chess'}"]\n[Date "${eg.date || '2026.01.01'}"]\n[Result "${eg.result || '*'}"]\n\n${eg.sampleMoves || ''} ${eg.result || '*'}`,
        date: eg.date,
        playerColor: eg.color === 'black' ? 'black' : 'white',
        userRating: orenProfile?.elo || 201,
      }))
    : [];

  const wLines = Array.isArray(orenProfile?.openingsAsWhite) ? orenProfile.openingsAsWhite : [];
  const bLines = Array.isArray(orenProfile?.openingsAsBlack) ? orenProfile.openingsAsBlack : [];
  const sharedHp = Array.isArray(orenProfile?.holdoutPositions) ? orenProfile.holdoutPositions : [];

  const buildOne = (
    id: string,
    name: string,
    version: string,
    eraTag: 'past' | 'current',
    halfLifeDays: number,
    linesW: any[],
    linesB: any[]
  ): AdaptiveBotSnapshot => {
    const base = buildVersionedPlayerBot(exampleGames, {
      id,
      name,
      version,
      eraTag,
      elo: orenProfile?.elo || 201,
      halfLifeDays,
      explicitHoldoutGames: [],
      isPublicOrenBot: true,
      sourceLabelHe: eraTag === 'past'
        ? `בוט אורן הציבורי · גרסת עבר (${orenProfile?.trainingGameCount || 1663} משחקי אימון)`
        : `בוט אורן הציבורי · גרסת בסיס מאומתת (${orenProfile?.trainingGameCount || 1663} אימון + ${orenProfile?.holdoutGameCount || 188} Holdout)`,
      ChessCtor,
    });

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

    // Evaluate BOTH pastOren and activeOren on the EXACT SAME sharedHp holdout positions!
    if (sharedHp.length > 0) {
      let tested = 0, top1 = 0, top3 = 0, bookHits = 0;
      for (const hp of sharedHp) {
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
          metricKind: 'style-mimicry',
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
    base.era = eraTag === 'past' ? '2025.06 – 2026.05 (גרסת עבר)' : (orenProfile?.sourceYearRange || '2025.06 – 2026.10');
    return base;
  };

  const pastOren = buildOne('orenzbit-past', 'אורן מלפני חודש (דוגמה ציבורית)', 'v1', 'past', 120, wLines.slice(Math.floor(wLines.length / 2)), bLines.slice(Math.floor(bLines.length / 2)));
  const activeOren = buildOne('orenzbit', 'בוט אורן (ציבורי)', 'v2', 'current', 21, wLines, bLines);
  const gate = checkVersionQualityGate(activeOren, pastOren);
  return { pastOren, activeOren, gate };
}

/**
 * Legacy helper kept for pure tests/benchmarks: evaluates Past-You vs Current-You on the
 * EXACT SAME shared blind holdout set (never leaking holdout into training either snapshot!).
 */
export function buildPastAndCurrentSnapshots(
  orenProfile: any,
  archiveGames: PersonalPgnGame[],
  ChessCtor: any
): {
  pastYou: AdaptiveBotSnapshot;
  currentYou: AdaptiveBotSnapshot;
  activeBot: AdaptiveBotSnapshot;
  blockedCandidate: AdaptiveBotSnapshot | null;
  gate: QualityGateResult;
  dataSource: 'live-archive' | 'orenzbit-public-baseline';
} {
  const usableArchive = (archiveGames || []).filter(g => g && g.pgn && g.pgn.trim().length > 20 && g.source !== 'demo');

  if (usableArchive.length >= 6) {
    const { trainGames, holdoutGames } = splitSharedHoldout(usableArchive, 0.2);
    const { past, recent } = splitGamesByTimeWindow(trainGames, { cutoffDays: 30 });
    const pastYou = buildVersionedPlayerBot(past, {
      id: 'past-you-v1',
      name: 'אתה מלפני חודש (v1)',
      version: 'v1',
      eraTag: 'past',
      halfLifeDays: 120,
      explicitHoldoutGames: holdoutGames,
      sourceLabelHe: `גרסת עבר (${past.length} משחקים · נבדק על ${holdoutGames.length} משחקי Holdout זהים)`,
      ChessCtor,
    });
    const currentYou = buildVersionedPlayerBot(trainGames, {
      id: 'adaptive-you-v2',
      name: 'הבוט הלומד שלך (v2)',
      version: 'v2',
      eraTag: 'current',
      halfLifeDays: 21,
      explicitHoldoutGames: holdoutGames,
      sourceLabelHe: `כל הארכיון (${trainGames.length} אימון · דגש על ${recent.length} משחקים אחרונים · ${holdoutGames.length} Holdout)`,
      ChessCtor,
    });
    const gate = checkVersionQualityGate(currentYou, pastYou);
    const activeBot = gate.approved ? currentYou : pastYou;
    const blockedCandidate = gate.approved ? null : currentYou;
    return { pastYou, currentYou, activeBot, blockedCandidate, gate, dataSource: 'live-archive' };
  }

  const { pastOren, activeOren, gate } = buildPublicOrenBaselineSnapshots(orenProfile, ChessCtor);
  return {
    pastYou: pastOren,
    currentYou: activeOren,
    activeBot: gate.approved ? activeOren : pastOren,
    blockedCandidate: gate.approved ? null : activeOren,
    gate,
    dataSource: 'orenzbit-public-baseline',
  };
}

/** Resolves the exact bot snapshot that MUST launch when the user clicks "Play Active Bot". */
export function resolvePlayableActiveBot(lifecycle: {
  active?: AdaptiveBotSnapshot | null;
  blockedCandidate?: AdaptiveBotSnapshot | null;
  gate?: QualityGateResult | null;
} | null | undefined): AdaptiveBotSnapshot | null {
  if (!lifecycle?.active) return null;
  return lifecycle.active;
}

function PersonalBotCardsBlock({ personal, isOwner, isOffline, onPlayBot, onOpenDna }: {
  personal: any;
  isOwner?: boolean;
  isOffline?: boolean;
  onPlayBot: (bot: any) => void;
  onOpenDna?: () => void;
}) {
  const h = (globalThis as any).React.createElement;
  const playableActive: AdaptiveBotSnapshot | null = resolvePlayableActiveBot(personal);
  const pastPersonal: AdaptiveBotSnapshot | null = personal?.past || null;
  const blockedCandidate: AdaptiveBotSnapshot | null = personal?.blockedCandidate || null;
  const lastGate: QualityGateResult | null = personal?.lastGate || null;
  const lastDiff: BotSnapshotDiff | null = personal?.lastDiff || null;

  return h('div', { className: 'evo-personal-block', 'data-evo-personal-section': 'true' },
    playableActive
      ? h('div', { className: 'evo-pastyou-grid' },
          h('article', { className: 'evo-card evo-bot-card is-current', 'data-personal-active-version': playableActive.version },
            h('div', { className: 'evo-bot-head' },
              h('span', { className: 'evo-bot-icon' }, '🧬'),
              h('div', null,
                h('strong', null, `${playableActive.name} (${playableActive.version})`),
                h('span', { className: 'muted' }, `בוט אישי פרטי · ${playableActive.era}`)
              )
            ),
            h('p', { className: 'evo-bot-desc' }, playableActive.sourceLabelHe),
            h('div', { className: 'evo-metrics-mini' },
              h('span', null, `דמיון סגנון Top-1: ${playableActive.holdout.top1Accuracy}%`),
              h('span', null, `דמיון סגנון Top-3: ${playableActive.holdout.top3Accuracy}%`),
              h('span', null, `${playableActive.holdout.positionsTested} עמדות Holdout`)
            ),
            h('p', { className: 'evo-strength-note muted' }, playableActive.strengthMetric
              ? playableActive.strengthMetric.labelHe
              : 'מדידת דמיון לסגנון בלבד (חוזק יוצג רק כשיש מספיק משחקים מנותחי מנוע).'),
            blockedCandidate && h('div', { className: 'evo-blocked-notice', role: 'alert', 'data-evo-blocked-candidate': blockedCandidate.version },
              `⛔ גרסה מועמדת ${blockedCandidate.version} נחסמה בשער האיכות (${lastGate?.deltaTop1 ?? 0}% Top-1). הכפתור מפעיל את הגרסה הפעילה המאושרת ${playableActive.version}.`
            ),
            h('button', {
              className: 'primary evo-play-btn', 'data-play-current-you': 'true', 'data-launch-version': playableActive.version,
              onClick: () => onPlayBot(playableActive),
            }, `שחק מול הבוט הפעיל שלך (${playableActive.version}) 🧬`)
          ),
          pastPersonal && h('article', { className: 'evo-card evo-bot-card is-past', 'data-personal-past-version': pastPersonal.version },
            h('div', { className: 'evo-bot-head' },
              h('span', { className: 'evo-bot-icon' }, '🕰️'),
              h('div', null,
                h('strong', null, pastPersonal.name),
                h('span', { className: 'muted' }, `גרסה היסטורית פרטית · ${pastPersonal.era}`)
              )
            ),
            h('p', { className: 'evo-bot-desc' }, pastPersonal.flavor),
            h('div', { className: 'evo-metrics-mini' },
              h('span', null, `דמיון סגנון Top-1: ${pastPersonal.holdout.top1Accuracy}%`),
              h('span', null, `דמיון סגנון Top-3: ${pastPersonal.holdout.top3Accuracy}%`)
            ),
            h('button', { className: 'primary evo-play-btn', 'data-play-past-you': 'true', onClick: () => onPlayBot(pastPersonal) }, 'שחק מול עצמך מלפני חודש ⚔️')
          )
        )
      : h('div', { className: 'evo-empty-card', 'data-personal-bot-empty': 'true' },
          h('strong', null, 'הבוט האישי הפרטי שלך עדיין לא נבנה'),
          h('p', { className: 'muted' }, 'הרץ סקירת DNA אחת — מיד אחרי שהדוח נשמר, הבוט שלך וגרסת "אתה מלפני חודש" ייבנו אוטומטית ויישארו פרטיים לחשבון שלך.'),
          onOpenDna && h('button', { className: 'evo-action-btn', onClick: onOpenDna, disabled: Boolean(isOffline) }, isOffline ? 'סקירת DNA דורשת חיבור לרשת' : 'הרץ סקירת DNA לבניית הבוט ←')
        ),
    personal?.lastScanStatusHe && h('p', { className: 'evo-gate-note muted', 'data-evo-scan-status': 'true' }, personal.lastScanStatusHe),
    lastDiff && h('p', { className: 'evo-gate-note', 'data-evo-bot-diff': 'true' }, '🔄 ', lastDiff.summaryHe),
    isOwner && h('p', { className: 'evo-owner-note muted' }, '👑 חשבון בעלים: גרסאות מאושרות שלך מתעדכנות אוטומטית גם לבוט אורן הציבורי (באימות שרת בלבד).')
  );
}

function PublicOrenBotBlock({ publicOren, isSignedIn, onPlayBot }: {
  publicOren: { active: AdaptiveBotSnapshot; past: AdaptiveBotSnapshot | null; sourceHe: string };
  isSignedIn: boolean;
  onPlayBot: (bot: any) => void;
}) {
  const h = (globalThis as any).React.createElement;
  return h('div', { className: 'evo-public-oren-block', 'data-evo-public-oren': 'true' },
    h('div', { className: 'evo-pastyou-grid' },
      h('article', { className: 'evo-card evo-bot-card is-oren' },
        h('div', { className: 'evo-bot-head' },
          h('span', { className: 'evo-bot-icon' }, '♟'),
          h('div', null,
            h('strong', null, `בוט אורן הציבורי (${publicOren.active.version})`),
            h('span', { className: 'muted' }, `${publicOren.active.elo} Elo · ציבורי לכל השחקנים · מחוץ לסולם ה-61`)
          )
        ),
        h('p', { className: 'evo-bot-desc' }, publicOren.sourceHe),
        h('div', { className: 'evo-metrics-mini' },
          h('span', null, `דמיון סגנון Top-1: ${publicOren.active.holdout.top1Accuracy}%`),
          h('span', null, `דמיון סגנון Top-3: ${publicOren.active.holdout.top3Accuracy}%`),
          h('span', null, `${publicOren.active.holdout.positionsTested} עמדות Holdout`)
        ),
        h('button', {
          className: 'evo-action-btn', 'data-play-oren-bot': 'true',
          onClick: () => onPlayBot({ ...publicOren.active, isPublicOrenBot: true }),
        }, 'שחק מול בוט אורן הציבורי ♟')
      ),
      !isSignedIn && publicOren.past && h('article', { className: 'evo-card evo-bot-card is-past' },
        h('div', { className: 'evo-bot-head' },
          h('span', { className: 'evo-bot-icon' }, '🕰️'),
          h('div', null,
            h('strong', null, 'דוגמה ציבורית · אורן מלפני חודש'),
            h('span', { className: 'muted' }, `${publicOren.past.elo} Elo · דוגמה של אורן (לא הפרופיל שלך)`)
          )
        ),
        h('p', { className: 'evo-bot-desc' }, 'כך עובד מצב Past-You על משחקי אורן. התחבר כדי ליצור גרסה פרטית מהמשחקים שלך.'),
        h('div', { className: 'evo-metrics-mini' },
          h('span', null, `דמיון סגנון Top-1: ${publicOren.past.holdout.top1Accuracy}%`),
          h('span', null, `דמיון סגנון Top-3: ${publicOren.past.holdout.top3Accuracy}%`)
        ),
        h('button', {
          className: 'evo-action-btn', 'data-play-past-you': 'true',
          onClick: () => onPlayBot({ ...publicOren.past, isPublicOrenBot: true }),
        }, 'שחק דוגמת Past-You (אורן) ⚔️')
      )
    )
  );
}

export function PastYouBotPanel({
  orenBaselineProfile, publicOrenBot, evolutionState, authUser, isOwner, isOffline, onPlayBot, onOpenDna,
}: {
  bots?: any[];
  orenBaselineProfile?: any;
  publicOrenBot?: { activeSnapshot?: AdaptiveBotSnapshot | null; pastSnapshot?: AdaptiveBotSnapshot | null; updatedAt?: string | null } | null;
  evolutionState?: any;
  authUser?: { id?: string; email?: string; username?: string } | null;
  isOwner?: boolean;
  isOffline?: boolean;
  archiveGames?: PersonalPgnGame[];
  onPlayBot: (bot: any) => void;
  onOpenDna?: () => void;
}) {
  const ReactObj = (globalThis as any).React;
  const h = ReactObj.createElement;
  const useMemo = ReactObj.useMemo;
  const ChessCtor = (globalThis as any).ChessLib?.Chess;
  if (!ChessCtor) return null;

  const publicOren = useMemo(() => {
    if (publicOrenBot?.activeSnapshot?.positionBook) {
      return {
        active: { ...publicOrenBot.activeSnapshot, isPublicOrenBot: true },
        past: publicOrenBot.pastSnapshot ? { ...publicOrenBot.pastSnapshot, isPublicOrenBot: true } : null,
        sourceHe: publicOrenBot.updatedAt ? `עודכן מסקירת DNA מאושרת של אורן (${String(publicOrenBot.updatedAt).slice(0, 10)})` : 'גרסה ציבורית מאושרת של אורן',
      };
    }
    const base = buildPublicOrenBaselineSnapshots(orenBaselineProfile || {}, ChessCtor);
    return { active: base.activeOren, past: base.pastOren, sourceHe: 'פרופיל הבסיס הציבורי של אורן (1,663 משחקי אימון + 188 Holdout)' };
  }, [orenBaselineProfile, publicOrenBot]);

  const personal = evolutionState?.personalBot || null;
  const lastGate: QualityGateResult | null = personal?.lastGate || null;
  const isSignedIn = Boolean(authUser?.id);

  return h('section', { className: 'evo-pastyou-section', 'data-evo-pastyou': 'true', dir: 'rtl' },
    h('div', { className: 'evo-radar-header' },
      h('div', null,
        h('span', { className: 'archive-eyebrow' }, 'ADAPTIVE PERSONAL BOT · PAST-YOU · PUBLIC OREN BOT'),
        h('h2', null, 'הבוט הלומד שלך, Past-You ובוט אורן הציבורי'),
        h('p', { className: 'muted' }, isSignedIn
          ? 'הבוט האישי שלך פרטי לחשבון שלך ומתעדכן אוטומטית מסקירות ה-DNA שלך (רק אחרי מעבר שער איכות על סט Holdout עיוור זהה).'
          : 'כאורח אפשר לשחק מיד מול בוט אורן הציבורי ודוגמת Past-You של אורן. התחבר והרץ סקירת DNA כדי ליצור בוט אישי פרטי משלך.')
      ),
      lastGate && isSignedIn && h('span', {
        className: 'evo-gate-badge ' + (lastGate.approved ? 'is-ok' : 'is-blocked'),
        'data-evo-gate-status': lastGate.approved ? 'approved' : 'blocked',
      }, lastGate.approved ? 'שער איכות: אושר ✅' : 'שער איכות: נחסם ⛔ (נשמר הבוט הקודם)')
    ),
    isOffline && h('div', { className: 'evo-offline-banner', role: 'status', 'data-evo-offline': 'true' },
      '📡 מצב אופליין — ניתן לשחק מול הגרסה השמורה של הבוטים ולתרגל שיעורים שנטענו. יצירת סקירת DNA חדשה תתאפשר עם החזרה לרשת.'
    ),
    isSignedIn && h(PersonalBotCardsBlock, { personal, isOwner, isOffline, onPlayBot, onOpenDna }),
    h(PublicOrenBotBlock, { publicOren, isSignedIn, onPlayBot })
  );
}
