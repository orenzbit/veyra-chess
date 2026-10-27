#!/usr/bin/env node
// F30 checks for scripts/oren-monthly-update.mjs. Every pipeline run uses a sandbox under artifacts/oren-monthly,
// with a stub builder and stub bot checker written to artifacts/f30-test (test doubles, not shipped logic).
// The real builder (scripts/build-oren-bot.mjs) is not required; its contract is in docs/ORENBOT_MONTHLY.md.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PIPELINE = join(ROOT, 'scripts', 'oren-monthly-update.mjs');
const TEST_ROOT = join(ROOT, 'artifacts', 'oren-monthly');
const STUB_DIR = join(ROOT, 'artifacts', 'f30-test');
const STUB_BUILDER_PATH = join(STUB_DIR, 'stub-builder.mjs');
const STUB_CHECK_PATH = join(STUB_DIR, 'stub-check.mjs');
const STATE_FILES = [
  'public/data/bots/orenzbit.json',
  'public/data/bots/index.json',
  'data/oren-pipeline/split-ledger.json',
  'data/oren-pipeline/provenance.json',
  'data/oren-pipeline/last-good.json',
];

const STUB_BUILDER_SRC = String.raw`// F30 test double for scripts/build-oren-bot.mjs (contract only; not shipped).
// Modes via F30_STUB_MODE: ok | exit2 | leaky | profile-leak | drop-game.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const argv = {};
for (const arg of process.argv.slice(2)) {
  const m = /^--([^=]+)=(.*)$/.exec(arg);
  if (m) argv[m[1]] = m[2];
}
const mode = process.env.F30_STUB_MODE || 'ok';
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const byName = (a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
const out = argv.out;
const dataVersion = Number(argv['data-version']);
mkdirSync(out, { recursive: true });
if (mode === 'exit2') {
  console.error('stub builder: validation failed (forced)');
  process.exit(2);
}
const ledger = argv['split-ledger'] && existsSync(argv['split-ledger']) ? JSON.parse(readFileSync(argv['split-ledger'], 'utf8')).splits : {};
const pgnDir = argv['pgn-dir'];
const canonRe = /^orenzbit-\d{4}-\d{2}\.pgn$/;
const names = readdirSync(pgnDir).filter((n) => /^orenzbit.*\.pgn$/i.test(n)).sort();
const files = [];
const bySha = new Map();
for (const name of names.filter((n) => canonRe.test(n))) {
  const bytes = readFileSync(join(pgnDir, name));
  const digest = sha(bytes);
  if (!bySha.has(digest)) bySha.set(digest, name);
  files.push({ name, bytes, digest, duplicateOf: null });
}
for (const name of names.filter((n) => !canonRe.test(n))) {
  const bytes = readFileSync(join(pgnDir, name));
  const digest = sha(bytes);
  if (!bySha.has(digest)) {
    console.error('stub builder: non-canonical file is not a byte-identical duplicate: ' + name);
    process.exit(3);
  }
  files.push({ name, bytes, digest, duplicateOf: bySha.get(digest) });
}
const rows = [];
const stats = new Map();
for (const f of files.filter((x) => !x.duplicateOf)) {
  const games = f.bytes.toString('utf8').split(/(?=^\[Event\s+")/m).filter((p) => /^\[Event\s+"/.test(p));
  stats.set(f.name, { chunks: games.length, usable: 0, holdout: 0, training: 0 });
  games.forEach((game, chunkIdx) => {
    const key = /^\[Link\s+"([^"]*)"\]/m.exec(game)[1];
    const rule = chunkIdx % 10 === 0 ? 'holdout' : 'training';
    const pinned = Object.prototype.hasOwnProperty.call(ledger, key) ? ledger[key] : undefined;
    if (mode !== 'leaky' && pinned !== undefined && pinned !== rule) {
      console.error('stub builder: ledger split conflicts with the chunk rule for ' + key);
      process.exit(4);
    }
    const split = mode === 'leaky' ? 'training' : pinned || rule;
    rows.push({ file: f.name, chunkIdx, key, usable: true, reason: 'usable', split });
  });
}
if (mode === 'drop-game') rows.pop();
for (const row of rows) {
  const st = stats.get(row.file);
  st.usable += 1;
  st[row.split] += 1;
}
if (mode === 'file-drift') stats.get(files.find((f) => !f.duplicateOf).name).usable -= 1;
const trainingInput = rows.filter((r) => r.split === 'training' && r.usable).map((r) => r.key).sort();
const holdoutKeys = rows.filter((r) => r.split === 'holdout' && r.usable).map((r) => r.key).sort();
let profileHoldout = mode === 'leaky' ? [] : holdoutKeys;
if (mode === 'profile-leak') profileHoldout = holdoutKeys.concat([trainingInput[0]]).sort();
const profile = {
  id: 'orenzbit',
  displayName: 'F30 stub',
  dataVersion,
  sourceFiles: files.filter((f) => !f.duplicateOf).map((f) => f.name),
  trainingGameCount: trainingInput.length,
  holdoutGameCount: holdoutKeys.length,
  holdoutGameKeys: profileHoldout,
  builderRevision: mode === 'builder-v2' ? 2 : 1,
};
const profileBytes = Buffer.from(JSON.stringify(profile, null, 2) + '\n');
const base = JSON.parse(readFileSync(argv['base-index'], 'utf8'));
const indexList = base.filter((e) => e.id !== profile.id);
indexList.push({ id: profile.id, displayName: profile.displayName, elo: 1000, profile: 'orenzbit.json' });
const indexBytes = Buffer.from(JSON.stringify(indexList, null, 2).replace(/\n/g, '\r\n') + '\r\n');
writeFileSync(join(out, profile.id + '.json'), profileBytes);
writeFileSync(join(out, 'index.json'), indexBytes);
writeFileSync(join(out, 'stub-training-input.json'), JSON.stringify(trainingInput, null, 2) + '\n');
const sortedFiles = files.slice().sort(byName);
const report = {
  builderVersion: 1,
  exit: 0,
  files: files.map((f) => {
    const st = f.duplicateOf ? { chunks: 0, usable: 0, holdout: 0, training: 0 } : stats.get(f.name);
    return {
      name: f.name, sha256: f.digest, bytes: f.bytes.length, duplicateOf: f.duplicateOf,
      games: st.chunks, notPlayer: 0, replayFailed: [], shortGames: 0, usable: st.usable, holdout: st.holdout, training: st.training,
    };
  }),
  totals: { files: files.length, games: rows.length },
  sourceSetSha256: sha(Buffer.from(sortedFiles.map((f) => f.name + ' ' + f.digest).join('\n'))),
  profileSha256: sha(profileBytes),
  indexSha256: sha(indexBytes),
  games: rows.map((r) => ({ key: r.key, file: r.file, chunkIdx: r.chunkIdx, split: r.split, usable: r.usable, reason: r.reason })),
};
writeFileSync(argv.report || join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
process.exit(0);
`;

const STUB_CHECK_SRC = String.raw`// F30 test double for scripts/check-oren-bot.mjs (not shipped).
import { readFileSync } from 'node:fs';
const argv = {};
for (const arg of process.argv.slice(2)) {
  const m = /^--([^=]+)=(.*)$/.exec(arg);
  if (m) argv[m[1]] = m[2];
}
if (process.env.F30_STUB_CHECK_FAIL === '1') {
  console.error('stub bot check: forced failure');
  process.exit(1);
}
const profile = JSON.parse(readFileSync(argv.profile, 'utf8'));
const index = JSON.parse(readFileSync(argv.index, 'utf8'));
if (!Array.isArray(index) || typeof profile.id !== 'string') process.exit(3);
console.log('stub bot check PASS: ' + profile.id);
process.exit(0);
`;

const results = [];
function record(name, ok, detail) {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}${detail ? ' - ' + detail : ''}`);
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

function scenario(name, fn) {
  try {
    const detail = fn();
    record(name, true, detail || '');
  } catch (err) {
    record(name, false, err.message);
  }
}

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const shaOf = (path) => sha(readFileSync(path));
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

function sandbox(name) {
  const dir = join(TEST_ROOT, name);
  expect(dir.startsWith(TEST_ROOT), 'sandbox outside artifacts/oren-monthly');
  rmSync(dir, { recursive: true, force: true });
  const sb = {
    dir,
    pgn: join(dir, 'pgn'),
    root: join(dir, 'root'),
  };
  sb.pub = join(sb.root, 'public', 'data', 'bots');
  sb.pipe = join(sb.root, 'data', 'oren-pipeline');
  mkdirSync(sb.pgn, { recursive: true });
  mkdirSync(sb.pub, { recursive: true });
  copyFileSync(join(ROOT, 'public', 'data', 'bots', 'index.json'), join(sb.pub, 'index.json'));
  return sb;
}

function addReal(sb, month, asName) {
  const source = `orenzbit-${month}.pgn`;
  copyFileSync(join(ROOT, source), join(sb.pgn, asName ?? source));
}

function run(sb, extra = [], env = {}) {
  const args = [PIPELINE, `--root=${sb.root}`, `--pgn-dir=${sb.pgn}`, `--builder=${STUB_BUILDER_PATH}`, `--bot-check=${STUB_CHECK_PATH}`, ...extra];
  const r = spawnSync(process.execPath, args, { encoding: 'utf8', windowsHide: true, env: { ...process.env, ...env } });
  const line = (r.stdout ?? '').split(/\r?\n/).find((l) => l.startsWith('SUMMARY '));
  return {
    status: r.status,
    stdout: r.stdout ?? '',
    stderr: r.stderr ?? '',
    summary: line ? JSON.parse(line.slice('SUMMARY '.length)) : null,
    command: `node scripts/oren-monthly-update.mjs ${args.slice(1).map((a) => (a.startsWith(ROOT) ? relative(ROOT, a) : a)).join(' ')}`,
  };
}

function state(sb) {
  const out = {};
  for (const rel of STATE_FILES) {
    const path = join(sb.root, rel);
    out[rel] = existsSync(path) ? shaOf(path) : 'absent';
  }
  return out;
}

function sameState(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

const readProv = (sb) => readJson(join(sb.pipe, 'provenance.json'));
const readLedger = (sb) => readJson(join(sb.pipe, 'split-ledger.json'));
const readRuns = (sb) => readJson(join(sb.pipe, 'runs.json'));
const readProfile = (sb) => readJson(join(sb.pub, 'orenzbit.json'));

function bootstrapped(name) {
  const sb = sandbox(name);
  addReal(sb, '2025-09');
  addReal(sb, '2025-11');
  copyFileSync(join(sb.pgn, 'orenzbit-2025-09.pgn'), join(sb.pgn, 'orenzbit-2025-09 (1).pgn'));
  const r = run(sb, ['--bootstrap']);
  expect(r.status === 0, `bootstrap exit ${r.status}: ${r.stderr.trim()}`);
  return sb;
}

function stagingLeftovers(sb) {
  const dir = join(sb.root, 'artifacts', 'oren-monthly');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((n) => n.startsWith('staging-'));
}

// Scenario bodies. Each throws on failure; the return value is shown as detail.
function sBootstrap() {
  const sb = bootstrapped('bootstrap-dup');
  const prov = readProv(sb);
  expect(prov.version === 1, `version ${prov.version}`);
  const dup = prov.files.find((f) => f.name === 'orenzbit-2025-09 (1).pgn');
  expect(dup && dup.duplicateOf === 'orenzbit-2025-09.pgn' && dup.usable === 0 && dup.ingestedInVersion === null, 'duplicate not recorded as a non-counted copy');
  const ledger = readLedger(sb);
  expect(Object.keys(ledger.splits).length === 33, `ledger has ${Object.keys(ledger.splits).length} keys, expected 33 (4 + 29)`);
  const profile = readProfile(sb);
  expect(profile.dataVersion === 1, 'profile dataVersion');
  expect(prov.profileSha256 === shaOf(join(sb.pub, 'orenzbit.json')), 'provenance profile hash');
  expect(prov.indexSha256 === shaOf(join(sb.pub, 'index.json')), 'provenance index hash');
  expect(prov.ledgerSha256 === shaOf(join(sb.pipe, 'split-ledger.json')), 'provenance ledger hash');
  expect(readJson(join(sb.pipe, 'last-good.json')).version === 1, 'last-good version');
  const runs = readRuns(sb);
  expect(runs.length === 1 && runs[0].status === 'bootstrap' && runs[0].version === 1, 'runs.json record');
  const usable = prov.files.reduce((n, f) => n + f.usable, 0);
  expect(usable === 33, `usable total ${usable}`);
  expect(stagingLeftovers(sb).length === 0, 'staging not removed after success');
  return `exit 0; 2 months + 1 duplicate counted once; 33 games; version 1`;
}

function sRepro() {
  const sb = bootstrapped('repro');
  const before = state(sb);
  const d1 = run(sb, ['--dry-run']);
  const d2 = run(sb, ['--dry-run']);
  expect(d1.status === 0 && d2.status === 0, `dry-run exits ${d1.status}/${d2.status}`);
  expect(sameState(before, state(sb)), 'dry-run changed public or pipeline files');
  for (const key of ['reportSha256', 'profileSha256', 'indexSha256']) {
    expect(d1.summary[key] === d2.summary[key], `${key} differs between identical runs`);
  }
  const provBefore = readProv(sb);
  expect(d1.summary.profileSha256 === provBefore.profileSha256, 'dry-run profile hash differs from the bootstrapped profile');
  const r = run(sb, []);
  expect(r.status === 0 && r.summary.status === 'unchanged' && r.summary.version === 1, `re-run exit ${r.status} status ${r.summary?.status}`);
  expect(sameState(before, state(sb)), 'unchanged re-run changed public or state files');
  expect(readRuns(sb).length === 2 && readRuns(sb)[1].status === 'unchanged', 'runs.json unchanged record');
  return 'dry-run x2 identical hashes; unchanged re-run keeps version 1 and state';
}

function sAddMonth() {
  const sb = bootstrapped('add-month');
  const oldLedger = readLedger(sb);
  const oldHoldout = readProfile(sb).holdoutGameKeys;
  addReal(sb, '2025-12');
  const r = run(sb, []);
  expect(r.status === 0 && r.summary.status === 'promoted' && r.summary.version === 2, `exit ${r.status} status ${r.summary?.status}`);
  const ledger = readLedger(sb);
  for (const [key, split] of Object.entries(oldLedger.splits)) {
    expect(ledger.splits[key] === split, `split changed for an old game: ${key}`);
  }
  expect(Object.keys(ledger.splits).length === 38, `ledger size ${Object.keys(ledger.splits).length}, expected 38`);
  const prov = readProv(sb);
  expect(prov.files.find((f) => f.name === 'orenzbit-2025-09.pgn').ingestedInVersion === 1, 'old month ingestedInVersion');
  const added = prov.files.find((f) => f.name === 'orenzbit-2025-12.pgn');
  expect(added.ingestedInVersion === 2 && added.month === '2025-12', 'new month provenance');
  const profile = readProfile(sb);
  expect(profile.dataVersion === 2, 'profile dataVersion 2');
  expect(oldHoldout.every((key) => profile.holdoutGameKeys.includes(key)), 'an old holdout game left the holdout set');
  expect(readJson(join(sb.pipe, 'last-good.json')).version === 2, 'last-good version 2');
  const runs = readRuns(sb);
  expect(runs.length === 2 && runs[1].status === 'promoted' && runs[1].version === 2 && runs[1].month === '2025-12', 'runs.json record for the month');
  return 'version 1 -> 2; 33 old splits unchanged; 5 new games; old holdout kept';
}

function sMalformedLink() {
  const sb = bootstrapped('malformed-link');
  const before = state(sb);
  const runsBefore = readRuns(sb).length;
  addReal(sb, '2025-12');
  const text = readFileSync(join(ROOT, 'orenzbit-2025-12.pgn'), 'utf8').replace(/^\[Link [^\r\n]*\r?\n/m, '');
  writeFileSync(join(sb.pgn, 'orenzbit-2025-12.pgn'), text, 'utf8');
  const r = run(sb, []);
  expect(r.status === 10, `exit ${r.status}, expected 10`);
  expect(sameState(before, state(sb)), 'last good data changed after a rejected month');
  const runs = readRuns(sb);
  expect(runs.length === runsBefore + 1 && runs.at(-1).status === 'failed' && runs.at(-1).failedStep === 'S2' && runs.at(-1).exitCode === 10, 'failure record');
  expect(readProv(sb).version === 1, 'version moved on a failed run');
  return 'exit 10 at S2; public and ledger/provenance unchanged; failure recorded';
}

function sGarbageText() {
  const sb = bootstrapped('malformed-text');
  const before = state(sb);
  addReal(sb, '2025-12');
  const text = 'this line is not PGN\r\n' + readFileSync(join(ROOT, 'orenzbit-2025-12.pgn'), 'utf8');
  writeFileSync(join(sb.pgn, 'orenzbit-2025-12.pgn'), text, 'utf8');
  const r = run(sb, []);
  expect(r.status === 10 && /outside any game/.test(r.stderr), `exit ${r.status}`);
  expect(sameState(before, state(sb)), 'state changed');
  return 'exit 10 (text outside any game)';
}

function sNonCanonicalDiffers() {
  const sb = bootstrapped('noncanonical-differs');
  const before = state(sb);
  addReal(sb, '2025-12');
  const text = readFileSync(join(ROOT, 'orenzbit-2025-12.pgn'), 'utf8') + '\n';
  writeFileSync(join(sb.pgn, 'orenzbit-2025-12 (1).pgn'), text, 'utf8');
  const r = run(sb, []);
  expect(r.status === 10, `exit ${r.status}, expected 10`);
  expect(sameState(before, state(sb)), 'state changed');
  return 'exit 10 (non-canonical name that is not a byte-identical copy)';
}

function sCrossMonthLink() {
  const sb = bootstrapped('cross-month-link');
  const before = state(sb);
  addReal(sb, '2025-12');
  const firstGameOfNov = readFileSync(join(ROOT, 'orenzbit-2025-11.pgn'), 'utf8').split(/(?=^\[Event\s+")/m)[0];
  const text = firstGameOfNov + readFileSync(join(ROOT, 'orenzbit-2025-12.pgn'), 'utf8');
  writeFileSync(join(sb.pgn, 'orenzbit-2025-12.pgn'), text, 'utf8');
  const r = run(sb, []);
  expect(r.status === 10 && /duplicate Link/.test(r.stderr), `exit ${r.status}`);
  expect(sameState(before, state(sb)), 'state changed');
  return 'exit 10 (same game in two months)';
}

function sChangedIngested() {
  const sb = bootstrapped('changed-ingested');
  const before = state(sb);
  writeFileSync(join(sb.pgn, 'orenzbit-2025-11.pgn'), readFileSync(join(sb.pgn, 'orenzbit-2025-11.pgn')).toString('utf8') + '\r\n', 'utf8');
  const r = run(sb, []);
  expect(r.status === 10 && /changed/.test(r.stderr), `exit ${r.status}`);
  expect(sameState(before, state(sb)), 'state changed');
  return 'exit 10; ingested month edited on disk';
}

function sBuilderExit2() {
  const sb = bootstrapped('builder-exit2');
  const before = state(sb);
  addReal(sb, '2025-12');
  const r = run(sb, [], { F30_STUB_MODE: 'exit2' });
  expect(r.status === 22, `exit ${r.status}, expected 22`);
  expect(sameState(before, state(sb)), 'state changed');
  return 'exit 22 (builder validation exit 2 mapped to 20+2)';
}

function sLedgerTamperBuilderRejects() {
  const sb = bootstrapped('ledger-tamper');
  const ledgerPath = join(sb.pipe, 'split-ledger.json');
  const ledger = readLedger(sb);
  const key = Object.keys(ledger.splits).find((k) => ledger.splits[k] === 'holdout');
  ledger.splits[key] = 'training';
  writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2) + '\n', 'utf8');
  addReal(sb, '2025-12');
  const before = state(sb);
  const r = run(sb, []);
  expect(r.status === 24, `exit ${r.status}, expected 24`);
  expect(sameState(before, state(sb)), 'state changed');
  return 'exit 24 (builder reported ledger conflict, code 4)';
}

function sLedgerTamperBuilderIgnores() {
  const sb = bootstrapped('ledger-tamper-leaky');
  const ledgerPath = join(sb.pipe, 'split-ledger.json');
  const ledger = readLedger(sb);
  const key = Object.keys(ledger.splits).find((k) => ledger.splits[k] === 'holdout');
  ledger.splits[key] = 'training';
  writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2) + '\n', 'utf8');
  addReal(sb, '2025-12');
  const before = state(sb);
  const r = run(sb, [], { F30_STUB_MODE: 'leaky' });
  expect(r.status === 11, `exit ${r.status}, expected 11`);
  expect(sameState(before, state(sb)), 'state changed');
  return 'exit 11 (holdout leak / ledger integrity)';
}

function sHoldoutLeakInReport() {
  const sb = bootstrapped('holdout-leak');
  const before = state(sb);
  addReal(sb, '2025-12');
  const r = run(sb, [], { F30_STUB_MODE: 'leaky' });
  expect(r.status === 11, `exit ${r.status}, expected 11`);
  expect(/expected holdout/.test(r.stderr), 'expected the split mismatch message');
  expect(sameState(before, state(sb)), 'state changed');
  return 'exit 11 (builder reports holdout games as training)';
}

function sProfileHoldoutLeak() {
  const sb = bootstrapped('profile-leak');
  const before = state(sb);
  addReal(sb, '2025-12');
  const r = run(sb, [], { F30_STUB_MODE: 'profile-leak' });
  expect(r.status === 11 && /holdoutGameKeys differ/.test(r.stderr), `exit ${r.status}`);
  expect(sameState(before, state(sb)), 'state changed');
  return 'exit 11 (profile holdout keys contain a training game)';
}

function sDroppedGame() {
  const sb = bootstrapped('dropped-game');
  const before = state(sb);
  addReal(sb, '2025-12');
  const r = run(sb, [], { F30_STUB_MODE: 'drop-game' });
  expect(r.status === 11, `exit ${r.status}, expected 11`);
  expect(sameState(before, state(sb)), 'state changed');
  return 'exit 11 (builder report lost a game)';
}

function sBotCheckFails() {
  const sb = bootstrapped('bot-check-fails');
  const before = state(sb);
  addReal(sb, '2025-12');
  const r = run(sb, [], { F30_STUB_CHECK_FAIL: '1' });
  expect(r.status === 11 && /bot checker failed/.test(r.stderr), `exit ${r.status}`);
  expect(sameState(before, state(sb)), 'state changed');
  return 'exit 11 (bot checker failed)';
}

function sBuilderMissing() {
  const sb = bootstrapped('builder-missing');
  const before = state(sb);
  addReal(sb, '2025-12');
  const r = run(sb, [`--builder=${join(sb.dir, 'no-such-builder.mjs')}`]);
  expect(r.status === 1, `exit ${r.status}, expected 1`);
  expect(sameState(before, state(sb)), 'state changed');
  return 'exit 1 (builder not found)';
}

function sBootstrapRefusals() {
  const fresh = sandbox('refuse-no-bootstrap');
  addReal(fresh, '2025-09');
  const a = run(fresh, []);
  expect(a.status === 10, `run without bootstrap exit ${a.status}, expected 10`);
  const bs = bootstrapped('refuse-second-bootstrap');
  const b = run(bs, ['--bootstrap']);
  expect(b.status === 10, `second bootstrap exit ${b.status}, expected 10`);
  return 'exit 10 without bootstrap; exit 10 on second bootstrap';
}

function sDryRunNoChange() {
  const sb = bootstrapped('dry-run-no-change');
  addReal(sb, '2025-12');
  const before = state(sb);
  const runsBefore = readRuns(sb).length;
  const r = run(sb, ['--dry-run']);
  expect(r.status === 0, `dry-run exit ${r.status}: ${r.stderr.trim()}`);
  expect(r.summary.status === 'dry-run' && r.summary.version === 2 && r.summary.changed === true, 'dry-run summary');
  expect(sameState(before, state(sb)), 'dry-run changed public or state files');
  expect(readRuns(sb).length === runsBefore, 'dry-run wrote runs.json');
  return 'exit 0; no public or pipeline file changed; no runs record';
}

function sTrainingInputHasNoHoldout() {
  const sb = bootstrapped('training-input');
  addReal(sb, '2025-12');
  const r = run(sb, ['--dry-run']);
  expect(r.status === 0, `dry-run exit ${r.status}`);
  const report = readJson(join(r.summary.staging, 'report.json'));
  const trainingInput = readJson(join(r.summary.staging, 'stub-training-input.json'));
  const holdout = new Set(report.games.filter((g) => g.split === 'holdout' && g.usable).map((g) => g.key));
  const reportTraining = report.games.filter((g) => g.split === 'training' && g.usable).map((g) => g.key).sort();
  expect(trainingInput.every((key) => !holdout.has(key)), 'a holdout game is in the generator training input');
  expect(JSON.stringify([...trainingInput].sort()) === JSON.stringify(reportTraining), 'training input differs from the reported training set');
  expect(holdout.size === 5, `holdout count ${holdout.size}`);
  return `training input ${trainingInput.length} keys; holdout ${holdout.size} keys; intersection empty`;
}

function sRealPgnDryRun() {
  const sb = sandbox('real-pgn-dry-run');
  const repoBefore = {
    index: shaOf(join(ROOT, 'public', 'data', 'bots', 'index.json')),
    pipelineExists: existsSync(join(ROOT, 'data', 'oren-pipeline')),
  };
  const r = run(sb, ['--bootstrap', '--dry-run', `--pgn-dir=${ROOT}`]);
  expect(r.status === 0, `exit ${r.status}: ${r.stderr.trim()}`);
  const s = r.summary;
  expect(s.canonicalFiles === 14, `canonical files ${s.canonicalFiles}, expected 14`);
  expect(s.duplicateFiles === 1, `duplicate files ${s.duplicateFiles}, expected 1`);
  expect(s.games === 1959, `games ${s.games}, expected 1959`);
  expect(s.dateMonthWarnings === 9, `date-month warnings ${s.dateMonthWarnings}, expected 9`);
  const repoAfter = {
    index: shaOf(join(ROOT, 'public', 'data', 'bots', 'index.json')),
    pipelineExists: existsSync(join(ROOT, 'data', 'oren-pipeline')),
  };
  expect(JSON.stringify(repoBefore) === JSON.stringify(repoAfter), 'real repo public or pipeline state changed');
  return 'real 15 files: 14 canonical + 1 identical duplicate; 1959 games; 9 date-month warnings; repo untouched';
}

function sStaticScan() {
  const problems = [];
  const workflowDir = join(ROOT, '.github', 'workflows');
  const workflows = readdirSync(workflowDir).filter((n) => /\.ya?ml$/.test(n));
  for (const name of workflows) {
    const text = readFileSync(join(workflowDir, name), 'utf8');
    if (/oren/i.test(text) && /^\s*schedule:/m.test(text)) problems.push(`scheduled workflow mentions Oren: ${name}`);
  }
  const scripts = readdirSync(join(ROOT, 'scripts')).filter((n) => /oren/i.test(n) && n.endsWith('.mjs') && n !== 'check-oren-monthly.mjs');
  const networkPattern = /\bfetch\s*\(|\bhttps?:\/\/|from\s+['"](?:node:)?(?:https?|net|tls|dgram|dns)['"]/;
  for (const name of scripts) {
    if (networkPattern.test(readFileSync(join(ROOT, 'scripts', name), 'utf8'))) problems.push(`network access in scripts/${name}`);
  }
  const own = readFileSync(PIPELINE, 'utf8');
  if (/\bcron\b/i.test(own)) problems.push('cron reference in the pipeline script');
  expect(problems.length === 0, problems.join('; '));
  return `workflows scanned ${workflows.length}; oren scripts scanned ${scripts.length + 1}`;
}

function sBuilderOutputOnly() {
  const sb = bootstrapped('builder-output-only');
  const r = run(sb, [], { F30_STUB_MODE: 'builder-v2' });
  expect(r.status === 0 && r.summary.status === 'promoted' && r.summary.version === 2, `exit ${r.status} status ${r.summary?.status} version ${r.summary?.version}`);
  const profile = readProfile(sb);
  expect(profile.builderRevision === 2 && profile.dataVersion === 2, 'profile not rebuilt at version 2');
  const prov = readProv(sb);
  expect(prov.version === 2 && readRuns(sb).at(-1).version === 2, 'version not recorded');
  expect(prov.files.find((f) => f.name === 'orenzbit-2025-09.pgn').ingestedInVersion === 1, 'ingestedInVersion changed for an old month');
  return 'same months, builder output changed: promoted as version 2 (second build at prev+1)';
}

function sFileCountDrift() {
  const sb = bootstrapped('file-count-drift');
  const before = state(sb);
  addReal(sb, '2025-12');
  const r = run(sb, [], { F30_STUB_MODE: 'file-drift' });
  expect(r.status === 11 && /changed from 4 to 3/.test(r.stderr), `exit ${r.status}`);
  expect(sameState(before, state(sb)), 'state changed');
  return 'exit 11 (already-ingested month lost a usable game)';
}

function sIngestedMonthDeleted() {
  const sb = bootstrapped('ingested-deleted');
  const before = state(sb);
  rmSync(join(sb.pgn, 'orenzbit-2025-11.pgn'));
  const r = run(sb, []);
  expect(r.status === 10 && /missing/.test(r.stderr), `exit ${r.status}`);
  expect(sameState(before, state(sb)), 'state changed');
  return 'exit 10 (ingested month removed from the folder)';
}

function sBuilderContractDrift() {
  const builderSrc = readFileSync(join(ROOT, 'scripts', 'build-oren-bot.mjs'), 'utf8').replace(/\r\n/g, '\n');
  const pipelineSrc = readFileSync(PIPELINE, 'utf8').replace(/\r\n/g, '\n');
  const problems = [];
  const id = /ORENBOT_IDENTITY = \{\s*id: '([^']+)'/.exec(builderSrc)?.[1];
  if (!id) problems.push('builder identity id not found');
  if (!/join\(outDir, profile\.id \+ '\.json'\)/.test(builderSrc)) problems.push('builder no longer writes <id>.json');
  if (!/join\(outDir, 'index\.json'\)/.test(builderSrc)) problems.push('builder no longer writes index.json');
  if (id && !pipelineSrc.includes("'" + id + ".json'")) problems.push('pipeline does not use the builder profile name ' + id + '.json');
  if (!/export const BUILDER_VERSION = \d+;/.test(builderSrc)) problems.push('BUILDER_VERSION is not a number');
  const start = builderSrc.indexOf('function buildReport(');
  const end = builderSrc.indexOf('\n}\n', start);
  expect(start > 0 && end > start, 'builder buildReport() not found');
  const reportFn = builderSrc.slice(start, end);
  for (const key of ['builderVersion', 'files', 'totals', 'sourceSetSha256', 'profileSha256', 'indexSha256', 'games', 'usable', 'holdout', 'training', 'duplicateOf', 'sha256', 'bytes', 'name', 'key', 'file', 'chunkIdx', 'split', 'reason']) {
    if (!new RegExp('\\b' + key + ':').test(reportFn)) problems.push('builder report has no ' + key);
  }
  if (/\bchunks:/.test(reportFn)) problems.push('builder report now has chunks; the pipeline reads games');
  const reasons = new Set([...builderSrc.matchAll(/\breason\b[^'\n]{0,20}'([a-z][a-z-]*)'/g)].map((m) => m[1]));
  for (const required of ['usable', 'replay-failed', 'short', 'not-player', 'ambiguous-colour']) {
    if (!reasons.has(required)) problems.push('builder reason not found in source: ' + required);
  }
  for (const reason of reasons) {
    if (!pipelineSrc.includes("'" + reason + "'")) problems.push('pipeline does not accept builder reason: ' + reason);
  }
  expect(problems.length === 0, problems.join('; '));
  return `profile ${id}.json; index.json; report keys present; numeric BUILDER_VERSION; reasons ${[...reasons].sort().join(', ')}`;
}

function main() {
  mkdirSync(STUB_DIR, { recursive: true });
  writeFileSync(STUB_BUILDER_PATH, STUB_BUILDER_SRC, 'utf8');
  writeFileSync(STUB_CHECK_PATH, STUB_CHECK_SRC, 'utf8');
  mkdirSync(TEST_ROOT, { recursive: true });

  scenario('T1 repro: dry-run twice + unchanged re-run (acceptance: reproducible hashes)', sRepro);
  scenario('bootstrap: months ingested, duplicate counted once, version 1 (acceptance 3, 4)', sBootstrap);
  scenario('T6 add month: old games keep split, version +1 (acceptance 1, 4)', sAddMonth);
  scenario('T3 malformed: missing Link rejected, last good kept (acceptance 2)', sMalformedLink);
  scenario('T3b malformed: text outside any game rejected (acceptance 2)', sGarbageText);
  scenario('T3c non-canonical name that differs from canonical rejected', sNonCanonicalDiffers);
  scenario('T3d same game in two months rejected', sCrossMonthLink);
  scenario('T4 edited ingested month rejected (immutable)', sChangedIngested);
  scenario('builder rejection (exit 2) keeps last good', sBuilderExit2);
  scenario('builder output changed without new months: promoted as version 2', sBuilderOutputOnly);
  scenario('already-ingested month lost a usable game (exit 11)', sFileCountDrift);
  scenario('already-ingested month removed from folder (exit 10)', sIngestedMonthDeleted);
  scenario('T2a ledger tampered, builder rejects (exit 24)', sLedgerTamperBuilderRejects);
  scenario('T2b ledger tampered, builder ignores ledger (exit 11)', sLedgerTamperBuilderIgnores);
  scenario('acceptance 5: holdout reported as training rejected (exit 11)', sHoldoutLeakInReport);
  scenario('acceptance 5: profile holdout keys leak training game (exit 11)', sProfileHoldoutLeak);
  scenario('builder report lost a game (exit 11)', sDroppedGame);
  scenario('bot checker failure (exit 11)', sBotCheckFails);
  scenario('builder not found (exit 1)', sBuilderMissing);
  scenario('bootstrap refusals (exit 10)', sBootstrapRefusals);
  scenario('T8 dry-run changes nothing', sDryRunNoChange);
  scenario('acceptance 5: generator training input has no holdout game', sTrainingInputHasNoHoldout);
  scenario('real PGN folder dry-run: 14 canonical + 1 duplicate, 1959 games, 9 warnings', sRealPgnDryRun);
  scenario('builder contract drift: profile name, report shape, reasons match the real builder', sBuilderContractDrift);
  scenario('T7 static: no schedule for Oren workflows, no network in Oren scripts', sStaticScan);

  const failed = results.filter((r) => !r.ok);
  console.log(`${failed.length === 0 ? 'PASS' : 'FAIL'}: check-oren-monthly (${results.length - failed.length}/${results.length})`);
  process.exitCode = failed.length === 0 ? 0 : 1;
}

main();
