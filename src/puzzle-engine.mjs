// Veyra puzzle engine — harvest mistakes, score attempts, feed profile.
// Original MIT code, zero dependencies. Pure ESM (browser + Node).
import { classifyMotif, seedRating } from './puzzle-tactics.mjs';
import { hashPuzzleId, freshStats } from './puzzle-repo.mjs';

export const DROP_THRESHOLD = 0.10; // mistake+blunder only by default

export function harvestFromAnalysis(moves, ctx) {
  // moves: [{ply, fenBefore, playedUci, bestUci, drop, san, clocksSec}]
  const out = [];
  for (const m of moves || []) {
    const drop = Number(m.drop) || 0;
    if (drop < DROP_THRESHOLD) continue;
    if (!m.bestUci || !m.fenBefore) continue;
    const motif = classifyMotif({ fen: m.fenBefore, bestUci: m.bestUci, severity: drop, ply: m.ply, clocksSec: m.clocksSec });
    const rec = {
      fen: m.fenBefore,
      solution: [m.bestUci],
      played: m.playedUci || '',
      source: { gameId: (ctx && ctx.gameId) || 'review', ply: m.ply || 0, date: (ctx && ctx.date) || '', opponent: (ctx && ctx.opponent) || '', kind: 'harvest' },
      motif,
      severity: drop,
      class: drop >= 0.25 ? 'blunder' : 'mistake',
      rating: seedRating(drop),
      stats: freshStats(),
      createdAt: new Date().toISOString(),
    };
    rec.id = hashPuzzleId(rec.fen, rec.solution);
    out.push(rec);
  }
  return out;
}

export function checkAttempt(rec, userUci) {
  const want = rec.solution[0];
  return String(userUci || '').toLowerCase() === String(want).toLowerCase() ? 'correct' : 'wrong';
}

export function hintFor(rec, level) {
  const s = rec.solution[0];
  if (level <= 1) return pieceHint(s);
  if (level === 2) return 'target:' + s.slice(2, 4);
  return 'move:' + s;
}

function pieceHint(uci) {
  const p = (uci[4] || '').toUpperCase();
  if (p) return 'promote:' + p;
  return 'from:' + uci.slice(0, 2);
}

export function updateElo(profile, puzzle, solved) {
  const K = 32, PK = 16;
  const exp = 1 / (1 + Math.pow(10, (puzzle.rating - profile.puzzleElo) / 400));
  profile.puzzleElo = Math.round(profile.puzzleElo + K * ((solved ? 1 : 0) - exp));
  const pexp = 1 - exp;
  puzzle.rating = Math.round(puzzle.rating + PK * ((solved ? 0 : 1) - pexp));
}

export function freshProfile() {
  const zero = () => ({ seen: 0, solved: 0 });
  const m = () => ({ missed_mate: zero(), hanging_piece: zero(), king_safety: zero(), opening: zero(), endgame: zero(), time_pressure: zero(), general: zero() });
  return {
    version: 1, puzzleElo: 800, motifs: m(),
    phases: { opening: zero(), middlegame: zero(), endgame: zero() },
    recentMistakes: [], nextFocus: 'general',
    streak: { current: 0, best: 0, lastDate: '' },
    updatedAt: new Date().toISOString(),
  };
}

export function refreshProfile(profile, attempts) {
  // attempts: [{motif, phase, solved, date, fen}]
  for (const a of attempts || []) {
    if (profile.motifs[a.motif]) {
      profile.motifs[a.motif].seen++;
      if (a.solved) profile.motifs[a.motif].solved++;
    }
    if (profile.phases[a.phase]) {
      profile.phases[a.phase].seen++;
      if (a.solved) profile.phases[a.phase].solved++;
    }
    if (!a.solved && a.fen) {
      profile.recentMistakes.push({
        fen: a.fen,
        motif: a.motif,
        date: a.date || new Date().toISOString().slice(0, 10),
      });
    }
  }
  profile.recentMistakes = profile.recentMistakes.slice(-50);
  let worst = 'general', worstRate = 2;
  for (const k of Object.keys(profile.motifs)) {
    const s = profile.motifs[k];
    if (s.seen >= 5) {
      const rate = s.solved / s.seen;
      if (rate < worstRate) { worstRate = rate; worst = k; }
    }
  }
  profile.nextFocus = worst;
  const today = new Date().toISOString().slice(0, 10);
  if (attempts && attempts.length) {
    if (profile.streak.lastDate !== today) {
      const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
      profile.streak.current = profile.streak.lastDate === y ? profile.streak.current + 1 : 1;
      profile.streak.best = Math.max(profile.streak.best, profile.streak.current);
      profile.streak.lastDate = today;
    }
  }
  profile.updatedAt = new Date().toISOString();
  return profile;
}
