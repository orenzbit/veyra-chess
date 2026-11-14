// Weekly report card: the last 7 local days against the 7 before. Pure (no DOM, no clock: the caller passes today).
// - Rating: per time class, the user's rating after their last game of the week against their rating before the week
//   (their last earlier game of that class, or the week's first game when there is none). Source: the loaded archive.
// - Openings: per opening played this week (from the saved Chess DNA report), score and accuracy against last week.
// - Endgames: games that reached an endgame (LONG_GAME_MOVES+ of the user's own moves), score and accuracy likewise.
// Score = (wins + half the draws) / games, in %. "Better" needs a change of at least SCORE_STEP or ACCURACY_STEP points.

export const LONG_GAME_MOVES = 40;
export const SCORE_STEP = 10;
export const ACCURACY_STEP = 1;
export type Trend = 'better' | 'worse' | 'same' | 'new';

type Game = { date?: string; playedAt?: string; result?: string; userRating?: number | null; timeClass?: string; opening?: string; accuracy?: number; userMoves?: number };
export type Rated = { timeClass: string; before: number; after: number; change: number; games: number };
export type Block = { games: number; score: number | null; accuracy: number | null; prevGames: number; prevScore: number | null; prevAccuracy: number | null; trend: Trend };
export type OpeningBlock = Block & { name: string };
export type WeeklyReport = { start: string; end: string; ratings: Rated[]; openings: OpeningBlock[]; endgames: Block; games: number; prevGames: number };

const DAY = 86400000;
const dayNum = (d: string) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d || '')); return m ? Math.round(Date.UTC(+m[1], +m[2] - 1, +m[3]) / DAY) : null; };
const dayStr = (n: number) => new Date(n * DAY).toISOString().slice(0, 10);
const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);
const points = (r?: string): number | null => (r === 'win' ? 1 : r === 'draw' ? 0.5 : r === 'loss' ? 0 : null);

function block(week: Game[], prev: Game[]): Block {
  const score = (gs: Game[]) => { const p = gs.map(g => points(g.result)).filter(x => x !== null) as number[]; return p.length ? Math.round((p.reduce((a, b) => a + b, 0) / p.length) * 100) : null; };
  const acc = (gs: Game[]) => avg(gs.map(g => Number(g.accuracy)).filter(Number.isFinite));
  const b = { games: week.length, score: score(week), accuracy: acc(week), prevGames: prev.length, prevScore: score(prev), prevAccuracy: acc(prev) };
  let trend: Trend = 'new';
  if (b.games && b.prevGames) {
    const ds = b.score !== null && b.prevScore !== null ? b.score - b.prevScore : 0;
    const da = b.accuracy !== null && b.prevAccuracy !== null ? b.accuracy - b.prevAccuracy : 0;
    trend = ds >= SCORE_STEP || da >= ACCURACY_STEP ? (ds <= -SCORE_STEP || da <= -ACCURACY_STEP ? 'same' : 'better') : ds <= -SCORE_STEP || da <= -ACCURACY_STEP ? 'worse' : 'same';
  }
  return { ...b, trend };
}

/** The device's local calendar date as YYYY-MM-DD. */
export function localToday(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function weeklyReport({ archiveGames = [], report = null, today }: { archiveGames?: Game[]; report?: any; today: string }): WeeklyReport {
  const end = dayNum(today) ?? 0; const start = end - 6; const prevStart = start - 7;
  const inWeek = (g: Game) => { const d = dayNum(g.date || ''); return d !== null && d >= start && d <= end; };
  const inPrev = (g: Game) => { const d = dayNum(g.date || ''); return d !== null && d >= prevStart && d < start; };
  // ratings from the archive, oldest first
  const order = (g: Game) => String(g.playedAt || g.date || '');
  const rated = archiveGames.filter(g => Number.isFinite(Number(g.userRating)) && Number(g.userRating) > 0 && dayNum(g.date || '') !== null).sort((a, b) => (order(a) < order(b) ? -1 : order(a) > order(b) ? 1 : 0));
  const ratings: Rated[] = [];
  for (const timeClass of [...new Set(rated.filter(inWeek).map(g => String(g.timeClass || 'unknown')))].sort()) {
    const same = rated.filter(g => String(g.timeClass || 'unknown') === timeClass);
    const week = same.filter(inWeek); const earlier = same.filter(g => (dayNum(g.date || '') as number) < start);
    const before = Number((earlier[earlier.length - 1] || week[0]).userRating); const after = Number(week[week.length - 1].userRating);
    ratings.push({ timeClass, before, after, change: after - before, games: week.length });
  }
  // openings and endgames from the DNA report
  const dna: Game[] = Object.values(report?.timeControls || {}).flatMap((s: any) => (Array.isArray(s?.games) ? s.games : []));
  const week = dna.filter(inWeek), prev = dna.filter(inPrev);
  const names = [...new Set(week.map(g => String(g.opening || '')).filter(n => n && n !== 'פתיחה לא זוהתה'))];
  const openings = names.map(name => ({ name, ...block(week.filter(g => g.opening === name), prev.filter(g => g.opening === name)) }))
    .sort((a, b) => b.games - a.games || (a.name < b.name ? -1 : 1)).slice(0, 3);
  const long = (g: Game) => (Number(g.userMoves) || 0) >= LONG_GAME_MOVES;
  return { start: dayStr(start), end: dayStr(end), ratings, openings, endgames: block(week.filter(long), prev.filter(long)), games: week.length, prevGames: prev.length };
}
