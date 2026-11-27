// DNA Tilt & Clock Radar: pure analysis + Hebrew RTL UI section.
// Measures session tilt (performance after 1, 2, 3+ consecutive losses within <=30 min gaps)
// and time-pressure impact (<60s / <30s from [%clk ...] tags, or honest speed-class fallback).
// Zero external dependencies; MIT-only; safe to import in Node without DOM/React.

export interface TiltClockGameInput {
  id?: string;
  pgn?: string;
  date?: string;
  playedAt?: string;
  result?: 'win' | 'loss' | 'draw' | 'unknown' | string;
  playerColor?: 'white' | 'black' | string;
  userRating?: number | null;
  timeClass?: string;
  finishReason?: string;
}

export interface StreakBucket {
  priorLosses: number;
  labelHe: string;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number | null;
  lossRate: number | null;
}

export interface TimeClassBreakdownRow {
  timeClass: string;
  labelHe: string;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  timeouts: number;
  winRate: number | null;
  lossRate: number | null;
}

export interface TiltClockReport {
  totalGames: number;
  timestampBasis: 'exact' | 'date-order' | 'none';
  sessionGapMinutes: number;
  tilt: {
    buckets: StreakBucket[];
    tiltSessionsCount: number;
    maxConsecutiveLosses: number;
    gamesInTilt: number;
    estimatedEloLostInTilt: number | null;
    baselineWinRate: number | null;
    tiltWinRate: number | null;
    severity: 'insufficient' | 'low' | 'moderate' | 'high';
    headlineHe: string;
    recommendationHe: string;
  };
  clock: {
    basis: 'clock-tags' | 'time-class-fallback' | 'none';
    basisNoteHe: string;
    gamesWithClockTags: number;
    lowClockThresholdSec: number;
    criticalClockThresholdSec: number;
    lowClockGames: number;
    lowClockLosses: number;
    lowClockLossRate: number | null;
    normalClockGames: number;
    normalClockLossRate: number | null;
    criticalClockGames: number;
    criticalClockLosses: number;
    criticalClockLossRate: number | null;
    timeoutsCount: number;
    timeoutLossRate: number | null;
    byTimeClass: TimeClassBreakdownRow[];
    recommendationHe: string;
  };
}

function readPgnHeader(pgn: string, name: string): string {
  const m = new RegExp('^\\[' + name + '\\s+"([^"]*)"\\]', 'mi').exec(pgn || '');
  return m ? m[1].trim() : '';
}

export function parseClockTokenToSeconds(token: string): number | null {
  const parts = String(token || '').trim().split(':').map(Number);
  if (parts.some(n => !Number.isFinite(n) || n < 0)) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0];
  return null;
}

/** Extracts remaining clock seconds on each of the player's own moves from PGN [%clk ...] comments. */
export function extractPlayerClockSeconds(pgn: string, side: 'white' | 'black'): number[] {
  if (!pgn) return [];
  const body = pgn.replace(/^\[[^\n]*\]\s*$/gm, ' ');
  const re = /\[%clk\s+([0-9:.]+)\]/gi;
  const all: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    const sec = parseClockTokenToSeconds(m[1]);
    if (sec != null) all.push(sec);
  }
  const wantParity = side === 'white' ? 0 : 1;
  return all.filter((_, idx) => idx % 2 === wantParity);
}

function parseGameTimestampMs(game: TiltClockGameInput): { ms: number | null; exact: boolean } {
  if (game.playedAt) {
    const t = Date.parse(game.playedAt);
    if (Number.isFinite(t)) return { ms: t, exact: true };
  }
  const pgn = game.pgn || '';
  const utcDate = readPgnHeader(pgn, 'UTCDate') || readPgnHeader(pgn, 'Date');
  const utcTime = readPgnHeader(pgn, 'UTCTime') || readPgnHeader(pgn, 'StartTime') || readPgnHeader(pgn, 'EndTime');
  if (utcDate && !utcDate.includes('?')) {
    const isoDate = utcDate.replace(/\./g, '-');
    if (utcTime && /^\d{1,2}:\d{2}(:\d{2})?$/.test(utcTime)) {
      const normalizedTime = utcTime.length === 5 ? utcTime + ':00' : utcTime;
      const t = Date.parse(`${isoDate}T${normalizedTime}Z`);
      if (Number.isFinite(t)) return { ms: t, exact: true };
    }
    const dayMs = Date.parse(`${isoDate}T12:00:00Z`);
    if (Number.isFinite(dayMs)) return { ms: dayMs, exact: false };
  }
  if (game.date && game.date !== 'unknown') {
    const iso = game.date.replace(/\./g, '-');
    const dayMs = Date.parse(`${iso}T12:00:00Z`);
    if (Number.isFinite(dayMs)) return { ms: dayMs, exact: false };
  }
  return { ms: null, exact: false };
}

function inferResult(game: TiltClockGameInput): 'win' | 'loss' | 'draw' | 'unknown' {
  if (game.result === 'win' || game.result === 'loss' || game.result === 'draw') return game.result;
  const r = readPgnHeader(game.pgn || '', 'Result');
  const side = game.playerColor === 'black' ? 'black' : 'white';
  if (r === '1-0') return side === 'white' ? 'win' : 'loss';
  if (r === '0-1') return side === 'black' ? 'win' : 'loss';
  if (r === '1/2-1/2') return 'draw';
  return 'unknown';
}

function isTimeoutLoss(game: TiltClockGameInput, res: string): boolean {
  if (res !== 'loss') return false;
  const reason = String(game.finishReason || '') + ' ' + readPgnHeader(game.pgn || '', 'Termination');
  return /timeout|time\s*forfeit|won on time|נפילה בזמן|זמן/i.test(reason);
}

function inferUserRating(game: TiltClockGameInput): number | null {
  if (typeof game.userRating === 'number' && Number.isFinite(game.userRating)) return game.userRating;
  const pgn = game.pgn || '';
  const hdr = game.playerColor === 'black' ? readPgnHeader(pgn, 'BlackElo') : readPgnHeader(pgn, 'WhiteElo');
  const n = Number(hdr);
  return Number.isFinite(n) && n >= 100 && n <= 4000 ? n : null;
}

function normalizeTimeClass(game: TiltClockGameInput): string {
  const raw = String(game.timeClass || '').toLowerCase().trim();
  if (['bullet', 'blitz', 'rapid', 'classical', 'daily'].includes(raw)) return raw;
  const ev = readPgnHeader(game.pgn || '', 'Event').toLowerCase();
  const m = ev.match(/\b(bullet|blitz|rapid|classical|daily)\b/);
  if (m) return m[1];
  const tc = readPgnHeader(game.pgn || '', 'TimeControl');
  const secMatch = tc.match(/^(\d+)/);
  if (secMatch) {
    const base = Number(secMatch[1]);
    if (base < 180) return 'bullet';
    if (base < 600) return 'blitz';
    if (base < 3600) return 'rapid';
    return 'classical';
  }
  return 'unknown';
}

const TIME_CLASS_HE: Record<string, string> = {
  bullet: 'בולט (Bullet)',
  blitz: 'בליץ (Blitz)',
  rapid: 'ראפיד (Rapid)',
  classical: 'קלאסי',
  daily: 'יומי',
  unknown: 'קצב לא ידוע',
};

const pct = (part: number, total: number): number | null => (total > 0 ? Math.round((part / total) * 1000) / 10 : null);

export function analyzeTiltAndClock(
  rawGames: TiltClockGameInput[],
  options?: { sessionGapMinutes?: number; lowClockSec?: number; criticalClockSec?: number }
): TiltClockReport {
  const sessionGapMinutes = options?.sessionGapMinutes ?? 30;
  const lowClockSec = options?.lowClockSec ?? 60;
  const criticalClockSec = options?.criticalClockSec ?? 30;
  const gapMs = sessionGapMinutes * 60 * 1000;

  const list = Array.isArray(rawGames) ? rawGames.filter(Boolean) : [];
  const enriched = list.map((g, originalIndex) => {
    const ts = parseGameTimestampMs(g);
    const res = inferResult(g);
    const side: 'white' | 'black' = g.playerColor === 'black' ? 'black' : 'white';
    const clocks = extractPlayerClockSeconds(g.pgn || '', side);
    return {
      game: g,
      originalIndex,
      ms: ts.ms,
      exactTs: ts.exact,
      result: res,
      side,
      rating: inferUserRating(g),
      timeClass: normalizeTimeClass(g),
      clocks,
      timeoutLoss: isTimeoutLoss(g, res),
    };
  });

  const exactCount = enriched.filter(e => e.exactTs).length;
  const anyTsCount = enriched.filter(e => e.ms != null).length;
  const timestampBasis: 'exact' | 'date-order' | 'none' =
    exactCount >= Math.max(2, Math.ceil(enriched.length * 0.5))
      ? 'exact'
      : anyTsCount >= 2
      ? 'date-order'
      : 'none';

  // Sort oldest -> newest so streaks are computed chronologically.
  enriched.sort((a, b) => {
    if (a.ms != null && b.ms != null && a.ms !== b.ms) return a.ms - b.ms;
    return a.originalIndex - b.originalIndex;
  });

  const bucketDefs: Array<{ priorLosses: number; labelHe: string }> = [
    { priorLosses: 0, labelHe: 'משחק רענן (0 הפסדים קודמים)' },
    { priorLosses: 1, labelHe: 'אחרי הפסד אחד' },
    { priorLosses: 2, labelHe: 'אחרי 2 הפסדים רצופים' },
    { priorLosses: 3, labelHe: 'אחרי 3+ הפסדים רצופים (טילט)' },
  ];
  const buckets: StreakBucket[] = bucketDefs.map(d => ({
    ...d, games: 0, wins: 0, draws: 0, losses: 0, winRate: null, lossRate: null,
  }));

  let consecutiveLosses = 0;
  let maxConsecutiveLosses = 0;
  let prevMs: number | null = null;
  let prevExact = false;
  let tiltSessionsCount = 0;
  let countedCurrentTiltSession = false;
  let gamesInTilt = 0;
  let eloLostSum = 0;
  let eloLostTracked = 0;

  for (let i = 0; i < enriched.length; i++) {
    const cur = enriched[i];
    if (cur.result === 'unknown') continue;

    // Session break detection
    let newSession = false;
    if (prevMs != null && cur.ms != null) {
      if (cur.exactTs && prevExact) {
        if (cur.ms - prevMs > gapMs) newSession = true;
      } else {
        // Date-only fallback: break session if calendar day changed
        if (Math.abs(cur.ms - prevMs) > 24 * 60 * 60 * 1000) newSession = true;
      }
    }
    if (newSession) {
      consecutiveLosses = 0;
      countedCurrentTiltSession = false;
    }

    const bucketIdx = Math.min(3, consecutiveLosses);
    const b = buckets[bucketIdx];
    b.games += 1;
    if (cur.result === 'win') b.wins += 1;
    else if (cur.result === 'draw') b.draws += 1;
    else b.losses += 1;

    if (consecutiveLosses >= 2) {
      gamesInTilt += 1;
      // Compute Elo change vs next game or previous game when ratings exist
      const prev = i > 0 ? enriched[i - 1] : null;
      if (cur.rating != null && prev?.rating != null && cur.timeClass === prev.timeClass) {
        const delta = cur.rating - prev.rating;
        if (delta < 0 && Math.abs(delta) <= 100) {
          eloLostSum += Math.abs(delta);
          eloLostTracked += 1;
        }
      }
    }

    if (cur.result === 'loss') {
      consecutiveLosses += 1;
      if (consecutiveLosses > maxConsecutiveLosses) maxConsecutiveLosses = consecutiveLosses;
      if (consecutiveLosses >= 3 && !countedCurrentTiltSession) {
        tiltSessionsCount += 1;
        countedCurrentTiltSession = true;
      }
    } else {
      consecutiveLosses = 0;
      countedCurrentTiltSession = false;
    }

    prevMs = cur.ms;
    prevExact = cur.exactTs;
  }

  for (const b of buckets) {
    b.winRate = pct(b.wins, b.games);
    b.lossRate = pct(b.losses, b.games);
  }

  const baselineWinRate = buckets[0].winRate;
  const tiltGamesTotal = buckets[2].games + buckets[3].games;
  const tiltWinsTotal = buckets[2].wins + buckets[3].wins;
  const tiltWinRate = pct(tiltWinsTotal, tiltGamesTotal);

  let severity: 'insufficient' | 'low' | 'moderate' | 'high' = 'insufficient';
  let headlineHe = 'אין מספיק משחקים לחישוב דפוס טילט יציב.';
  let tiltRecHe = 'טען לפחות 8 משחקים כדי לזהות אם הפסדים רצופים פוגעים בדירוג שלך.';

  if (enriched.filter(e => e.result !== 'unknown').length >= 6) {
    const drop = baselineWinRate != null && tiltWinRate != null ? baselineWinRate - tiltWinRate : 0;
    if (tiltSessionsCount >= 2 || (tiltGamesTotal >= 3 && drop >= 20) || (tiltWinRate != null && tiltWinRate <= 25 && tiltGamesTotal >= 3)) {
      severity = 'high';
      headlineHe = `זוהתה רגישות גבוהה לטילט — אחוז הניצחון צונח מ-${baselineWinRate ?? '—'}% ל-${tiltWinRate ?? '—'}% אחרי 2+ הפסדים רצופים.`;
      tiltRecHe = 'חוק זהב ל-Veyra: אחרי 2 הפסדים רצופים בסשן, עצור ל-15 דקות ועבור לתרגיל Blunder Rewind אחד במקום ללחוץ "משחק חדש".';
    } else if (tiltSessionsCount >= 1 || (tiltGamesTotal >= 2 && drop >= 10)) {
      severity = 'moderate';
      headlineHe = `יש סימני טילט קלים — ${tiltSessionsCount} סשנים עם 3+ הפסדים רצופים (${gamesInTilt} משחקים בתוך רצף הפסדים).`;
      tiltRecHe = 'שים לב למשחק השלישי אחרי שני הפסדים: קח 20 שניות נשימה לפני המהלך הראשון או החלף לקצב איטי יותר.';
    } else {
      severity = 'low';
      headlineHe = 'שליטה רגשית טובה — לא זוהתה קריסה חדה אחרי הפסדים רצופים.';
      tiltRecHe = 'המשך לשמור על משמעת הסשן הזו — היא שווה עשרות נקודות Elo לאורך החודש.';
    }
  }

  // Clock & Time-Pressure Radar
  const withClocks = enriched.filter(e => e.clocks.length > 0 && e.result !== 'unknown');
  const timeoutsCount = enriched.filter(e => e.timeoutLoss).length;
  const decidedCount = enriched.filter(e => e.result !== 'unknown').length;
  const timeoutLossRate = pct(timeoutsCount, decidedCount);

  const byTcMap = new Map<string, TimeClassBreakdownRow>();
  for (const e of enriched) {
    if (e.result === 'unknown') continue;
    const key = e.timeClass || 'unknown';
    let row = byTcMap.get(key);
    if (!row) {
      row = {
        timeClass: key,
        labelHe: TIME_CLASS_HE[key] || key,
        games: 0, wins: 0, draws: 0, losses: 0, timeouts: 0, winRate: null, lossRate: null,
      };
      byTcMap.set(key, row);
    }
    row.games += 1;
    if (e.result === 'win') row.wins += 1;
    else if (e.result === 'draw') row.draws += 1;
    else row.losses += 1;
    if (e.timeoutLoss) row.timeouts += 1;
  }
  const byTimeClass = [...byTcMap.values()]
    .map(r => ({ ...r, winRate: pct(r.wins, r.games), lossRate: pct(r.losses, r.games) }))
    .sort((a, b) => b.games - a.games);

  let clockBasis: 'clock-tags' | 'time-class-fallback' | 'none' = 'none';
  let basisNoteHe = 'לא נטענו משחקים עם תגיות שעון או קצב זמן.';
  let lowClockGames = 0;
  let lowClockLosses = 0;
  let normalClockGames = 0;
  let normalClockLosses = 0;
  let criticalClockGames = 0;
  let criticalClockLosses = 0;
  let clockRecHe = 'טען משחקים מ-Chess.com או Lichess עם תגיות שעון כדי למדוד ירידת ביצועים מתחת לדקה.';

  if (withClocks.length >= 2) {
    clockBasis = 'clock-tags';
    basisNoteHe = `מבוסס על תגיות שעון אמיתיות ([%clk]) ב-${withClocks.length} מתוך ${decidedCount} משחקים.`;
    for (const e of withClocks) {
      const minClock = Math.min(...e.clocks);
      if (minClock < lowClockSec) {
        lowClockGames += 1;
        if (e.result === 'loss') lowClockLosses += 1;
      } else {
        normalClockGames += 1;
        if (e.result === 'loss') normalClockLosses += 1;
      }
      if (minClock < criticalClockSec) {
        criticalClockGames += 1;
        if (e.result === 'loss') criticalClockLosses += 1;
      }
    }
    const lowLossRate = pct(lowClockLosses, lowClockGames);
    const normLossRate = pct(normalClockLosses, normalClockGames);
    if (lowLossRate != null && normLossRate != null && lowLossRate - normLossRate >= 15) {
      clockRecHe = `מתחת ל-${lowClockSec} שניות אחוז ההפסד שלך קופץ ל-${lowLossRate}% (לעומת ${normLossRate}% בזמן רגיל). נסה לשחק עם תוספת זמן (+2/+5) ולתרגל החלטות מהירות בסיום.`;
    } else if (timeoutsCount >= 2) {
      clockRecHe = `איבדת ${timeoutsCount} משחקים בנפילה בזמן. קבע לעצמך כלל: לא להשקיע יותר מ-20% מהזמן שנותר על מהלך אחד.`;
    } else {
      clockRecHe = 'ניהול השעון שלך מאוזן יחסית — אין נפילה חריגה מתחת לדקה.';
    }
  } else if (byTimeClass.length > 0) {
    clockBasis = 'time-class-fallback';
    basisNoteHe = 'תגיות שעון [%clk] לא הופיעו ב-PGN שנטען — ההשוואה מבוססת בשקיפות על קצבי המשחק (Bullet / Blitz / Rapid) ונפילות בזמן.';
    const fastest = byTimeClass.find(r => r.timeClass === 'bullet') || byTimeClass.find(r => r.timeClass === 'blitz');
    const rapid = byTimeClass.find(r => r.timeClass === 'rapid');
    if (fastest && rapid && fastest.lossRate != null && rapid.lossRate != null && fastest.lossRate - rapid.lossRate >= 12) {
      clockRecHe = `ב-${fastest.labelHe} אחוז ההפסד שלך הוא ${fastest.lossRate}% לעומת ${rapid.lossRate}% ב-${rapid.labelHe}. מעבר ליותר משחקי Rapid יאיץ את עליית הדירוג.`;
    } else if (timeoutsCount > 0) {
      clockRecHe = `נמדדו ${timeoutsCount} הפסדים בזמן (${timeoutLossRate ?? 0}%). מומלץ לשחק קצבים עם אינקרמנט (למשל 10+5 או 5+3).`;
    } else {
      clockRecHe = 'כדי לקבל פירוק מדויק מתחת ל-60/30 שניות, ייבא משחקים עם תגיות שעון מ-Chess.com או Lichess.';
    }
  }

  return {
    totalGames: decidedCount,
    timestampBasis,
    sessionGapMinutes,
    tilt: {
      buckets,
      tiltSessionsCount,
      maxConsecutiveLosses,
      gamesInTilt,
      estimatedEloLostInTilt: eloLostTracked > 0 ? Math.round(eloLostSum) : null,
      baselineWinRate,
      tiltWinRate,
      severity,
      headlineHe,
      recommendationHe: tiltRecHe,
    },
    clock: {
      basis: clockBasis,
      basisNoteHe,
      gamesWithClockTags: withClocks.length,
      lowClockThresholdSec: lowClockSec,
      criticalClockThresholdSec: criticalClockSec,
      lowClockGames,
      lowClockLosses,
      lowClockLossRate: pct(lowClockLosses, lowClockGames),
      normalClockGames,
      normalClockLossRate: pct(normalClockLosses, normalClockGames),
      criticalClockGames,
      criticalClockLosses,
      criticalClockLossRate: pct(criticalClockLosses, criticalClockGames),
      timeoutsCount,
      timeoutLossRate,
      byTimeClass,
      recommendationHe: clockRecHe,
    },
  };
}

/** Collects playable games from archiveGames or dnaReport buckets for the DNA Tilt & Clock card. */
export function collectTiltClockGames(archiveGames: any[], dnaReport: any): TiltClockGameInput[] {
  if (Array.isArray(archiveGames) && archiveGames.length > 0) {
    return archiveGames.filter(g => g && (g.pgn || g.result));
  }
  const fromReport: TiltClockGameInput[] = [];
  const controls = dnaReport?.timeControls || {};
  for (const key of ['bullet', 'blitz', 'rapid']) {
    const games = controls[key]?.games;
    if (Array.isArray(games)) {
      for (const g of games) {
        fromReport.push({
          id: g.id || g.fingerprint,
          pgn: g.pgn || '',
          date: g.date,
          playedAt: g.playedAt,
          result: g.result || g.outcome,
          playerColor: g.playerColor || g.color,
          userRating: g.userRating ?? g.rating ?? null,
          timeClass: g.timeClass || key,
          finishReason: g.finishReason,
        });
      }
    }
  }
  return fromReport;
}

export function DnaTiltClockSection({ archiveGames, dnaReport, onOpenCourses }: {
  archiveGames?: any[];
  dnaReport?: any;
  onOpenCourses?: () => void;
}) {
  const ReactObj = (globalThis as any).React;
  const h = ReactObj.createElement;
  const games = collectTiltClockGames(archiveGames || [], dnaReport);
  const report = analyzeTiltAndClock(games);

  const severityLabel: Record<string, string> = {
    high: 'סיכון טילט גבוה',
    moderate: 'סימני טילט בינוניים',
    low: 'שליטה טובה בטילט',
    insufficient: 'נדרשים עוד משחקים',
  };

  return h('section', { className: 'evo-radar-section', 'data-evo-tilt-clock': 'true', dir: 'rtl' },
    h('div', { className: 'evo-radar-header' },
      h('div', null,
        h('span', { className: 'archive-eyebrow' }, 'TILT & CLOCK RADAR'),
        h('h2', null, 'רדאר טילט ושעון ב-DNA'),
        h('p', { className: 'muted' }, 'מאתר איפה נעלמות נקודות Elo אחרי הפסדים רצופים או בלחץ שעון מתחת לדקה.')
      ),
      h('span', { className: 'evo-severity-badge is-' + report.tilt.severity }, severityLabel[report.tilt.severity])
    ),

    report.totalGames === 0
      ? h('div', { className: 'evo-empty-card', role: 'status' },
          h('strong', null, 'עדיין אין משחקים טעונים לניתוח טילט ושעון'),
          h('p', { className: 'muted' }, 'טען את המשחקים שלך בארכיון או הרץ סקירת DNA — הרדאר יחשב מיד אחוזי ניצחון אחרי 1/2/3+ הפסדים ולחץ זמן מתחת ל-60 שניות.')
        )
      : h('div', { className: 'evo-radar-grid' },
          // Tilt Radar Card
          h('article', { className: 'evo-card evo-tilt-card' },
            h('div', { className: 'evo-card-top' },
              h('h3', null, '🔥 רדאר טילט (רצפי הפסדים בסשן)'),
              h('span', { className: 'evo-meta-pill' }, `${report.totalGames} משחקים · חלון סשן ${report.sessionGapMinutes} דק׳`)
            ),
            h('p', { className: 'evo-headline' }, report.tilt.headlineHe),
            h('div', { className: 'evo-kpi-row' },
              h('div', { className: 'evo-kpi' },
                h('span', null, 'סשני טילט (3+ הפסדים)'),
                h('strong', null, String(report.tilt.tiltSessionsCount))
              ),
              h('div', { className: 'evo-kpi' },
                h('span', null, 'רצף הפסדים שיא'),
                h('strong', null, String(report.tilt.maxConsecutiveLosses))
              ),
              h('div', { className: 'evo-kpi' },
                h('span', null, 'אובדן Elo משוער בטילט'),
                h('strong', null, report.tilt.estimatedEloLostInTilt != null ? `-${report.tilt.estimatedEloLostInTilt}` : 'לא זמין')
              )
            ),
            h('div', { className: 'evo-streak-bars' },
              report.tilt.buckets.map(b =>
                h('div', { key: b.priorLosses, className: 'evo-bar-row' },
                  h('div', { className: 'evo-bar-labels' },
                    h('span', null, b.labelHe),
                    h('strong', null, b.games > 0 ? `${b.winRate}% ניצחון (${b.games} מש׳)` : '0 משחקים')
                  ),
                  h('div', { className: 'evo-bar-track' },
                    h('div', {
                      className: 'evo-bar-fill ' + (b.priorLosses >= 2 ? 'is-danger' : b.priorLosses === 1 ? 'is-warn' : 'is-ok'),
                      style: { width: `${b.winRate ?? 0}%` }
                    })
                  )
                )
              )
            ),
            h('p', { className: 'evo-advice' }, '💡 ', report.tilt.recommendationHe)
          ),

          // Clock Pressure Card
          h('article', { className: 'evo-card evo-clock-card' },
            h('div', { className: 'evo-card-top' },
              h('h3', null, '⏱️ רדאר לחץ שעון'),
              h('span', { className: 'evo-meta-pill' }, report.clock.basis === 'clock-tags' ? 'תגיות [%clk] אמיתיות' : 'השוואת קצבי זמן')
            ),
            h('p', { className: 'evo-basis-note muted' }, report.clock.basisNoteHe),
            report.clock.basis === 'clock-tags'
              ? h('div', { className: 'evo-kpi-row' },
                  h('div', { className: 'evo-kpi' },
                    h('span', null, 'הפסד מתחת ל-60 שנ׳'),
                    h('strong', null, report.clock.lowClockLossRate != null ? `${report.clock.lowClockLossRate}%` : '—'),
                    h('small', { className: 'muted' }, `${report.clock.lowClockGames} משחקים`)
                  ),
                  h('div', { className: 'evo-kpi' },
                    h('span', null, 'הפסד מתחת ל-30 שנ׳'),
                    h('strong', null, report.clock.criticalClockLossRate != null ? `${report.clock.criticalClockLossRate}%` : '—'),
                    h('small', { className: 'muted' }, `${report.clock.criticalClockGames} משחקים`)
                  ),
                  h('div', { className: 'evo-kpi' },
                    h('span', null, 'נפילות בזמן'),
                    h('strong', null, String(report.clock.timeoutsCount)),
                    h('small', { className: 'muted' }, `${report.clock.timeoutLossRate ?? 0}% מכלל המשחקים`)
                  )
                )
              : h('div', { className: 'evo-tc-table' },
                  report.clock.byTimeClass.map(row =>
                    h('div', { key: row.timeClass, className: 'evo-tc-row' },
                      h('span', null, row.labelHe),
                      h('strong', null, `${row.winRate ?? 0}% ניצחון`),
                      h('span', { className: 'muted' }, `${row.losses} הפסדים (${row.timeouts} בזמן) · ${row.games} מש׳`)
                    )
                  )
                ),
            h('p', { className: 'evo-advice' }, '⏱️ ', report.clock.recommendationHe),
            onOpenCourses && h('button', { className: 'evo-action-btn', onClick: onOpenCourses }, 'פתח קורס ניהול שעון וטילט ←')
          )
        )
  );
}
