// Shared logic for the opening-line explanations (build + check scripts).
// Facts (departPly, mainMove, lineMove) are always computed by replaying SAN with the site's rules engine; the
// hand-written text is only accepted if it stays inside those facts (see validateText).
import { Chess } from '../../rules-src/chess-compat.mjs';

export const REVIEWED_FIELD = false;
export const LOOKAHEAD_PLIES = 6;
export const MAX_TEXT_LENGTH = 320;

// A SAN move, optionally with a move number: "4.d3", "4...Nf6", "4…Nf6", "O-O", "Nbd2", "exd5", "e8=Q+".
const SAN_TOKEN = /(?<![A-Za-z0-9])(?:(\d{1,3})(\.{3}|…|\.))?(O-O-O|O-O|[KQRBN][a-h]?[1-8]?x?[a-h][1-8]|[a-h]x[a-h][1-8](?:=[QRBN])?|[a-h][1-8](?:=[QRBN])?)[+#]?(?![A-Za-z0-9])/g;

// Capitalised English words that may appear in text; anything else could be a person's name and is rejected.
const ALLOWED_CAPITALISED = new Set([
  'Black', 'White', 'Instead', 'After', 'The', 'It', 'This', 'That', 'Then', 'If', 'A', 'An', 'Both', 'With', 'Here', 'Now', 'Or', 'But',
  'Black\'s', 'White\'s', 'Italian', 'Sicilian', 'French', 'Dragon', 'Fried', 'Liver', 'Slav', 'Semi-Slav', 'Queen', 'King', 'Queen\'s', 'King\'s',
  'Giuoco', 'Pianissimo', 'Piano', 'Gambit', 'Caro-Kann', 'Meran', 'Scheveningen', 'Moscow',
]);
const FORBIDDEN_TEXT = /\b(engine|grandmasters?|masters?|statistics?|stats|win ?rate|popular|most players|favou?rite|fashionable|world champions?)\b|מנוע|אלוף|גרנדמאסטר|פופולרי|סטטיסטיק|נפוץ ביותר|חביב/i;

export const stripCheck = (san) => String(san).replace(/[+#]+$/, '');
const moveNumberOfPly = (ply) => Math.floor((ply - 1) / 2) + 1;
const plyIsWhite = (ply) => ply % 2 === 1;

export function replaySans(moves, label) {
  const game = new Chess();
  const sans = [];
  for (const entry of moves) {
    const raw = Array.isArray(entry) ? entry[0] : entry;
    let played = null;
    try { played = game.move(raw); } catch { played = null; }
    if (!played) throw new Error(`${label}: illegal move ${raw} at ply ${sans.length + 1}`);
    sans.push(played.san);
  }
  return sans;
}

export function findMainLine(opening) {
  return opening.lines.find((line) => line.star) || opening.lines[0];
}

// Returns null when the two lines never diverge (one is a prefix of the other).
export function computeFacts(mainSans, lineSans) {
  let index = 0;
  while (index < mainSans.length && index < lineSans.length && mainSans[index] === lineSans[index]) index += 1;
  if (index >= mainSans.length || index >= lineSans.length) return null;
  return { departPly: index + 1, mainMove: mainSans[index], lineMove: lineSans[index] };
}

export function extractMoveTokens(text) {
  const tokens = [];
  for (const match of text.matchAll(SAN_TOKEN)) {
    const [raw, number, dots, san] = match;
    tokens.push({ raw, number: number ? Number(number) : null, black: dots ? dots !== '.' : null, san: stripCheck(san) });
  }
  return tokens;
}

const tokenKey = (token) => `${token.number == null ? '' : token.number + (token.black ? '...' : '.')}${token.san}`;

function plyMatches(token, ply) {
  if (token.number == null) return true;
  return moveNumberOfPly(ply) === token.number && plyIsWhite(ply) === !token.black;
}

function tokenInRange(token, sequences, limit) {
  return sequences.some((sans) => {
    for (let ply = 1; ply <= Math.min(limit, sans.length); ply += 1) {
      if (stripCheck(sans[ply - 1]) === token.san && plyMatches(token, ply)) return true;
    }
    return false;
  });
}

function sentenceCount(text) {
  const plain = text.replace(SAN_TOKEN, 'M');
  return (plain.match(/[.!?](?=\s|$)/g) || []).length;
}

// Validates one language of one entry. Returns a list of problems (empty = ok).
export function validateText(lang, text, facts, mainSans, lineSans, { confident = true } = {}) {
  const problems = [];
  if (typeof text !== 'string' || !text.trim()) return [`${lang}: text is empty`];
  if (text !== text.trim()) problems.push(`${lang}: has leading/trailing whitespace`);
  if (text.length > MAX_TEXT_LENGTH) problems.push(`${lang}: longer than ${MAX_TEXT_LENGTH} characters`);
  if (FORBIDDEN_TEXT.test(text)) problems.push(`${lang}: contains a forbidden claim word (engine / statistics / popularity / titles)`);

  const tokens = extractMoveTokens(text);
  const sentences = sentenceCount(text);
  if (sentences < 1 || sentences > 2) problems.push(`${lang}: must be 1-2 sentences, found ${sentences}`);
  if (!confident && sentences !== 1) problems.push(`${lang}: a not-confident entry must be a single factual sentence`);

  const limit = facts.departPly + LOOKAHEAD_PLIES;
  for (const token of tokens) {
    if (!tokenInRange(token, [mainSans, lineSans], limit)) {
      problems.push(`${lang}: move "${token.raw}" is not in the main line or this line within ply ${limit}`);
    }
  }

  const departNumber = moveNumberOfPly(facts.departPly);
  const departBlack = !plyIsWhite(facts.departPly);
  for (const [role, san] of [['line move', facts.lineMove], ['main move', facts.mainMove]]) {
    const named = tokens.some((token) => token.san === stripCheck(san) && token.number === departNumber && token.black === departBlack);
    if (!named) problems.push(`${lang}: does not name the ${role} as ${departNumber}${departBlack ? '...' : '.'}${stripCheck(san)}`);
  }

  const withoutMoves = text.replace(SAN_TOKEN, ' ');
  if (/\d/.test(withoutMoves)) problems.push(`${lang}: contains numbers outside move notation (evaluations/statistics are not allowed)`);
  if (/[%≈±∓]|\+=|=\+/.test(withoutMoves)) problems.push(`${lang}: contains an evaluation symbol`);

  if (lang === 'he') {
    if (!/[\u0590-\u05FF]/.test(withoutMoves)) problems.push('he: has no Hebrew letters');
    if (/[A-Za-z]/.test(withoutMoves)) problems.push('he: has Latin letters outside move notation');
  } else {
    if (/[\u0590-\u05FF]/.test(text)) problems.push('en: contains Hebrew letters');
    for (const word of withoutMoves.match(/\b[A-Z][A-Za-z'-]*/g) || []) {
      if (!ALLOWED_CAPITALISED.has(word)) problems.push(`en: capitalised word "${word}" is not on the allow-list (no person names)`);
    }
  }
  return problems;
}

export function validateEntry(entry, facts, mainSans, lineSans) {
  const problems = [];
  const confident = entry.confident !== false;
  for (const lang of ['he', 'en']) problems.push(...validateText(lang, entry[lang], facts, mainSans, lineSans, { confident }));
  if (!problems.length) {
    const he = new Set(extractMoveTokens(entry.he).map(tokenKey));
    const en = new Set(extractMoveTokens(entry.en).map(tokenKey));
    for (const key of en) if (!he.has(key)) problems.push(`he: move ${key} appears in en but not in he`);
    for (const key of he) if (!en.has(key)) problems.push(`en: move ${key} appears in he but not in en`);
  }
  return problems;
}

// Computes the facts for every `${openingId}/${lineId}` key. Throws on unknown keys or lines without a divergence.
export function computeAllFacts(repertoire, keys) {
  const byId = new Map(repertoire.map((opening) => [opening.id, opening]));
  const facts = new Map();
  const errors = [];
  const mainCache = new Map();
  for (const key of keys) {
    const [openingId, lineId, extra] = key.split('/');
    const opening = byId.get(openingId);
    const line = opening?.lines.find((candidate) => candidate.id === lineId);
    if (!openingId || !lineId || extra !== undefined || !opening || !line) { errors.push(`${key}: not found in repertoire.json`); continue; }
    const main = findMainLine(opening);
    if (line === main) { errors.push(`${key}: is the main line of its opening`); continue; }
    try {
      if (!mainCache.has(openingId)) mainCache.set(openingId, replaySans(main.moves, `${openingId}/${main.id}`));
      const mainSans = mainCache.get(openingId);
      const lineSans = replaySans(line.moves, key);
      const departure = computeFacts(mainSans, lineSans);
      if (!departure) { errors.push(`${key}: never diverges from the main line (prefix of it, or it extends it)`); continue; }
      facts.set(key, { ...departure, mainSans, lineSans });
    } catch (error) { errors.push(error.message); }
  }
  return { facts, errors };
}

// Merges hand-written texts with computed facts. Returns { output, errors } where output is keyed in repertoire order.
export function buildEntries(repertoire, texts) {
  const keys = Object.keys(texts);
  const { facts, errors } = computeAllFacts(repertoire, keys);
  const output = {};
  const order = [];
  for (const opening of repertoire) for (const line of opening.lines) order.push(`${opening.id}/${line.id}`);
  for (const key of order) {
    if (!facts.has(key) || !texts[key]) continue;
    const fact = facts.get(key);
    const text = texts[key];
    const problems = validateEntry(text, fact, fact.mainSans, fact.lineSans);
    for (const problem of problems) errors.push(`${key}: ${problem}`);
    const entry = { he: text.he, en: text.en, departPly: fact.departPly, mainMove: fact.mainMove, lineMove: fact.lineMove, reviewed: REVIEWED_FIELD };
    if (text.confident === false) entry.confident = false;
    output[key] = entry;
  }
  return { output, errors };
}

// Re-validates an already written output file against repertoire.json (used by the check script).
export function validateOutput(repertoire, output) {
  const errors = [];
  if (!output || typeof output !== 'object' || Array.isArray(output)) return ['output must be an object keyed by openingId/lineId'];
  const { facts, errors: factErrors } = computeAllFacts(repertoire, Object.keys(output));
  errors.push(...factErrors);
  const allowed = new Set(['he', 'en', 'departPly', 'mainMove', 'lineMove', 'reviewed', 'confident']);
  for (const [key, entry] of Object.entries(output)) {
    const fact = facts.get(key);
    if (!fact) continue;
    for (const field of Object.keys(entry)) if (!allowed.has(field)) errors.push(`${key}: unexpected field ${field}`);
    if (entry.reviewed !== false) errors.push(`${key}: reviewed must be false`);
    if (entry.confident !== undefined && entry.confident !== false) errors.push(`${key}: confident, when present, must be false`);
    if (entry.departPly !== fact.departPly) errors.push(`${key}: departPly ${entry.departPly} != computed ${fact.departPly}`);
    if (entry.mainMove !== fact.mainMove) errors.push(`${key}: mainMove ${entry.mainMove} != computed ${fact.mainMove}`);
    if (entry.lineMove !== fact.lineMove) errors.push(`${key}: lineMove ${entry.lineMove} != computed ${fact.lineMove}`);
    for (const problem of validateEntry(entry, fact, fact.mainSans, fact.lineSans)) errors.push(`${key}: ${problem}`);
  }
  return errors;
}
