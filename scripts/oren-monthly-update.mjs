#!/usr/bin/env node
// F30: manual monthly update of Oren's bot data from locally supplied orenzbit-YYYY-MM.pgn files.
// Local only: no network access, no scheduler, no deploy. Builder contract: docs/ORENBOT_MONTHLY.md.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const EXIT = Object.freeze({ OK: 0, UNEXPECTED: 1, INPUT: 10, CANDIDATE: 11, PROMOTE: 12 });
const BUILDER_EXIT_MAX = 5; // builder codes 1..5 are reported as 20 + code
const HOLDOUT_EVERY = 10; // chunk rule of the bot plan (13-oren-bot.md §5.3 step 4): chunkIdx % 10 === 0
const CANDIDATE_NAME = /^orenzbit.*\.pgn$/i;
const CANONICAL_NAME = /^orenzbit-(\d{4})-(\d{2})\.pgn$/;
const REQUIRED_TAGS = ['Event', 'Site', 'Date', 'White', 'Black', 'Result', 'Link'];
const REASONS = new Set(['usable', 'replay-failed', 'short', 'not-player', 'ambiguous-colour']);
const SCRIPT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

class PipelineError extends Error {
  constructor(exitCode, step, message) {
    super(message);
    this.exitCode = exitCode;
    this.step = step;
  }
}

function fail(exitCode, step, message) {
  throw new PipelineError(exitCode, step, message);
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function sha256File(path) {
  return sha256(readFileSync(path));
}

function isSha(value) {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
}

function jsonBytes(value) {
  return Buffer.from(JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function sortObject(object) {
  const sorted = {};
  for (const key of Object.keys(object).sort()) sorted[key] = object[key];
  return sorted;
}

function stableJson(value) {
  if (Array.isArray(value)) return '[' + value.map(stableJson).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map((key) => JSON.stringify(key) + ':' + stableJson(value[key])).join(',') + '}';
  }
  return JSON.stringify(value);
}

function parseArgs(argv) {
  const opts = { pgnDir: '.', root: SCRIPT_ROOT, builder: undefined, botCheck: undefined, dryRun: false, bootstrap: false };
  const keys = { 'pgn-dir': 'pgnDir', root: 'root', builder: 'builder', 'bot-check': 'botCheck' };
  for (const arg of argv) {
    if (arg === '--dry-run') opts.dryRun = true;
    else if (arg === '--bootstrap') opts.bootstrap = true;
    else {
      const match = /^--(pgn-dir|root|builder|bot-check)=(.+)$/.exec(arg);
      if (!match) fail(EXIT.INPUT, 'args', `unknown argument: ${arg}`);
      opts[keys[match[1]]] = match[2];
    }
  }
  return opts;
}

function layout(opts) {
  const root = resolve(opts.root);
  const bots = join(root, 'public', 'data', 'bots');
  const pipelineDir = join(root, 'data', 'oren-pipeline');
  return {
    root,
    pgnDir: resolve(opts.pgnDir),
    builder: resolve(opts.builder ?? join(root, 'scripts', 'build-oren-bot.mjs')),
    botCheck: resolve(opts.botCheck ?? join(root, 'scripts', 'check-oren-bot.mjs')),
    publicProfile: join(bots, 'orenzbit.json'),
    publicIndex: join(bots, 'index.json'),
    pipelineDir,
    ledgerPath: join(pipelineDir, 'split-ledger.json'),
    provenancePath: join(pipelineDir, 'provenance.json'),
    lastGoodPath: join(pipelineDir, 'last-good.json'),
    runsPath: join(pipelineDir, 'runs.json'),
    artifactsDir: join(root, 'artifacts', 'oren-monthly'),
  };
}

function readJsonFile(path, step) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    fail(EXIT.INPUT, step, `${path} is not valid JSON: ${err.message}`);
  }
}

function parseJsonOrCandidateFail(path, label) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    fail(EXIT.CANDIDATE, 'S4', `${label} is not valid JSON: ${err.message}`);
  }
}

function writeAtomic(path, bytes) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.f30-tmp`;
  writeFileSync(tmp, bytes);
  try {
    renameSync(tmp, path);
  } catch (err) {
    try {
      unlinkSync(tmp);
    } catch {
      // tmp file may already be gone; the rename error is the one to report
    }
    throw err;
  }
}

function readLedger(L) {
  const ledger = readJsonFile(L.ledgerPath, 'S0');
  if (!ledger) fail(EXIT.INPUT, 'S0', 'split-ledger.json is missing although provenance.json exists');
  if (ledger.schema !== 1 || !ledger.splits || typeof ledger.splits !== 'object' || Array.isArray(ledger.splits)) {
    fail(EXIT.INPUT, 'S0', 'split-ledger.json has an unsupported shape');
  }
  for (const value of Object.values(ledger.splits)) {
    if (value !== 'training' && value !== 'holdout') fail(EXIT.INPUT, 'S0', 'split-ledger.json has an invalid split value');
  }
  return ledger.splits;
}

function parseTags(game, where) {
  const tags = new Map();
  for (const line of game.split(/\r?\n/)) {
    const match = /^\[([A-Za-z0-9_]+)\s+"((?:[^"\\]|\\.)*)"\]\s*$/.exec(line);
    if (!match) continue;
    if (tags.has(match[1])) fail(EXIT.INPUT, 'S2', `${where}: duplicate [${match[1]}] tag`);
    tags.set(match[1], match[2]);
  }
  return tags;
}

function appendRun(L, record) {
  const runs = readJsonFile(L.runsPath, 'S6') ?? [];
  if (!Array.isArray(runs)) throw new Error('runs.json is not an array');
  writeAtomic(L.runsPath, jsonBytes([...runs, record]));
}

function restoreBackups(backups) {
  const problems = [];
  for (const backup of [...backups].reverse()) {
    try {
      if (backup.existed) writeAtomic(backup.path, readFileSync(backup.copy));
      else if (existsSync(backup.path)) unlinkSync(backup.path);
    } catch (err) {
      problems.push(`${backup.path}: ${err.message}`);
    }
  }
  return problems;
}

// S1: file discovery and immutability of already-ingested months.
function discoverSources(L, prev, ctx) {
  ctx.step = 'S1';
  if (!existsSync(L.pgnDir)) fail(EXIT.INPUT, 'S1', `pgn dir not found: ${L.pgnDir}`);
  const names = readdirSync(L.pgnDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && CANDIDATE_NAME.test(entry.name))
    .map((entry) => entry.name)
    .sort();
  const canonicalNames = names.filter((name) => CANONICAL_NAME.test(name));
  if (canonicalNames.length === 0) fail(EXIT.INPUT, 'S1', 'no canonical orenzbit-YYYY-MM.pgn files found');

  const sources = [];
  const bySha = new Map();
  for (const name of canonicalNames) {
    const match = CANONICAL_NAME.exec(name);
    if (Number(match[2]) < 1 || Number(match[2]) > 12) fail(EXIT.INPUT, 'S1', `invalid month in ${name}`);
    const bytes = readFileSync(join(L.pgnDir, name));
    const digest = sha256(bytes);
    if (!bySha.has(digest)) bySha.set(digest, name);
    sources.push({ name, month: `${match[1]}-${match[2]}`, bytes, sha256: digest, size: bytes.length, duplicateOf: null });
  }
  for (const name of names.filter((candidate) => !CANONICAL_NAME.test(candidate))) {
    const bytes = readFileSync(join(L.pgnDir, name));
    const digest = sha256(bytes);
    const original = bySha.get(digest);
    if (!original) fail(EXIT.INPUT, 'S1', `${name} is not canonical and not byte-identical to any canonical file`);
    sources.push({ name, month: null, bytes, sha256: digest, size: bytes.length, duplicateOf: original });
  }
  sources.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

  for (const previous of prev.byName.values()) {
    if (previous.duplicateOf) continue;
    const current = sources.find((source) => source.name === previous.name && !source.duplicateOf);
    if (!current) fail(EXIT.INPUT, 'S1', `previously ingested file is missing: ${previous.name}`);
    if (current.sha256 !== previous.sha256) fail(EXIT.INPUT, 'S1', `previously ingested file changed (months are immutable): ${previous.name}`);
  }
  return sources;
}

// S2: independent PGN header validation (no replay).
function validateHeaders(canonical, ctx) {
  ctx.step = 'S2';
  const linkOrigin = new Map();
  for (const source of canonical) {
    const games = [];
    for (const part of source.bytes.toString('utf8').split(/(?=^\[Event\s+")/m)) {
      if (/^\[Event\s+"/.test(part)) games.push(part);
      else if (part.trim() !== '') fail(EXIT.INPUT, 'S2', `${source.name}: text outside any game (malformed PGN)`);
    }
    if (games.length === 0) fail(EXIT.INPUT, 'S2', `${source.name}: no games`);
    source.games = [];
    source.warnings = [];
    games.forEach((game, chunkIdx) => {
      const where = `${source.name} game #${chunkIdx}`;
      const tags = parseTags(game, where);
      for (const tag of REQUIRED_TAGS) {
        if (!tags.has(tag)) fail(EXIT.INPUT, 'S2', `${where}: missing [${tag}]`);
      }
      const link = tags.get('Link').trim();
      if (!link) fail(EXIT.INPUT, 'S2', `${where}: empty [Link]`);
      if (linkOrigin.has(link)) fail(EXIT.INPUT, 'S2', `${where}: duplicate Link ${link} (first seen at ${linkOrigin.get(link)})`);
      linkOrigin.set(link, where);
      const date = tags.get('Date');
      const dateMatch = /^(\d{4})\.(\d{2})\.\d{2}$/.exec(date);
      if (!dateMatch || `${dateMatch[1]}-${dateMatch[2]}` !== source.month) source.warnings.push({ link, date });
      source.games.push({ chunkIdx, key: link });
    });
  }
}

// S3: run the builder into a staging directory.
function runBuilder(L, { version, prevExists, staging }, ctx) {
  ctx.step = 'S3';
  if (!existsSync(L.builder)) fail(EXIT.UNEXPECTED, 'S3', `builder not found: ${L.builder}`);
  mkdirSync(staging, { recursive: true });
  const args = [
    L.builder,
    `--pgn-dir=${L.pgnDir}`,
    `--base-index=${L.publicIndex}`,
    `--out=${staging}`,
    `--report=${join(staging, 'report.json')}`,
    `--data-version=${version}`,
  ];
  if (prevExists) args.push(`--split-ledger=${L.ledgerPath}`);
  const built = spawnSync(process.execPath, args, { cwd: L.root, encoding: 'utf8', windowsHide: true, maxBuffer: 512 * 1024 * 1024 });
  if (built.stdout) process.stdout.write(built.stdout);
  if (built.stderr) process.stderr.write(built.stderr);
  if (built.error) fail(EXIT.UNEXPECTED, 'S3', `builder could not start: ${built.error.message}`);
  if (built.status !== 0) {
    if (Number.isInteger(built.status) && built.status >= 1 && built.status <= BUILDER_EXIT_MAX) {
      fail(20 + built.status, 'S3', `builder exited ${built.status}`);
    }
    fail(EXIT.UNEXPECTED, 'S3', `builder exited unexpectedly (status ${built.status}, signal ${built.signal})`);
  }
}

// S4: candidate validation. Nothing public is touched here.
function validateCandidate(L, { prev, baseIndex, sources, canonical, ledgerSplits, version, staging }, ctx) {
  ctx.step = 'S4';
  const reportPath = join(staging, 'report.json');
  const profilePath = join(staging, 'orenzbit.json');
  const indexPath = join(staging, 'index.json');
  for (const path of [reportPath, profilePath, indexPath]) {
    if (!existsSync(path)) fail(EXIT.CANDIDATE, 'S4', `builder did not write ${basename(path)}`);
  }
  const report = parseJsonOrCandidateFail(reportPath, 'report.json');
  if (!Array.isArray(report.files) || !Array.isArray(report.games)) fail(EXIT.CANDIDATE, 'S4', 'report.json lacks files[] or games[]');
  if (!isSha(report.sourceSetSha256) || !isSha(report.profileSha256) || !isSha(report.indexSha256)) {
    fail(EXIT.CANDIDATE, 'S4', 'report.json lacks valid sourceSetSha256 / profileSha256 / indexSha256');
  }
  if (report.builderVersion == null || report.builderVersion === '') fail(EXIT.CANDIDATE, 'S4', 'report.json lacks builderVersion');
  ctx.sourceSetSha256 = report.sourceSetSha256;

  // Files: same set, same bytes, same chunk counts, duplicates identified the same way.
  const reportFiles = new Map();
  for (const entry of report.files) {
    if (!entry || typeof entry.name !== 'string' || reportFiles.has(entry.name)) fail(EXIT.CANDIDATE, 'S4', 'report.json files[] is malformed or repeats a name');
    reportFiles.set(entry.name, entry);
  }
  if (reportFiles.size !== sources.length || sources.some((source) => !reportFiles.has(source.name))) {
    fail(EXIT.CANDIDATE, 'S4', 'builder file list differs from the source set');
  }
  for (const source of sources) {
    const entry = reportFiles.get(source.name);
    if (entry.sha256 !== source.sha256 || entry.bytes !== source.size) fail(EXIT.CANDIDATE, 'S4', `builder hashed different bytes for ${source.name}`);
    if ((entry.duplicateOf ?? null) !== source.duplicateOf) fail(EXIT.CANDIDATE, 'S4', `duplicate status differs for ${source.name}`);
    if (!source.duplicateOf && (entry.chunks ?? entry.games) !== source.games.length) fail(EXIT.CANDIDATE, 'S4', `chunk count differs for ${source.name}`);
  }

  // Games: every chunk exactly once, split pinned by ledger or by the chunk rule, no holdout in training.
  const expected = new Map();
  for (const source of canonical) {
    for (const game of source.games) expected.set(game.key, { file: source.name, chunkIdx: game.chunkIdx });
  }
  if (report.games.length !== expected.size) fail(EXIT.CANDIDATE, 'S4', `builder reported ${report.games.length} games, source has ${expected.size}`);
  const seen = new Set();
  const trainingKeys = new Set();
  const holdoutKeys = new Set();
  const usableHoldout = new Set();
  let usableGames = 0;
  for (const game of report.games) {
    const want = expected.get(game.key);
    if (!want) fail(EXIT.CANDIDATE, 'S4', `unknown game key in report: ${game.key}`);
    if (seen.has(game.key)) fail(EXIT.CANDIDATE, 'S4', `game repeated in report: ${game.key}`);
    seen.add(game.key);
    if (game.file !== want.file || game.chunkIdx !== want.chunkIdx) fail(EXIT.CANDIDATE, 'S4', `location mismatch for ${game.key}`);
    if (!REASONS.has(game.reason) || typeof game.usable !== 'boolean' || game.usable !== (game.reason === 'usable')) {
      fail(EXIT.CANDIDATE, 'S4', `usable/reason inconsistent for ${game.key}`);
    }
    if (game.split !== 'training' && game.split !== 'holdout') fail(EXIT.CANDIDATE, 'S4', `invalid split for ${game.key}`);
    const pinned = Object.hasOwn(ledgerSplits, game.key) ? ledgerSplits[game.key] : undefined;
    const ruleSplit = want.chunkIdx % HOLDOUT_EVERY === 0 ? 'holdout' : 'training';
    const expectedSplit = pinned ?? ruleSplit;
    if (game.split !== expectedSplit) {
      fail(EXIT.CANDIDATE, 'S4', `split of ${game.key} is ${game.split}, expected ${expectedSplit} (${pinned ? 'ledger' : 'chunk rule'})`);
    }
    if (game.usable) usableGames += 1;
    if (game.split === 'holdout') {
      holdoutKeys.add(game.key);
      if (game.usable) usableHoldout.add(game.key);
    } else {
      trainingKeys.add(game.key);
    }
  }
  for (const key of Object.keys(ledgerSplits)) {
    if (!seen.has(key)) fail(EXIT.CANDIDATE, 'S4', `ledger game missing from builder report: ${key}`);
  }
  for (const key of trainingKeys) {
    if (holdoutKeys.has(key)) fail(EXIT.CANDIDATE, 'S4', `holdout leak: ${key} is in both splits`);
  }
  if (prev && sha256File(L.ledgerPath) !== prev.ledgerSha256) {
    fail(EXIT.CANDIDATE, 'S4', 'split-ledger.json changed outside a promotion (holdout integrity)');
  }
  for (const source of canonical) {
    const previous = prev?.byName.get(source.name);
    if (!previous || previous.duplicateOf) continue;
    const entry = reportFiles.get(source.name);
    for (const field of ['usable', 'holdout', 'training']) {
      if (entry[field] !== previous[field]) {
        fail(EXIT.CANDIDATE, 'S4', `${source.name}: ${field} changed from ${previous[field]} to ${entry[field]} for an already-ingested file`);
      }
    }
  }

  // Profile and index: hashes, dataVersion, holdout keys, one bot entry changed.
  const profileBytes = readFileSync(profilePath);
  const indexBytes = readFileSync(indexPath);
  if (report.profileSha256 !== sha256(profileBytes)) fail(EXIT.CANDIDATE, 'S4', 'report profileSha256 does not match orenzbit.json');
  if (report.indexSha256 !== sha256(indexBytes)) fail(EXIT.CANDIDATE, 'S4', 'report indexSha256 does not match index.json');
  const profile = parseJsonOrCandidateFail(profilePath, 'orenzbit.json');
  if (!profile || typeof profile.id !== 'string' || profile.id === '') fail(EXIT.CANDIDATE, 'S4', 'profile has no id');
  if (profile.dataVersion !== version) fail(EXIT.CANDIDATE, 'S4', `profile dataVersion ${profile.dataVersion} != ${version}`);
  if (!Array.isArray(profile.holdoutGameKeys)) fail(EXIT.CANDIDATE, 'S4', 'profile lacks holdoutGameKeys[]');
  const profileHoldout = new Set(profile.holdoutGameKeys);
  if (profileHoldout.size !== profile.holdoutGameKeys.length) fail(EXIT.CANDIDATE, 'S4', 'profile holdoutGameKeys repeats a key');
  if (profileHoldout.size !== usableHoldout.size || [...usableHoldout].some((key) => !profileHoldout.has(key))) {
    fail(EXIT.CANDIDATE, 'S4', 'profile holdoutGameKeys differ from the builder holdout set');
  }
  for (const key of profileHoldout) {
    if (trainingKeys.has(key)) fail(EXIT.CANDIDATE, 'S4', `holdout leak: ${key} is a holdout key but is reported as training`);
  }
  const stagedIndex = parseJsonOrCandidateFail(indexPath, 'index.json');
  if (!Array.isArray(stagedIndex)) fail(EXIT.CANDIDATE, 'S4', 'index.json is not an array');
  if (stagedIndex.filter((entry) => entry && entry.id === profile.id).length !== 1) {
    fail(EXIT.CANDIDATE, 'S4', `index.json must contain exactly one entry for ${profile.id}`);
  }
  const otherEntries = (list) => list.filter((entry) => !(entry && entry.id === profile.id)).map(stableJson).sort();
  const before = otherEntries(baseIndex);
  const after = otherEntries(stagedIndex);
  if (before.length !== after.length || before.some((entry, i) => entry !== after[i])) {
    fail(EXIT.CANDIDATE, 'S4', 'index.json changed entries other than the bot entry');
  }

  // Bot-level checker (scripts/check-oren-bot.mjs) on the staged files. Missing checker = fail closed.
  if (!existsSync(L.botCheck)) fail(EXIT.CANDIDATE, 'S4', `bot checker not found (fail closed): ${L.botCheck}`);
  const checked = spawnSync(process.execPath, [L.botCheck, `--pgn-dir=${L.pgnDir}`, `--profile=${profilePath}`, `--index=${indexPath}`], {
    cwd: L.root,
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 512 * 1024 * 1024,
  });
  if (checked.stdout) process.stdout.write(checked.stdout);
  if (checked.stderr) process.stderr.write(checked.stderr);
  if (checked.error || checked.status !== 0) fail(EXIT.CANDIDATE, 'S4', `bot checker failed (status ${checked.status})`);

  return {
    report,
    reportFiles,
    profileBytes,
    indexBytes,
    trainingKeys,
    holdoutKeys,
    usableHoldout,
    totals: {
      canonicalFiles: canonical.length,
      duplicateFiles: sources.length - canonical.length,
      games: report.games.length,
      usableGames,
      training: trainingKeys.size,
      holdout: holdoutKeys.size,
      usableHoldout: usableHoldout.size,
      dateMonthWarnings: canonical.reduce((count, source) => count + source.warnings.length, 0),
    },
    hashes: {
      sourceSetSha256: report.sourceSetSha256,
      profileSha256: sha256(profileBytes),
      indexSha256: sha256(indexBytes),
      reportSha256: sha256(readFileSync(reportPath)),
    },
  };
}

// S5: atomic promotion. Any failure restores the backup and reports exit 12.
function promote(L, { prev, version, sources, canonical, candidate, ledgerSplits, runId, month }, ctx) {
  ctx.step = 'S5';
  const { report, reportFiles, profileBytes, indexBytes, hashes } = candidate;
  const splits = { ...ledgerSplits };
  for (const game of report.games) splits[game.key] = game.split;
  const ledgerBytes = jsonBytes({ schema: 1, splits: sortObject(splits) });
  const promotedAt = new Date().toISOString();
  const files = sources.map((source) => {
    if (source.duplicateOf) {
      return {
        name: source.name, month: null, sha256: source.sha256, bytes: source.size,
        chunks: 0, usable: 0, holdout: 0, training: 0,
        duplicateOf: source.duplicateOf, ingestedInVersion: null, dateMonthWarnings: [],
      };
    }
    const entry = reportFiles.get(source.name);
    const previous = prev?.byName.get(source.name);
    return {
      name: source.name, month: source.month, sha256: source.sha256, bytes: source.size,
      chunks: entry.games, usable: entry.usable, holdout: entry.holdout, training: entry.training,
      duplicateOf: null, ingestedInVersion: previous ? previous.ingestedInVersion : version,
      dateMonthWarnings: source.warnings,
    };
  });
  const provenance = {
    version,
    builderVersion: report.builderVersion,
    files,
    sourceSetSha256: hashes.sourceSetSha256,
    profileSha256: hashes.profileSha256,
    indexSha256: hashes.indexSha256,
    ledgerSha256: sha256(ledgerBytes),
  };
  const lastGood = { version, profileSha256: hashes.profileSha256, indexSha256: hashes.indexSha256, promotedAt };
  const runs = readJsonFile(L.runsPath, 'S5') ?? [];
  if (!Array.isArray(runs)) fail(EXIT.INPUT, 'S5', 'runs.json is not an array');
  const runRecord = {
    version, month, status: prev ? 'promoted' : 'bootstrap', failedStep: null, exitCode: EXIT.OK,
    sourceSetSha256: hashes.sourceSetSha256, profileSha256: hashes.profileSha256,
  };
  const targets = [
    { path: L.publicProfile, bytes: profileBytes },
    { path: L.publicIndex, bytes: indexBytes },
    { path: L.ledgerPath, bytes: ledgerBytes },
    { path: L.provenancePath, bytes: jsonBytes(provenance) },
    { path: L.lastGoodPath, bytes: jsonBytes(lastGood) },
    { path: L.runsPath, bytes: jsonBytes([...runs, runRecord]) },
  ];

  mkdirSync(L.pipelineDir, { recursive: true });
  const backupDir = join(L.artifactsDir, `backup-${runId}`);
  mkdirSync(backupDir, { recursive: true });
  const backups = targets.map((target, index) => {
    const existed = existsSync(target.path);
    const copy = join(backupDir, `${index}-${basename(target.path)}`);
    if (existed) copyFileSync(target.path, copy);
    return { path: target.path, existed, copy };
  });
  try {
    for (const target of targets) writeAtomic(target.path, target.bytes);
    for (const target of targets) {
      if (sha256File(target.path) !== sha256(target.bytes)) throw new Error(`post-write check failed for ${target.path}`);
    }
  } catch (err) {
    const problems = restoreBackups(backups);
    const outcome = problems.length ? `RESTORE INCOMPLETE: ${problems.join('; ')}` : 'last-good data restored';
    fail(EXIT.PROMOTE, 'S5', `promotion failed: ${err.message}. ${outcome}. Backup: ${backupDir}`);
  }
}

function sameSources(provenance, sources) {
  const recorded = provenance.files.map((file) => `${file.name}\t${file.sha256}`).sort().join('\n');
  const current = sources.map((source) => `${source.name}\t${source.sha256}`).sort().join('\n');
  return recorded === current;
}

function execute(L, opts, ctx) {
  // S0: state checks.
  ctx.step = 'S0';
  if (!existsSync(L.publicIndex)) fail(EXIT.INPUT, 'S0', `base index not found: ${L.publicIndex}`);
  const baseIndex = readJsonFile(L.publicIndex, 'S0');
  if (!Array.isArray(baseIndex)) fail(EXIT.INPUT, 'S0', 'base index is not an array');
  const provenance = readJsonFile(L.provenancePath, 'S0');
  if (opts.bootstrap && provenance) fail(EXIT.INPUT, 'S0', '--bootstrap refused: provenance.json already exists');
  if (!opts.bootstrap && !provenance) fail(EXIT.INPUT, 'S0', 'provenance.json is missing: run once with --bootstrap');
  if (provenance && (!Number.isInteger(provenance.version) || provenance.version < 1 || !Array.isArray(provenance.files))) {
    fail(EXIT.INPUT, 'S0', 'provenance.json has an unsupported shape');
  }
  const ledgerSplits = provenance ? readLedger(L) : {};
  const prevVersion = provenance ? provenance.version : 0;
  ctx.version = prevVersion;
  ctx.recordable = true;
  const prev = provenance
    ? { version: prevVersion, ledgerSha256: provenance.ledgerSha256, sourceSetSha256: provenance.sourceSetSha256, profileSha256: provenance.profileSha256, indexSha256: provenance.indexSha256, byName: new Map(provenance.files.map((file) => [file.name, file])) }
    : null;

  // S1 and S2
  const sources = discoverSources(L, prev ?? { byName: new Map() }, ctx);
  const canonical = sources.filter((source) => !source.duplicateOf);
  ctx.month = canonical[canonical.length - 1].month;
  validateHeaders(canonical, ctx);

  // S3 and S4. The version rises by one only when the source set changed. The same sources with a
  // different builder output need one more build at prev+1, because the promoted profile carries dataVersion.
  const sourcesChanged = !prev || !sameSources(provenance, sources);
  const attempt = (candidateVersion) => {
    const runId = `v${candidateVersion}-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    const staging = join(L.artifactsDir, `staging-${runId}`);
    runBuilder(L, { version: candidateVersion, prevExists: Boolean(provenance), staging }, ctx);
    const result = validateCandidate(L, { prev, baseIndex, sources, canonical, ledgerSplits, version: candidateVersion, staging }, ctx);
    return { version: candidateVersion, runId, staging, candidate: result };
  };
  const outputDiffers = (result) => prev !== null
    && (result.hashes.profileSha256 !== prev.profileSha256 || result.hashes.indexSha256 !== prev.indexSha256);
  let attempted = attempt(prev ? prevVersion + (sourcesChanged ? 1 : 0) : 1);
  if (prev && !sourcesChanged && outputDiffers(attempted.candidate)) {
    rmSync(attempted.staging, { recursive: true, force: true });
    attempted = attempt(prevVersion + 1);
  }
  const { version, runId, staging, candidate } = attempted;

  const summary = {
    status: null,
    version,
    previousVersion: prevVersion,
    month: ctx.month,
    builderVersion: candidate.report.builderVersion,
    ...candidate.totals,
    ...candidate.hashes,
    staging,
  };
  const changed = sourcesChanged || outputDiffers(candidate);

  if (opts.dryRun) {
    summary.status = 'dry-run';
    summary.changed = changed;
    return summary;
  }

  if (!changed) {
    ctx.step = 'S6';
    summary.status = 'unchanged';
    summary.version = prevVersion;
    appendRun(L, {
      version: prevVersion, month: ctx.month, status: 'unchanged', failedStep: null, exitCode: EXIT.OK,
      sourceSetSha256: candidate.hashes.sourceSetSha256, profileSha256: candidate.hashes.profileSha256,
    });
  } else {
    promote(L, { prev, version, sources, canonical, candidate, ledgerSplits, runId, month: ctx.month }, ctx);
    summary.status = prev ? 'promoted' : 'bootstrap';
  }
  // S7: staging is removed only after success.
  rmSync(staging, { recursive: true, force: true });
  return summary;
}

function main() {
  const ctx = { step: 'S0', recordable: false, version: 0, month: null, sourceSetSha256: null };
  let opts = null;
  let L = null;
  try {
    opts = parseArgs(process.argv.slice(2));
    L = layout(opts);
    const summary = execute(L, opts, ctx);
    console.log('SUMMARY ' + JSON.stringify(summary));
    process.exitCode = EXIT.OK;
  } catch (err) {
    const isPipeline = err instanceof PipelineError;
    const code = isPipeline ? err.exitCode : EXIT.UNEXPECTED;
    const step = isPipeline ? err.step : ctx.step;
    console.error(`FAIL ${step} (exit ${code}): ${err.message}`);
    if (!isPipeline) console.error(err.stack);
    if (opts && L && !opts.dryRun && ctx.recordable) {
      try {
        appendRun(L, {
          version: ctx.version, month: ctx.month, status: 'failed', failedStep: step, exitCode: code,
          sourceSetSha256: ctx.sourceSetSha256, profileSha256: null,
        });
      } catch (recordErr) {
        console.error(`could not append the failure record to runs.json: ${recordErr.message}`);
      }
    }
    process.exitCode = code;
  }
}

main();
