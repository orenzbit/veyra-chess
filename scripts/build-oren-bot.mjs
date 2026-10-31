#!/usr/bin/env node
// Builds the Oren bot profile (id `orenzbit`) from the account's own PGN files.
// Contract (shared with the F30 pipeline): SF\bot-plans\13-oren-bot.md §5.2 and SF\feature-plans\F30.md §4.
// Reuses the pure helpers of scripts/build-historical-legend-bots.mjs by copy; that file is not edited.
//   node scripts/build-oren-bot.mjs --out=<dir> [--pgn-dir=.] [--base-index=public/data/bots/index.json]
//        [--split-ledger=<json>] [--report=<json>] [--data-version=<int>] [--check]
// Exit codes: 0 ok · 1 unexpected · 2 validation · 3 input · 4 split-ledger conflict · 5 identity collision.
import { createHash } from 'node:crypto';
import { readFile, readdir, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Chess } from '../public/vendor/veyra-rules/chess-compat.js';

export const BUILDER_VERSION = 1;
const ACCOUNT = 'orenzbit';
const CANONICAL = /^orenzbit-\d{4}-\d{2}\.pgn$/;
const HOLDOUT_MODULUS = 10;
const MIN_PLIES = 8;
const OPENING_PLIES = 16;
const MIN_LINES = 8;
const MAX_LINES = 12;
const MIN_HOLDOUT_POSITIONS = 8;
const MAX_HOLDOUT_POSITIONS = 24;
const MAX_EXAMPLES = 8;
const STYLES = ['tactical', 'positional', 'attacking', 'defensive', 'endgame', 'universal'];
const STAGES = ['beginner', 'advanced', 'expert', 'grandmaster'];

// Owner decisions (B2/B4). Elo, tier, stage, piece and quips are NOT hard-coded here:
// - elo = nearest integer to the measured own-Elo median (200) that no other manifest entry uses (search +1, -1, +2, ...);
// - tier, stage, piece and quips are copied verbatim from the regular bot with the closest Elo to the median;
// - region is the factual label "אונליין" (his games are online); era is the year span of the usable games.
export const ORENBOT_IDENTITY = {
  id: 'orenzbit',
  name: 'אורן',
  region: 'אונליין',
  style: 'universal',
  styleLabel: 'אוניברסלי',
  description: 'בוט שחמט עצמאי שנבנה ממשחקי החשבון orenzbit בלבד.',
  persona: 'אורן — בוט שחמט עצמאי',
  flavor: 'רפרטואר ודפוסי מהלכים שנמדדו ממשחקי החשבון.',
};

// Copied from build-historical-legend-bots.mjs (styleText.universal, phraseTriggers, makePhraseArchive, uniq).
const UNIVERSAL_TEXT = { general: 'התאם את התוכנית למאפייני העמדה, לא לתווית קבועה.', opening: 'שמור על גמישות והבן את הרעיון מאחורי המסע.', threat: 'השווה בין איומי היריב לבין התוכנית שלך.', tactics: 'בדוק אפשרויות כפויות לפני בחירה אסטרטגית.', endgame: 'העבר את יתרונות אמצע המשחק לסיום מתאים.' };
const PHRASE_TRIGGERS = { general: 'after-move', opening: 'opening-phase', threat: 'check-or-checkmate', tactics: 'capture-or-tactical-move', endgame: 'endgame-phase' };
const uniq = (values) => [...new Set(values.filter((value) => typeof value === 'string' && value.trim()))];
function makePhraseArchive(quips, name, botId) {
  const personal = (text) => name + ': ' + text;
  const category = (key, index, fallback) => uniq([quips[index], personal(UNIVERSAL_TEXT[key]), fallback]).slice(0, 3).map((text, entryIndex) => ({
    id: botId + '-' + key + '-' + (entryIndex + 1), category: key, trigger: PHRASE_TRIGGERS[key], text, language: 'he',
  }));
  return {
    general: category('general', 0, 'בדוק את איומי שני הצדדים לפני בחירת מהלך.'),
    opening: category('opening', 1, 'השתמש ברפרטואר כנקודת התחלה, לא כהתחייבות עיוורת.'),
    threat: category('threat', 2, 'איום טוב הוא איום ששורד את ההגנה הטובה ביותר.'),
    tactics: category('tactics', 3, 'אל תקריב חומר ללא תמורה שניתן להסביר.'),
    endgame: category('endgame', 4, 'בדוק פעילות מלך, רגלים חופשיים וחולשות לפני חילופים.'),
  };
}

class BuildError extends Error {
  constructor(code, message, details) { super(message); this.code = code; this.details = details; }
}

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const median = (values) => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;
};
const round = (value, digits = 2) => Number(value.toFixed(digits));
const isAccount = (value) => String(value || '').trim().toLowerCase() === ACCOUNT;
const toJsonFile = (value) => JSON.stringify(value, null, 2).replace(/\n/g, '\r\n') + '\r\n';
const ruleSplit = (chunkIdx) => (chunkIdx % HOLDOUT_MODULUS === 0 ? 'holdout' : 'training');

function parseHeaders(text) {
  const headers = {};
  const re = /^\[([A-Za-z0-9_]+)\s+"((?:[^"\\]|\\.)*)"\]\s*$/gm;
  let match;
  while ((match = re.exec(text))) headers[match[1]] = match[2].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  return headers;
}
const splitGames = (text) => text.split(/(?=^\[Event\s+")/m).filter((chunk) => /^\[Event\s+"/m.test(chunk));
function formatMoves(sans) {
  return sans.map((san, index) => (index % 2 === 0 ? (Math.floor(index / 2) + 1) + '.' : '') + san).join(' ').trim();
}

function parseArgs(argv) {
  const opts = { pgnDir: '.', baseIndex: 'public/data/bots/index.json', out: null, splitLedger: null, report: null, dataVersion: null, check: false };
  for (const arg of argv) {
    const match = arg.match(/^--([a-z-]+)(?:=(.*))?$/);
    if (!match) throw new BuildError(3, 'unknown argument: ' + arg);
    const [, key, value] = match;
    if (key === 'check') opts.check = true;
    else if (key === 'pgn-dir' && value) opts.pgnDir = value;
    else if (key === 'base-index' && value) opts.baseIndex = value;
    else if (key === 'out' && value) opts.out = value;
    else if (key === 'split-ledger' && value) opts.splitLedger = value;
    else if (key === 'report' && value) opts.report = value;
    else if (key === 'data-version' && value) {
      if (!/^[1-9]\d*$/.test(value)) throw new BuildError(3, '--data-version must be a positive integer');
      opts.dataVersion = Number(value);
    } else throw new BuildError(3, 'invalid or incomplete argument: --' + key);
  }
  if (!opts.out) throw new BuildError(3, '--out=<dir> is required');
  return opts;
}

async function loadSources(pgnDir) {
  let names;
  try { names = (await readdir(pgnDir)).filter((name) => /^orenzbit/i.test(name) && /\.pgn$/i.test(name)).sort(); } catch (error) {
    throw new BuildError(3, 'cannot read --pgn-dir ' + pgnDir + ' (' + error.code + ')');
  }
  const canonical = names.filter((name) => CANONICAL.test(name));
  if (!canonical.length) throw new BuildError(3, 'no canonical orenzbit-YYYY-MM.pgn files in ' + pgnDir);
  const files = [], shaToName = new Map();
  for (const name of canonical) {
    const buffer = await readFile(join(pgnDir, name));
    const digest = sha256(buffer);
    if (shaToName.has(digest)) throw new BuildError(3, name + ' is byte-identical to ' + shaToName.get(digest));
    shaToName.set(digest, name);
    files.push({ name, sha256: digest, bytes: buffer.length, text: buffer.toString('utf8'), duplicateOf: null });
  }
  for (const name of names.filter((item) => !CANONICAL.test(item))) {
    const buffer = await readFile(join(pgnDir, name));
    const digest = sha256(buffer);
    const same = shaToName.get(digest);
    if (!same) throw new BuildError(3, 'non-canonical file ' + name + ' is not byte-identical to a canonical month file');
    files.push({ name, sha256: digest, bytes: buffer.length, text: null, duplicateOf: same });
  }
  return files;
}

function collectGames(files) {
  const games = [], linkOwner = new Map();
  for (const file of files.filter((item) => !item.duplicateOf)) {
    splitGames(file.text).forEach((text, chunkIdx) => {
      const headers = parseHeaders(text);
      if (!headers.Event || !headers.Link) throw new BuildError(3, file.name + ' game ' + chunkIdx + ': Event or Link header is missing');
      if (linkOwner.has(headers.Link)) throw new BuildError(3, 'duplicate Link ' + headers.Link + ' in ' + file.name + ' and ' + linkOwner.get(headers.Link));
      linkOwner.set(headers.Link, file.name);
      games.push({ key: headers.Link, file: file.name, chunkIdx, text, headers });
    });
  }
  return games;
}

async function loadLedger(path) {
  if (!path) return null;
  let parsed;
  try { parsed = JSON.parse(await readFile(path, 'utf8')); } catch { throw new BuildError(4, 'split ledger is unreadable or not JSON: ' + path); }
  if (!parsed || typeof parsed.splits !== 'object' || parsed.splits === null || Array.isArray(parsed.splits)) throw new BuildError(4, 'split ledger must contain a "splits" object');
  for (const [key, value] of Object.entries(parsed.splits)) {
    if (value !== 'training' && value !== 'holdout') throw new BuildError(4, 'split ledger has invalid value for ' + key);
  }
  return parsed.splits;
}

function accountColour(headers) {
  const white = isAccount(headers.White), black = isAccount(headers.Black);
  if (white && black) return { colour: null, reason: 'ambiguous-colour' };
  if (white) return { colour: 'w', reason: '' };
  if (black) return { colour: 'b', reason: '' };
  return { colour: null, reason: 'not-player' };
}

function replayMoves(text) {
  const game = new Chess();
  game.loadPgn(text, { sloppy: true });
  return game.history({ verbose: true });
}

function outcomeFor(colour, result) {
  if (result === '1/2-1/2') return 'draw';
  if (result === '1-0') return colour === 'w' ? 'win' : 'loss';
  if (result === '0-1') return colour === 'b' ? 'win' : 'loss';
  return 'unfinished';
}

function terminationKind(text) {
  if (/abandon/i.test(text)) return 'abandoned';
  if (/resign/i.test(text)) return 'resigned';
  if (/checkmate/i.test(text)) return 'checkmate';
  if (/time/i.test(text)) return 'time';
  if (/draw|stalemate|repetition|insufficient|agreement|50/i.test(text)) return 'draw-type';
  return 'other';
}

function measureGame(moves, colour) {
  let own = 0, captures = 0, checks = 0, late = 0, promotions = 0, castleAt = null;
  moves.forEach((move, index) => {
    if (move.color !== colour) return;
    own += 1;
    if (move.captured || move.san.includes('x')) captures += 1;
    if (move.san.includes('+') || move.san.includes('#')) checks += 1;
    if (index >= 40 && move.piece === 'k') late += 1;
    if (move.promotion) promotions += 1;
    if (castleAt === null && move.san.startsWith('O-O')) castleAt = own;
  });
  const last = moves[moves.length - 1];
  return { own, captures, checks, late, promotions, castleAt, mateEnding: Boolean(last && last.san.includes('#')) };
}

// Classifies every chunk: ledger check, colour, replay, short games. Returns report rows and usable game records.
function classify(games, ledger) {
  const rows = [], usable = [], conflicts = [];
  for (const game of games) {
    const rule = ruleSplit(game.chunkIdx);
    const pinned = ledger ? ledger[game.key] : undefined;
    if (pinned !== undefined && pinned !== rule) conflicts.push({ key: game.key, file: game.file, chunkIdx: game.chunkIdx, ledger: pinned, rule });
    const split = pinned ?? rule;
    const row = { key: game.key, file: game.file, chunkIdx: game.chunkIdx, split, usable: false, reason: '' };
    rows.push(row);
    const { colour, reason } = accountColour(game.headers);
    if (!colour) { row.reason = reason; continue; }
    let moves;
    try { moves = replayMoves(game.text); } catch (error) {
      row.reason = 'replay-failed';
      row.error = String(error.message).slice(0, 80);
      continue;
    }
    if (moves.length < MIN_PLIES) { row.reason = 'short'; continue; }
    row.usable = true;
    row.reason = 'usable';
    const eco = game.headers.ECO && /^[A-E]\d{2}$/.test(game.headers.ECO) ? game.headers.ECO : '';
    const own = Number(colour === 'w' ? game.headers.WhiteElo : game.headers.BlackElo);
    const opponent = Number(colour === 'w' ? game.headers.BlackElo : game.headers.WhiteElo);
    usable.push({
      key: game.key, file: game.file, chunkIdx: game.chunkIdx, split, colour, moves,
      sans: moves.map((move) => move.san), result: game.headers.Result || '*', date: game.headers.Date || '',
      event: game.headers.Event, round: game.headers.Round || null, eco, own, opponent,
      termination: terminationKind(game.headers.Termination || ''), measure: measureGame(moves, colour),
      outcome: outcomeFor(colour, game.headers.Result || '*'),
    });
  }
  return { rows, usable, conflicts };
}

function aggregate(list) {
  const n = list.length;
  const sum = (fn) => list.reduce((total, item) => total + fn(item), 0);
  const ownMoves = sum((g) => g.measure.own);
  const castles = list.filter((g) => g.measure.castleAt !== null).map((g) => g.measure.castleAt);
  const terminations = {};
  for (const g of list) terminations[g.termination] = (terminations[g.termination] || 0) + 1;
  return {
    games: n,
    whiteGames: list.filter((g) => g.colour === 'w').length,
    blackGames: list.filter((g) => g.colour === 'b').length,
    wins: list.filter((g) => g.outcome === 'win').length,
    draws: list.filter((g) => g.outcome === 'draw').length,
    losses: list.filter((g) => g.outcome === 'loss').length,
    unfinished: list.filter((g) => g.outcome === 'unfinished').length,
    averagePlies: round(sum((g) => g.moves.length) / n),
    averageOwnMoves: round(ownMoves / n),
    capturesPer100Moves: round((100 * sum((g) => g.measure.captures)) / ownMoves),
    checksPer100Moves: round((100 * sum((g) => g.measure.checks)) / ownMoves),
    lateKingMovesPer100Moves: round((100 * sum((g) => g.measure.late)) / ownMoves),
    promotionsPerGame: round(sum((g) => g.measure.promotions) / n, 3),
    castledGames: castles.length,
    medianCastleOwnMove: median(castles),
    checkmateEndingGames: list.filter((g) => g.measure.mateEnding).length,
    terminations,
    ownEloMedian: median(list.map((g) => g.own)),
    opponentEloMedian: median(list.map((g) => g.opponent)),
  };
}

function buildLines(trainGames, colour) {
  const lines = new Map();
  for (const game of trainGames.filter((g) => g.colour === colour)) {
    const lineSans = game.sans.slice(0, OPENING_PLIES);
    const key = game.eco + '|' + lineSans.join(' ');
    const current = lines.get(key) || { sans: lineSans, eco: game.eco, games: 0 };
    current.games += 1;
    lines.set(key, current);
  }
  const distinct = lines.size;
  const selected = [...lines.values()]
    .sort((a, b) => b.games - a.games || a.sans.join(' ').localeCompare(b.sans.join(' ')))
    .slice(0, MAX_LINES)
    .map((line, index) => {
      const replay = new Chess();
      for (const san of line.sans) {
        if (!replay.move(san, { sloppy: true })) throw new BuildError(2, 'illegal opening SAN ' + san + ' in ' + colour + ' line ' + (index + 1));
      }
      return { name: 'קו שנצפה במשחקי האימון ' + (index + 1) + ' · ' + line.games + ' משחקים', moves: formatMoves(line.sans), games: line.games, ...(line.eco ? { eco: line.eco } : {}) };
    });
  return { selected, distinct };
}

function holdoutPositions(holdoutGames) {
  const positions = [];
  for (const game of holdoutGames) {
    if (positions.length >= MAX_HOLDOUT_POSITIONS) break;
    const replay = new Chess(), seenPhases = new Set(), { moves, colour } = game, moveCount = moves.length;
    for (let index = 0; index < moveCount; index += 1) {
      const move = moves[index], phaseIndex = Math.min(3, Math.floor((index / moveCount) * 4));
      if (index >= 8 && move.color === colour && !seenPhases.has(phaseIndex)) {
        const phase = phaseIndex === 0 ? 'opening' : phaseIndex <= 2 ? 'middlegame' : 'endgame';
        positions.push({
          gameId: game.key, sourceFile: game.file, event: game.event, date: game.date || null, round: game.round,
          color: colour === 'w' ? 'white' : 'black', side: colour, opponent: null, result: game.result, phase, ply: index + 1,
          fen: replay.fen(), sourceMove: move.from + move.to + (move.promotion || ''), sourceSan: move.san,
        });
        seenPhases.add(phaseIndex);
      }
      replay.move({ from: move.from, to: move.to, promotion: move.promotion || undefined });
      if (positions.length >= MAX_HOLDOUT_POSITIONS) break;
    }
  }
  return positions;
}

function exampleGames(trainGames) {
  const byKey = new Map();
  for (const game of trainGames) {
    const color = game.colour === 'w' ? 'white' : 'black';
    const key = color + ':' + game.outcome;
    if (byKey.has(key)) continue;
    byKey.set(key, {
      gameId: game.key, split: 'training', sourceFile: game.file, event: game.event, date: game.date || null, round: game.round,
      color, opponent: null, result: game.result, outcome: game.outcome, eco: game.eco || null, sampleMoves: formatMoves(game.sans.slice(0, 16)),
    });
  }
  return [...byKey.values()].sort((a, b) => (a.color + a.outcome).localeCompare(b.color + b.outcome)).slice(0, MAX_EXAMPLES);
}

// Elo rule: the measured median is used if free; otherwise the nearest unused integer, searching +1, -1, +2, -2, ...
function chooseElo(measuredMedian, others) {
  const taken = new Set(others.map((entry) => entry.elo));
  for (let distance = 0; distance <= 3900; distance += 1) {
    const candidates = distance === 0 ? [measuredMedian] : [measuredMedian + distance, measuredMedian - distance];
    for (const candidate of candidates) {
      if (candidate >= 100 && candidate <= 4000 && !taken.has(candidate)) return candidate;
    }
  }
  throw new BuildError(5, 'no unused Elo found near ' + measuredMedian);
}
// Donor for copied fields: the other manifest entry whose Elo is closest to the measured median (ties: lower Elo, then id).
function chooseDonor(measuredMedian, others) {
  return [...others].sort((a, b) => Math.abs(a.elo - measuredMedian) - Math.abs(b.elo - measuredMedian) || a.elo - b.elo || a.id.localeCompare(b.id))[0];
}

function assertIdentity(identity) {
  for (const key of ['id', 'name', 'ratingBasis', 'stage', 'region', 'era', 'piece', 'style', 'styleLabel', 'description', 'persona', 'flavor']) {
    if (typeof identity[key] !== 'string' || !identity[key].trim() || /TBD/.test(identity[key])) throw new BuildError(2, 'identity field ' + key + ' is not set');
  }
  if (!Number.isInteger(identity.tier) || identity.tier < 0 || identity.tier > 3) throw new BuildError(2, 'identity tier must be 0-3');
  if (!Number.isInteger(identity.elo) || identity.elo < 100 || identity.elo > 4000) throw new BuildError(2, 'identity elo must be an integer 100-4000');
  if (!STAGES.includes(identity.stage)) throw new BuildError(2, 'identity stage is not in the closed list');
  if (!STYLES.includes(identity.style)) throw new BuildError(2, 'identity style is not in the closed list');
  if (!Array.isArray(identity.quips) || identity.quips.length < 3 || identity.quips.some((line) => typeof line !== 'string' || !line.trim())) throw new BuildError(2, 'identity quips need at least 3 non-empty lines');
}

// Merge rule: exactly one entry for the bot id, other entries untouched, sorted like the existing manifest (elo, id).
function mergeIndex(baseText, profile) {
  const base = JSON.parse(baseText);
  if (toJsonFile(base) !== baseText) throw new BuildError(2, 'base index does not round-trip byte-for-byte (CRLF/format); refusing to rewrite it');
  const others = base.filter((entry) => entry.id !== profile.id);
  const nameClash = others.find((entry) => entry.name === profile.name);
  if (nameClash) throw new BuildError(5, 'display name "' + profile.name + '" is already used by ' + nameClash.id);
  if (others.some((entry) => entry.elo === profile.elo)) throw new BuildError(5, 'elo ' + profile.elo + ' is already used by another entry');
  for (const field of ['region', 'era']) {
    const clash = others.find((entry) => entry[field] === profile[field]);
    if (clash) throw new BuildError(5, field + ' "' + profile[field] + '" is already used by ' + clash.id);
  }
  const next = [...others, profile].sort((a, b) => a.elo - b.elo || a.id.localeCompare(b.id));
  const sameOrder = JSON.stringify(next.filter((entry) => entry.id !== profile.id).map((entry) => entry.id)) === JSON.stringify(others.map((entry) => entry.id));
  if (!sameOrder) throw new BuildError(2, 'base index is not sorted by (elo, id); inserting would reorder other entries');
  const warnings = others
    .filter((entry) => entry.elo === profile.elo || entry.region === profile.region || entry.era === profile.era)
    .map((entry) => ({ id: entry.id, sameElo: entry.elo === profile.elo, sameRegion: entry.region === profile.region, sameEra: entry.era === profile.era }));
  return { next, warnings, baseCount: base.length };
}

async function writeOutputs(outDir, profile, indexEntries) {
  const profilePath = join(outDir, profile.id + '.json'), indexPath = join(outDir, 'index.json');
  const profileText = toJsonFile(profile), indexText = toJsonFile(indexEntries);
  const tmpProfile = profilePath + '.' + process.pid + '.tmp', tmpIndex = indexPath + '.' + process.pid + '.tmp';
  let previousProfile = null;
  try { previousProfile = await readFile(profilePath, 'utf8'); } catch { previousProfile = null; }
  try {
    await writeFile(tmpProfile, profileText, 'utf8');
    await writeFile(tmpIndex, indexText, 'utf8');
    await rename(tmpProfile, profilePath);
    try { await rename(tmpIndex, indexPath); } catch (error) {
      if (previousProfile === null) await unlink(profilePath).catch(() => {});
      else await writeFile(profilePath, previousProfile, 'utf8');
      throw new BuildError(1, 'index rename failed; profile restored: ' + error.code);
    }
  } finally {
    await unlink(tmpProfile).catch(() => {});
    await unlink(tmpIndex).catch(() => {});
  }
}

async function build(opts) {
  const files = await loadSources(opts.pgnDir);
  const games = collectGames(files);
  const ledger = await loadLedger(opts.splitLedger);
  const { rows, usable, conflicts } = classify(games, ledger);
  if (conflicts.length) throw new BuildError(4, 'split ledger conflicts with the current chunk rule for ' + conflicts.length + ' game(s)', { conflicts: conflicts.slice(0, 50) });
  const training = usable.filter((g) => g.split === 'training');
  const holdout = usable.filter((g) => g.split === 'holdout');
  if (!training.length || !holdout.length) throw new BuildError(2, 'train/holdout split is empty');
  const baseText = await readFile(opts.baseIndex, 'utf8').catch(() => { throw new BuildError(3, 'cannot read --base-index ' + opts.baseIndex); });
  const others = JSON.parse(baseText).filter((entry) => entry.id !== ORENBOT_IDENTITY.id);
  const ownMedian = median(usable.map((g) => g.own));
  if (!Number.isInteger(ownMedian)) throw new BuildError(2, 'measured own-Elo median is not available');
  const elo = chooseElo(ownMedian, others);
  const donor = chooseDonor(ownMedian, others);
  const years = usable.map((g) => Number(String(g.date).slice(0, 4))).filter(Number.isInteger);
  if (!years.length) throw new BuildError(2, 'no usable game has a Date year');
  const minYear = Math.min(...years), maxYear = Math.max(...years);
  const era = minYear === maxYear ? String(minYear) : minYear + '–' + maxYear;
  const usedBy = others.filter((entry) => entry.elo === ownMedian).map((entry) => entry.id);
  const eloAdjustment = {
    measuredMedian: ownMedian,
    assignedElo: elo,
    rule: 'measured median used if no other manifest entry has it; otherwise nearest unused integer, searching +1, -1, +2, -2, ...',
    reason: usedBy.length ? 'measured median ' + ownMedian + ' is already used by ' + usedBy.join(', ') : 'measured median is unused',
  };
  const identity = {
    ...ORENBOT_IDENTITY,
    elo,
    ratingBasis: 'חציון דירוג עצמי מכותרות WhiteElo/BlackElo במשחקי החשבון (' + ownMedian + ')' + (elo === ownMedian ? '' : '; הערך במניפסט ' + elo + ' כי ' + ownMedian + ' תפוס בידי ' + usedBy.join(', ')) + '; אינו דירוג רשמי',
    tier: donor.tier, stage: donor.stage, region: ORENBOT_IDENTITY.region, era, piece: donor.piece,
    quips: donor.quips, copiedFrom: donor.id, eloAdjustment,
  };
  assertIdentity(identity);
  const white = buildLines(training, 'w'), black = buildLines(training, 'b');
  if (white.selected.length < MIN_LINES || black.selected.length < MIN_LINES) throw new BuildError(2, 'insufficient distinct training lines (white ' + white.selected.length + ', black ' + black.selected.length + ')');
  const positions = holdoutPositions(holdout);
  if (positions.length < MIN_HOLDOUT_POSITIONS) throw new BuildError(2, 'insufficient held-out positions: ' + positions.length);
  const trainKeys = new Set(training.map((g) => g.key));
  if (holdout.some((g) => trainKeys.has(g.key))) throw new BuildError(2, 'holdout/training overlap detected');

  const canonicalFiles = files.filter((f) => !f.duplicateOf);
  const dates = usable.map((g) => g.date).filter(Boolean).sort();
  const sourceSetSha256 = sha256(canonicalFiles.map((f) => f.name + ' ' + f.sha256).join('\n'));
  const trainingMetrics = aggregate(training), holdoutMetrics = aggregate(holdout);
  const gambits = white.selected.slice(0, 2).map((line, index) => ({ ...line, name: 'קו משלים מתוך משחקי המקור ' + (index + 1) }));
  const profile = {
    id: identity.id,
    slug: identity.id,
    elo: identity.elo,
    ratingBasis: identity.ratingBasis,
    measuredOwnEloMedian: ownMedian,
    eloAdjustment,
    copiedFrom: identity.copiedFrom,
    name: identity.name,
    title: identity.styleLabel + ' · בוט שחמט עצמאי',
    tier: identity.tier,
    stage: identity.stage,
    flavor: identity.flavor,
    piece: identity.piece,
    era: identity.era,
    region: identity.region,
    persona: identity.persona,
    historicalNote: identity.description,
    description: identity.description,
    style: identity.style,
    styleLabel: identity.styleLabel,
    openingEraNote: 'רפרטואר נגזר ממשחקי האימון של החשבון (' + training.length + ' משחקים); שכיחות אינה מעידה על איכות.',
    quips: identity.quips,
    openingsAsWhite: white.selected,
    openingsAsBlack: black.selected,
    gambits,
    sourceGameCount: usable.length,
    trainingGameCount: training.length,
    holdoutGameCount: holdout.length,
    holdoutPositions: positions,
    holdoutGameKeys: holdout.map((g) => g.key),
    sourceFiles: canonicalFiles.map((f) => f.name),
    sourceFileSha256: Object.fromEntries(canonicalFiles.map((f) => [f.name, f.sha256])),
    sourceSetSha256,
    builderVersion: BUILDER_VERSION,
    sourceYearRange: dates.length ? dates[0] + '–' + dates[dates.length - 1] : 'unknown',
    sourceNote: 'מקור: ' + canonicalFiles.length + ' קבצי PGN של החשבון; ' + usable.length + ' משחקים שמישים (' + training.length + ' אימון, ' + holdout.length + ' holdout). הפתיחות והמדדים נגזרים ממשחקי האימון בלבד; holdout משמש לבדיקה בלבד.',
    styleMetrics: trainingMetrics,
    holdoutStyleMetrics: holdoutMetrics,
    exampleGames: exampleGames(training),
    styleAssessment: 'סגנון universal (ללא סיווג), לפי החלטת הבעלים; המדדים מתארים שכיחות בלבד ואינם מוכיחים איכות מהלך.',
    legendCategory: identity.style,
    blindfoldEnabled: false,
    phraseArchive: makePhraseArchive(identity.quips, identity.name, identity.id),
    phraseArchiveVersion: 2,
    ...(opts.dataVersion ? { dataVersion: opts.dataVersion } : {}),
  };
  const merged = mergeIndex(baseText, profile);
  const profileText = toJsonFile(profile), indexText = toJsonFile(merged.next);
  return {
    profile, indexEntries: merged.next, merged, rows, files, conflicts: [], canonicalFiles, usable,
    trainingCount: training.length, holdoutCount: holdout.length, ownMedian, sourceSetSha256,
    profileSha256: sha256(profileText), indexSha256: sha256(indexText),
  };
}

function buildReport(opts, result, exit, error) {
  const perFile = [];
  for (const file of result ? result.files : []) {
    const fileRows = result.rows.filter((row) => row.file === file.name);
    const replayFailed = fileRows.filter((row) => row.reason === 'replay-failed').map((row) => ({ key: row.key, error: row.error }));
    perFile.push({
      name: file.name, sha256: file.sha256, bytes: file.bytes, duplicateOf: file.duplicateOf,
      games: fileRows.length,
      notPlayer: fileRows.filter((row) => row.reason === 'not-player' || row.reason === 'ambiguous-colour').length,
      replayFailed,
      shortGames: fileRows.filter((row) => row.reason === 'short').length,
      usable: fileRows.filter((row) => row.usable).length,
      holdout: fileRows.filter((row) => row.usable && row.split === 'holdout').length,
      training: fileRows.filter((row) => row.usable && row.split === 'training').length,
    });
  }
  const count = (reason) => (result ? result.rows.filter((row) => row.reason === reason).length : 0);
  return {
    builderVersion: BUILDER_VERSION,
    exit,
    ...(error ? { error: error.message, details: error.details || null } : {}),
    check: opts.check,
    dataVersion: opts.dataVersion,
    files: perFile,
    totals: result ? {
      canonicalFiles: result.canonicalFiles.length,
      duplicatesSkipped: result.files.filter((file) => file.duplicateOf).length,
      games: result.rows.length,
      notPlayer: count('not-player') + count('ambiguous-colour'),
      replayFailed: count('replay-failed'),
      short: count('short'),
      usable: result.usable.length,
      holdout: result.holdoutCount,
      training: result.trainingCount,
      ownEloMedian: result.ownMedian,
      ledgerConflicts: result.conflicts.length,
    } : null,
    identity: result ? {
      id: result.profile.id, elo: result.profile.elo, name: result.profile.name, style: result.profile.style,
      measuredOwnEloMedian: result.profile.measuredOwnEloMedian, eloAdjustment: result.profile.eloAdjustment,
      copiedFrom: result.profile.copiedFrom, identityWarnings: result.merged.warnings,
    } : null,
    sourceSetSha256: result ? result.sourceSetSha256 : null,
    profileSha256: result ? result.profileSha256 : null,
    indexSha256: result ? result.indexSha256 : null,
    games: result ? result.rows.map((row) => ({ key: row.key, file: row.file, chunkIdx: row.chunkIdx, split: row.split, usable: row.usable, reason: row.reason })) : [],
  };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const outStat = await stat(opts.out).catch(() => null);
  if (!outStat || !outStat.isDirectory()) throw new BuildError(3, '--out directory does not exist: ' + opts.out);
  let result = null;
  try {
    result = await build(opts);
    if (!opts.check) await writeOutputs(opts.out, result.profile, result.indexEntries);
  } catch (error) {
    if (opts.report) await writeFile(opts.report, JSON.stringify(buildReport(opts, result, error instanceof BuildError ? error.code : 1, error), null, 2) + '\n', 'utf8');
    throw error;
  }
  if (opts.report) await writeFile(opts.report, JSON.stringify(buildReport(opts, result, 0, null), null, 2) + '\n', 'utf8');
  console.log(JSON.stringify({
    exit: 0, mode: opts.check ? 'check' : 'write', id: result.profile.id, usable: result.usable.length,
    training: result.trainingCount, holdout: result.holdoutCount, ownEloMedian: result.ownMedian,
    identityWarnings: result.merged.warnings.length, profileSha256: result.profileSha256, indexSha256: result.indexSha256,
  }));
}

try {
  await main();
} catch (error) {
  const code = error instanceof BuildError ? error.code : 1;
  console.error('build-oren-bot: exit ' + code + ': ' + error.message);
  process.exitCode = code;
}
