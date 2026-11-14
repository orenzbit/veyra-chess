// Score math for "Analyze it yourself". Pure functions, no I/O; the server scores, the page only displays.
// Categories are the review's own (src/review-metrics.ts classifyReviewMove). Book and forced moves are
// shown as given, not graded: they describe the position, not the quality of a choice.

/** Graded categories on one quality ladder, best first; the rank difference is the per-move distance. */
export const GRADED_CLASSES = Object.freeze(['brilliant', 'great', 'best', 'excellent', 'good', 'inaccuracy', 'mistake', 'miss', 'blunder']);
export const GIVEN_CLASSES = Object.freeze(['book', 'forced']);
export const MAX_DISTANCE = GRADED_CLASSES.length - 1;
export const ELO_MIN = 100;
export const ELO_MAX = 3500;

export class ScoreInputError extends Error {
  constructor(code) { super(code); this.code = code; }
}

// Rounded from integer ratios (round half up), so 51/80 = 63.75% is 63.8 and not 63.7 from a float like 63.74999.
const ratio = (numerator, denominator, digits) => Math.round(numerator * 10 ** digits / denominator) / 10 ** digits;

export function isGraded(classification) {
  return GRADED_CLASSES.includes(classification);
}

/** |rank(a) - rank(b)| on the ladder: brilliant 0, great 1, best 2, excellent 3, good 4, inaccuracy 5, mistake 6, miss 7, blunder 8. */
export function classDistance(a, b) {
  const i = GRADED_CLASSES.indexOf(a);
  const j = GRADED_CLASSES.indexOf(b);
  if (i < 0 || j < 0) throw new ScoreInputError('bad_class');
  return Math.abs(i - j);
}

/** A rating from a PGN header value ("1520"), or null when absent/unknown ("?", "", "0", "1e3"). */
export function headerElo(value) {
  const text = String(value ?? '').trim();
  return /^[1-9]\d{0,4}$/.test(text) ? Number(text) : null;
}

function eloGuess(value) {
  if (!Number.isInteger(value) || value < ELO_MIN || value > ELO_MAX) throw new ScoreInputError('bad_elo_guess');
  return value;
}

/**
 * actual: the stored review classification of every ply, in order.
 * guesses: one entry per ply; a graded category for every graded ply (others are ignored).
 * eloGuess / eloActual: { white, black }; an actual of null means the PGN carries no rating for that side.
 */
export function scoreAnalyzeYourself({ actual, guesses, eloGuess: guess, eloActual }) {
  if (!Array.isArray(actual) || !Array.isArray(guesses) || guesses.length !== actual.length) throw new ScoreInputError('bad_guesses');
  if (actual.some(cls => !isGraded(cls) && !GIVEN_CLASSES.includes(cls))) throw new ScoreInputError('bad_actual');
  const perMove = actual.map((cls, index) => {
    if (!isGraded(cls)) return { index, actual: cls, graded: false };
    const g = guesses[index];
    if (!isGraded(g)) throw new ScoreInputError('missing_guess');
    const distance = classDistance(g, cls);
    return { index, actual: cls, guess: g, graded: true, correct: distance === 0, distance };
  });
  const graded = perMove.filter(move => move.graded);
  const correct = graded.filter(move => move.correct).length;
  const totalDistance = graded.reduce((sum, move) => sum + move.distance, 0);
  const elo = {};
  for (const side of ['white', 'black']) {
    const g = eloGuess(guess?.[side]);
    const a = eloActual?.[side] ?? null;
    elo[side] = { guess: g, actual: a, error: a === null ? null : Math.abs(g - a) };
  }
  const errors = [elo.white.error, elo.black.error].filter(error => error !== null);
  return {
    gradedMoves: graded.length,
    correct,
    accuracyPct: graded.length ? ratio(100 * correct, graded.length, 1) : null,
    meanDistance: graded.length ? ratio(totalDistance, graded.length, 2) : null,
    closenessPct: graded.length ? ratio(100 * (graded.length * MAX_DISTANCE - totalDistance), graded.length * MAX_DISTANCE, 1) : null,
    elo: { ...elo, meanError: errors.length ? ratio(errors.reduce((a, b) => a + b, 0), errors.length, 1) : null },
    perMove
  };
}
