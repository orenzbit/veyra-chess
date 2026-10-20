// Pure logic: kit building, spaced repetition and DTO shaping. No database, no network.
import crypto from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { updateElo, refreshProfile, freshProfile } from '../../../src/puzzle-engine.mjs';
import { hashPuzzleId } from '../../../src/puzzle-repo.mjs';
import {
  KIT_REGULAR, KIT_RUSH, MASTERED_STREAK, MAX_PER_GAME_IN_KIT, MAX_PER_MOTIF, SR_STEPS_DAYS,
  RUSH_MAX_MOTIF_SHARE,
} from './puzzle-config.mjs';

const DAY = 864e5;

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFromString(text) {
  return parseInt(crypto.createHash('sha256').update(String(text)).digest('hex').slice(0, 8), 16);
}

/** The shape the browser receives. Never includes anything about other users. */
export function toDto(p) {
  return {
    id: p.id, fen: p.fen, solution: p.solution, accepted: p.accepted && p.accepted.length ? p.accepted : p.solution,
    played: p.played || '', motif: p.motif, phase: p.phase, rating: p.rating, class: p.class, origin: p.origin,
    source: {
      date: p.source?.date || '', opponent: p.source?.opponent || '', moveNumber: p.source?.moveNumber || 0,
      provider: p.source?.provider || '', url: p.source?.url || '',
    },
  };
}

function isDue(p, nowMs) { return p.status === 'active' && Date.parse(p.nextDue) <= nowMs; }

function tierOf(p, nowMs) {
  if (p.status === 'mastered') return 0;
  if (isDue(p, nowMs)) return 3;
  if (!(p.stats?.shown > 0)) return 2;
  return 1;
}

function scoreOf(p, profile, nowMs, rnd) {
  const overdueDays = Math.max(0, Math.floor((nowMs - Date.parse(p.nextDue)) / DAY));
  return Math.min(30, overdueDays) + (p.stats?.shown > 0 ? 0 : 5) + (p.motif === profile?.nextFocus ? 3 : 0) + (Number(p.severity) || 0) * 10 + rnd();
}

function pick(sorted, size, limits) {
  const chosen = [];
  const perMotif = {};
  const perGame = {};
  const take = (p) => { chosen.push(p); perMotif[p.motif] = (perMotif[p.motif] || 0) + 1; const g = p.source?.gameKey || p.id; perGame[g] = (perGame[g] || 0) + 1; };
  for (const p of sorted) {
    if (chosen.length >= size) break;
    const g = p.source?.gameKey || p.id;
    if ((perMotif[p.motif] || 0) >= limits.motif || (perGame[g] || 0) >= limits.game) continue;
    take(p);
  }
  // Constraints are about variety, not about size: top up without them if the pool is narrow.
  for (const p of sorted) {
    if (chosen.length >= size) break;
    if (!chosen.includes(p)) take(p);
  }
  return chosen;
}

const byRating = (a, b) => a.rating - b.rating || String(a.id).localeCompare(String(b.id));

export function buildRegularKit(puzzles, profile, lastIds, nowMs, rnd) {
  const live = puzzles.filter((p) => p.status !== 'retired');
  const fresh = live.filter((p) => !lastIds.has(p.id));
  const source = fresh.length >= KIT_REGULAR ? fresh : live;
  const scored = source.map((p) => ({ p, tier: tierOf(p, nowMs), s: scoreOf(p, profile, nowMs, rnd) }));
  scored.sort((a, b) => b.tier - a.tier || b.s - a.s);
  return pick(scored.map((x) => x.p), KIT_REGULAR, { motif: MAX_PER_MOTIF, game: MAX_PER_GAME_IN_KIT }).sort(byRating);
}

/** No single motif may fill more than `max` slots when other puzzles exist; swapped-in puzzles come from other motifs. */
function capMotifShare(chosen, candidates, size, max) {
  const out = [];
  const count = {};
  const skipped = [];
  for (const p of chosen) {
    if ((count[p.motif] || 0) >= max) { skipped.push(p); continue; }
    count[p.motif] = (count[p.motif] || 0) + 1;
    out.push(p);
  }
  const have = new Set(out.map((p) => p.id));
  const skippedIds = new Set(skipped.map((p) => p.id));
  for (const p of candidates) {
    if (out.length >= size) break;
    if (have.has(p.id) || skippedIds.has(p.id) || (count[p.motif] || 0) >= max) continue;
    count[p.motif] = (count[p.motif] || 0) + 1; have.add(p.id); out.push(p);
  }
  for (const p of skipped) { if (out.length >= size) break; out.push(p); } // narrow pool: size beats variety
  return out;
}

export function buildRushKit(puzzles, lastIds, rnd) {
  const live = puzzles.filter((p) => p.status !== 'retired');
  const source = live.length >= 60 ? live.filter((p) => !lastIds.has(p.id)) : live;
  const sorted = source.slice().sort(byRating);
  const third = Math.ceil(sorted.length / 3);
  const tiers = [sorted.slice(0, third), sorted.slice(third, third * 2), sorted.slice(third * 2)];
  const each = Math.floor(KIT_RUSH / 3);
  const shuffle = (list) => { const a = list.slice(); for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const chosen = [];
  const rest = [];
  for (const t of tiers) { const s = shuffle(t); chosen.push(...s.slice(0, each)); rest.push(...s.slice(each)); }
  for (const p of shuffle(rest)) { if (chosen.length >= KIT_RUSH) break; chosen.push(p); }
  return capMotifShare(chosen, shuffle(source), KIT_RUSH, Math.floor(KIT_RUSH * RUSH_MAX_MOTIF_SHARE)).sort(byRating);
}

/** Seed puzzles in record shape; used only to fill a kit when the personal pool is too small. */
export function seedRecords(doc) {
  return (doc?.puzzles || []).map((p) => ({
    id: hashPuzzleId(p.fen, p.solution), fen: p.fen, solution: p.solution, accepted: p.solution, played: p.played || '',
    motif: p.motif || 'general', phase: 'middlegame', rating: p.rating || 800, class: p.class || 'mistake',
    severity: p.severity || 0.3, origin: 'seed', source: { gameKey: 'seed', provider: 'seed', date: '', opponent: '', moveNumber: 0, url: '' },
    stats: { shown: 0 }, status: 'active', nextDue: new Date(0).toISOString(),
  }));
}

export async function loadSeeds(env = process.env, cwd = process.cwd(), here = dirname(fileURLToPath(import.meta.url))) {
  const candidates = [join(cwd, 'data/puzzle-seed.json'), env.LAMBDA_TASK_ROOT ? join(env.LAMBDA_TASK_ROOT, 'data/puzzle-seed.json') : '', join(here, '..', '..', '..', 'data/puzzle-seed.json')].filter(Boolean);
  for (const path of candidates) if (existsSync(path)) return seedRecords(JSON.parse(await readFile(path, 'utf8')));
  return [];
}

function fillFromSeeds(kit, seeds, size, rnd, avoid) {
  if (kit.length >= size) return kit;
  const have = new Set(kit.map((p) => p.id));
  const pool = seeds.filter((s) => !have.has(s.id) && !avoid.has(s.id));
  const extra = (pool.length ? pool : seeds.filter((s) => !have.has(s.id))).slice().sort(() => rnd() - 0.5);
  return kit.concat(extra.slice(0, size - kit.length)).sort(byRating);
}

/**
 * buildKits(puzzles, profile, lastKits, nowMs, seed, seeds) -> { regular, rush } (arrays of records).
 * Deterministic for a given seed.
 */
export function buildKits(puzzles, profile, lastKits, nowMs, seed, seeds = []) {
  const last = (mode) => new Set(lastKits?.[mode]?.puzzleIds || []);
  const rnd = mulberry32(seed);
  const regular = fillFromSeeds(buildRegularKit(puzzles, profile, last('regular'), nowMs, rnd), seeds, KIT_REGULAR, rnd, last('regular'));
  const rush = fillFromSeeds(buildRushKit(puzzles, last('rush'), rnd), seeds, KIT_RUSH, rnd, last('rush'));
  return { regular, rush };
}

export function kitMeta(records, mode, nowMs) {
  const ids = records.map((p) => p.id);
  const id = 'kit_' + crypto.createHash('sha256').update(mode + '|' + ids.join(',') + '|' + nowMs).digest('hex').slice(0, 10);
  return { id, builtAt: new Date(nowMs).toISOString(), puzzleIds: ids };
}

/**
 * Spaced repetition for one attempt (same rules as src/puzzle-repo.mjs recordAttempt).
 * Returns the patch for the puzzle row; seeds (origin 'seed') are not stored, so callers skip them.
 */
export function applyAttempt(rec, attempt) {
  const st = { shown: 0, solved: 0, fails: 0, streak: 0, ...(rec.stats || {}) };
  st.shown += 1;
  if (attempt.solved) { st.solved += 1; st.streak += 1; } else { st.fails += 1; st.streak = 0; }
  const days = SR_STEPS_DAYS[Math.min(st.streak, SR_STEPS_DAYS.length - 1)];
  const atMs = Date.parse(attempt.at);
  const nextDue = new Date(atMs + days * DAY).toISOString();
  const status = rec.status === 'retired' ? 'retired' : st.streak >= MASTERED_STREAK ? 'mastered' : 'active';
  return { stats: st, next_due: nextDue, status };
}

export { updateElo, refreshProfile, freshProfile };
