// Static bot-vs-bot tournament results (public/data/tournament/results.json), written by
// scripts/export-tournament-results.mjs. This module is pure (no React, no DOM) so Node checks can import it.

export const TOURNAMENT_RESULTS_URL = '/data/tournament/results.json';

export interface BotRecord { id: string; wins: number; draws: number; losses: number; points: number }
/** One unordered pair: `a` is the id that sorts first, aWins/bWins are that bot's total wins in the pair. */
export interface PairRecord { a: string; b: string; aWins: number; draws: number; bWins: number }
export interface TournamentResults {
  generatedAt: string | null;
  games: number;
  bots: BotRecord[];
  pairs: PairRecord[];
  /** Only present in the dev-only local-preview fixture; the UI labels such data as a demo. */
  demo: boolean;
}
export interface HeadToHeadRow { opponentId: string; wins: number; draws: number; losses: number; games: number }
export type FetchLike = (url: string, init?: { cache?: string }) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;

const isCount = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0;

/** Returns null for anything that is not a usable, non-empty results file (so the UI shows the empty state). */
export function normalizeTournamentResults(raw: unknown): TournamentResults | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Record<string, unknown>;
  if (!isCount(source.games) || source.games === 0 || !Array.isArray(source.bots)) return null;
  const seen = new Set<string>();
  const bots: BotRecord[] = [];
  for (const entry of source.bots as any[]) {
    if (!entry || typeof entry.id !== 'string' || !entry.id || seen.has(entry.id)) continue;
    if (!isCount(entry.wins) || !isCount(entry.draws) || !isCount(entry.losses)) continue;
    seen.add(entry.id);
    bots.push({ id: entry.id, wins: entry.wins, draws: entry.draws, losses: entry.losses, points: entry.wins + entry.draws / 2 });
  }
  if (!bots.length) return null;
  const pairs: PairRecord[] = [];
  const pairKeys = new Set<string>();
  for (const entry of Array.isArray(source.pairs) ? source.pairs as any[] : []) {
    if (!entry || typeof entry.a !== 'string' || typeof entry.b !== 'string' || entry.a === entry.b) continue;
    if (!isCount(entry.aWins) || !isCount(entry.draws) || !isCount(entry.bWins)) continue;
    const key = [entry.a, entry.b].sort().join('|');
    if (pairKeys.has(key)) continue;
    pairKeys.add(key);
    pairs.push({ a: entry.a, b: entry.b, aWins: entry.aWins, draws: entry.draws, bWins: entry.bWins });
  }
  return {
    generatedAt: typeof source.generatedAt === 'string' ? source.generatedAt : null,
    games: source.games,
    bots, pairs,
    demo: source.demo === true,
  };
}

/** Fetches the results file; a missing file (404), network failure, non-JSON body or empty data all give null. */
export async function loadTournamentResults(fetchImpl: FetchLike | undefined = (globalThis as any).fetch?.bind(globalThis)): Promise<TournamentResults | null> {
  if (typeof fetchImpl !== 'function') return null;
  try {
    const response = await fetchImpl(TOURNAMENT_RESULTS_URL, { cache: 'no-store' });
    if (!response || !response.ok) return null;
    return normalizeTournamentResults(await response.json());
  } catch {
    return null;
  }
}

/** Standings order: points, then wins, then fewer losses, then id for a stable order. */
export function standingsOrder(bots: BotRecord[]): BotRecord[] {
  return [...bots].sort((x, y) => y.points - x.points || y.wins - x.wins || x.losses - y.losses || (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
}

/** Head-to-head rows for one bot against every opponent it met, from that bot's point of view. */
export function headToHead(results: TournamentResults, botId: string): HeadToHeadRow[] {
  const rows: HeadToHeadRow[] = [];
  for (const pair of results.pairs) {
    if (pair.a === botId) rows.push({ opponentId: pair.b, wins: pair.aWins, draws: pair.draws, losses: pair.bWins, games: pair.aWins + pair.draws + pair.bWins });
    else if (pair.b === botId) rows.push({ opponentId: pair.a, wins: pair.bWins, draws: pair.draws, losses: pair.aWins, games: pair.aWins + pair.draws + pair.bWins });
  }
  return rows;
}
