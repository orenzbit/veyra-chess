#!/usr/bin/env node
// Static and offline check for the automatic Oren monthly run. No network access, no real API calls.
//   node scripts/check-oren-monthly-workflow.mjs
// Covers: .github/workflows/oren-monthly.yml (triggers, permissions, forbidden commands, branch + PR step),
// the URL building / month logic / retry behaviour of scripts/fetch-oren-month.mjs (fake fetch only),
// and the holdout verification of scripts/oren-monthly-summary.mjs.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  API_ROOT, MAX_RETRIES, USER_AGENT, FetchError, archivesUrl, assertCompleteMonth, fetchMonth, monthFileName,
  monthPgnUrl, parseMonth, previousMonth, requestWithRetry, retryDelayMs, run,
} from './fetch-oren-month.mjs';
import { buildBody, verifyHoldout } from './oren-monthly-summary.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const ok = (label) => console.log('PASS: ' + label);
const check = (label, condition, detail = '') => {
  if (condition) ok(label);
  else { failures.push(label); console.log('FAIL: ' + label + (detail ? ' — ' + detail : '')); }
};
const rejects = async (fn) => { try { await fn(); return null; } catch (error) { return error; } };

const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const workflow = read('.github/workflows/oren-monthly.yml');
const lines = workflow.split(/\r?\n/);

// Returns the indented lines that belong to a top-level key (e.g. `on:`), comments removed.
function topBlock(name) {
  const start = lines.findIndex((line) => line.startsWith(name + ':'));
  if (start < 0) return null;
  const out = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^\S/.test(lines[i])) break;
    if (lines[i].trim() && !lines[i].trim().startsWith('#')) out.push(lines[i]);
  }
  return out;
}

// ---- Workflow: triggers ----
const on = topBlock('on') || [];
check('workflow has a schedule trigger', on.some((l) => /^ {2}schedule:\s*$/.test(l)));
check('schedule is the 3rd of each month at 03:00 UTC', on.some((l) => /cron:\s*'0 3 3 \* \*'/.test(l)));
check('workflow has a workflow_dispatch trigger', on.some((l) => /^ {2}workflow_dispatch:\s*$/.test(l)));
check('workflow_dispatch has an optional month input', on.some((l) => /^ {6}month:\s*$/.test(l)) && on.some((l) => /required:\s*false/.test(l)));
check('no push or pull_request trigger', !on.some((l) => /^ {2}(push|pull_request|pull_request_target):/.test(l)));

// ---- Workflow: permissions are exactly contents: write + pull-requests: write ----
const permissions = (topBlock('permissions') || []).map((l) => l.trim());
check('permissions are exactly contents: write and pull-requests: write', permissions.length === 2 && permissions.includes('contents: write') && permissions.includes('pull-requests: write'), permissions.join(' | '));
check('there is only one permissions block (none per job)', lines.filter((l) => /^\s*permissions:/.test(l)).length === 1);
const secrets = [...workflow.matchAll(/secrets\.([A-Za-z0-9_]+)/g)].map((m) => m[1]);
check('only GITHUB_TOKEN is used as a secret', secrets.length > 0 && secrets.every((s) => s === 'GITHUB_TOKEN'), secrets.join(','));

// ---- Workflow: concurrency, Node, steps ----
const concurrency = (topBlock('concurrency') || []).join('\n');
check('concurrency group exists and does not cancel a running update', /group:\s*\S+/.test(concurrency) && /cancel-in-progress:\s*false/.test(concurrency));
check('job runs only on refs/heads/main', /if:\s*github\.ref == 'refs\/heads\/main'/.test(workflow));
check('uses actions/checkout and Node 24 with npm ci', /actions\/checkout@/.test(workflow) && /node-version:\s*24\b/.test(workflow) && /run:\s*npm ci\b/.test(workflow));
check('fetch step runs scripts/fetch-oren-month.mjs', /node scripts\/fetch-oren-month\.mjs/.test(workflow));
check('month input is passed through env, not interpolated into the shell', /MONTH_INPUT:\s*\$\{\{\s*inputs\.month\s*\}\}/.test(workflow) && !/run:.*\$\{\{\s*inputs\.month/.test(workflow));
check('build step runs scripts/build-oren-bot.mjs into a staging directory', /node scripts\/build-oren-bot\.mjs[^\n]*--out="\$STAGING"/.test(workflow) && /STAGING="\$RUNNER_TEMP\//.test(workflow) && !/--out=public/.test(workflow));
check('builder reads and writes no ledger from the workflow and reports to staging', /--report="\$STAGING\/report\.json"/.test(workflow));
check('own check step runs scripts/check-oren-bot.mjs against the staged profile and index', /node scripts\/check-oren-bot\.mjs[^\n]*--profile="\$STAGING\/orenzbit\.json"[^\n]*--index="\$STAGING\/index\.json"/.test(workflow));
check('holdout verification and this check run in the workflow', /node scripts\/oren-monthly-summary\.mjs/.test(workflow) && /node scripts\/check-oren-monthly-workflow\.mjs/.test(workflow));
check('PR body comes from the builder report summary', /--body-file "\$RUNNER_TEMP\/pr-body\.md"/.test(workflow) && /--out="\$RUNNER_TEMP\/pr-body\.md"/.test(workflow));

// ---- Workflow: never touches main, never force-pushes, never merges ----
const noComments = lines.filter((l) => !l.trim().startsWith('#')).join('\n');
const forbidden = [
  ['push origin main', /push[ \t]+(?:\S+[ \t]+)*origin[ \t]+(?:\S+[ \t]+)*main\b/],
  ['HEAD:main', /HEAD:\s*(?:refs\/heads\/)?main/],
  ['--force', /--force/],
  ['git push -f', /git\s+push\b[^\n]*\s-[a-zA-Z]*f/],
  ['+refspec push', /git\s+push\b[^\n]*\s\+/],
  ['gh pr merge', /gh\s+pr\s+merge/],
  ['--auto / auto-merge', /--auto\b|auto-?merge/i],
  ['git push to bare "main"', /git\s+push\b[^\n]*\bmain\b/],
];
for (const [name, pattern] of forbidden) check('workflow contains no "' + name + '"', !pattern.test(noComments));
const pushLines = noComments.split('\n').filter((l) => /git\s+push/.test(l)).map((l) => l.trim());
check('only two git push commands exist: the bot branch push and the bot branch delete', pushLines.length === 2 && pushLines[0] === 'git push --set-upstream origin "$BRANCH"' && pushLines[1] === 'git push origin --delete "$BRANCH"', pushLines.join(' | '));
check('branch name pattern bot/oren-monthly-YYYY-MM is present', /BRANCH="bot\/oren-monthly-\$\{MONTH\}"/.test(workflow));
check('a new branch is created before the push', /git checkout -b "\$BRANCH"/.test(workflow));
check('gh pr create step targets main from the bot branch with GITHUB_TOKEN', /gh pr create --base main --head "\$BRANCH"/.test(workflow) && /GH_TOKEN:\s*\$\{\{\s*secrets\.GITHUB_TOKEN\s*\}\}/.test(workflow));
check('gh pr create appears exactly once (inside open_pr)', (noComments.match(/gh pr create --base/g) || []).length === 1 && /open_pr\(\) \{\s*\n\s*gh pr create/.test(noComments));
check('exits without a PR when nothing changed', /git diff --cached --quiet/.test(workflow) && /ls-remote --exit-code --heads origin/.test(workflow));

// Stray-branch handling: an existing bot branch must have a PR; otherwise open it or fail loudly.
const existingStart = noComments.indexOf('git ls-remote --exit-code --heads origin');
const existingEnd = noComments.indexOf("git config user.name");
const existingBlock = existingStart >= 0 && existingEnd > existingStart ? noComments.slice(existingStart, existingEnd) : '';
check('existing branch: looks for any PR (open, closed or merged) with gh pr list --head "$BRANCH" --state all', /gh pr list --head "\$BRANCH" --state all/.test(existingBlock));
check('existing branch with a PR exits 0 without changes', /-gt 0 \]; then[\s\S]*?exit 0/.test(existingBlock));
check('existing branch without a PR opens the PR, or fails loudly with a clear error', /if open_pr; then\s*\n\s*exit 0\s*\n\s*fi/.test(existingBlock) && /::error::Branch \$BRANCH exists on origin but has no pull request/.test(existingBlock) && /exit 1\s*\n\s*fi\s*$/.test(existingBlock.trim()), existingBlock.slice(-200));
check('existing branch path never pushes or deletes a branch', !/git\s+push/.test(existingBlock));
const pushAt = noComments.indexOf('git push --set-upstream origin "$BRANCH"');
const failBlock = pushAt >= 0 ? noComments.slice(pushAt) : '';
check('after the push, a failed gh pr create deletes only the just-pushed bot branch and fails', /if ! open_pr; then[\s\S]*::error::gh pr create failed after pushing \$BRANCH[\s\S]*git push origin --delete "\$BRANCH"\s*\n\s*exit 1\s*\n\s*fi/.test(failBlock));
check('the delete is the last push and runs after the branch push', noComments.indexOf('git push origin --delete "$BRANCH"') > pushAt && pushAt > existingEnd);
const addLines = noComments.split('\n').filter((l) => /git\s+add\b/.test(l));
check('only the month file and the profile are added (index.json stays untouched)', addLines.length === 1 && /orenzbit-\$\{MONTH\}\.pgn/.test(addLines[0]) && /public\/data\/bots\/orenzbit\.json/.test(addLines[0]) && !/index\.json/.test(addLines[0]) && !/git add (-A|\.|--all)/.test(addLines[0]), addLines.join(' | '));
check('referenced scripts exist', ['fetch-oren-month', 'build-oren-bot', 'check-oren-bot', 'oren-monthly-summary', 'check-oren-monthly-workflow'].every((n) => existsSync(join(ROOT, 'scripts', n + '.mjs'))));

// ---- Fetcher: month logic ----
check('parseMonth accepts YYYY-MM', parseMonth('2026-09').year === 2026 && parseMonth('2026-09').month === 9);
for (const bad of ['2026-13', '2026-00', '2026-9', '26-09', '', 'abc', '1999-12']) {
  const error = await rejects(() => parseMonth(bad));
  check('parseMonth rejects "' + bad + '"', error instanceof FetchError && error.exitCode === 2);
}
check('previousMonth in mid-year', previousMonth(new Date(Date.UTC(2026, 9, 3, 3, 0))).ym === '2026-09');
check('previousMonth rolls back from January to December', previousMonth(new Date(Date.UTC(2027, 0, 3, 3, 0))).ym === '2026-12');
check('previousMonth on the last day of a month uses UTC', previousMonth(new Date(Date.UTC(2026, 2, 31, 23, 59))).ym === '2026-02');
check('previousMonth in March 2028 is February (leap year)', previousMonth(new Date(Date.UTC(2028, 2, 3))).ym === '2028-02');
const now = new Date(Date.UTC(2026, 9, 3));
check('assertCompleteMonth accepts a past month', (() => { try { assertCompleteMonth(parseMonth('2026-09'), now); return true; } catch { return false; } })());
for (const notComplete of ['2026-10', '2026-11', '2027-01']) {
  const error = await rejects(() => assertCompleteMonth(parseMonth(notComplete), now));
  check('assertCompleteMonth rejects ' + notComplete, error instanceof FetchError);
}

// ---- Fetcher: URLs and file names ----
const sep = parseMonth('2026-09');
check('archive list URL', archivesUrl() === 'https://api.chess.com/pub/player/orenzbit/games/archives');
check('month PGN URL', monthPgnUrl(sep) === 'https://api.chess.com/pub/player/orenzbit/games/2026/09/pgn');
check('month PGN URL pads single-digit months', monthPgnUrl(parseMonth('2026-02')) === API_ROOT + '/2026/02/pgn');
check('month file name matches the builder canonical pattern', monthFileName(sep) === 'orenzbit-2026-09.pgn' && /^orenzbit-\d{4}-\d{2}\.pgn$/.test(monthFileName(sep)));
check('User-Agent is descriptive', /veyra-chess/.test(USER_AGENT) && /github\.com\/orenzbit\/veyra-chess/.test(USER_AGENT));
check('retry backoff doubles and is capped', retryDelayMs(0, null) === 2000 && retryDelayMs(1, null) === 4000 && retryDelayMs(2, null) === 8000 && retryDelayMs(20, null) === 30000);
check('Retry-After is honoured and capped', retryDelayMs(0, '5') === 5000 && retryDelayMs(0, '9999') === 30000);

// ---- Fetcher: HTTP behaviour with a fake fetch ----
const response = (status, body = '', headers = {}) => ({
  status, ok: status >= 200 && status < 300,
  headers: { get: (name) => headers[name.toLowerCase()] ?? null },
  json: async () => JSON.parse(body), text: async () => body,
});
const scripted = (steps) => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    const step = steps.shift();
    if (!step) throw new Error('unexpected extra request to ' + url);
    return typeof step === 'function' ? step(url) : step;
  };
  return { fetchImpl, calls };
};
const samplePgn = '[Event "Live Chess"]\n[Link "https://www.chess.com/game/live/1"]\n\n1. e4 e5 *\n';
const archiveBody = JSON.stringify({ archives: [API_ROOT + '/2026/08', API_ROOT + '/2026/09'] });
const noSleep = { sleep: async () => {} };

{
  const sleeps = [];
  const { fetchImpl, calls } = scripted([response(429), response(429, '', { 'retry-after': '3' }), response(200, 'ok')]);
  const result = await requestWithRetry('https://example.invalid/x', { fetchImpl, sleep: async (ms) => { sleeps.push(ms); } });
  check('429 is retried with backoff and then succeeds', result.status === 200 && calls.length === 3 && sleeps.join(',') === '2000,3000', sleeps.join(','));
  check('every request carries the User-Agent header', calls.every((c) => c.init.headers['User-Agent'] === USER_AGENT));
}
{
  const { fetchImpl, calls } = scripted([response(429), response(429), response(429), response(429), response(200)]);
  const error = await rejects(() => requestWithRetry('https://example.invalid/x', { fetchImpl, ...noSleep }));
  check('429 gives up after ' + MAX_RETRIES + ' retries (4 requests)', error instanceof FetchError && calls.length === MAX_RETRIES + 1 && /429/.test(error.message));
}
{
  const { fetchImpl } = scripted([() => { throw new Error('boom'); }]);
  const error = await rejects(() => requestWithRetry('https://example.invalid/x', { fetchImpl, ...noSleep }));
  check('network errors fail clearly', error instanceof FetchError && /network error/.test(error.message));
}
{
  const { fetchImpl, calls } = scripted([response(200, archiveBody), response(200, samplePgn)]);
  const result = await fetchMonth(sep, { fetchImpl, ...noSleep });
  check('fetchMonth returns the PGN text and requested the archive list then the month PGN', result.status === 'fetched' && result.text === samplePgn && calls[0].url === archivesUrl() && calls[1].url === monthPgnUrl(sep));
}
{
  const { fetchImpl } = scripted([response(404)]);
  check('404 on the archive list means nothing to do', (await fetchMonth(sep, { fetchImpl, ...noSleep })).status === 'nothing');
}
{
  const { fetchImpl, calls } = scripted([response(200, JSON.stringify({ archives: [API_ROOT + '/2026/08'] }))]);
  const result = await fetchMonth(sep, { fetchImpl, ...noSleep });
  check('month missing from the archive list means nothing to do (no PGN request)', result.status === 'nothing' && calls.length === 1);
}
{
  const { fetchImpl } = scripted([response(200, archiveBody), response(404)]);
  check('404 on the month PGN means nothing to do', (await fetchMonth(sep, { fetchImpl, ...noSleep })).status === 'nothing');
}
{
  const { fetchImpl } = scripted([response(200, archiveBody), response(200, '  \n')]);
  check('empty month PGN means nothing to do', (await fetchMonth(sep, { fetchImpl, ...noSleep })).status === 'nothing');
}
for (const status of [400, 403, 500, 503]) {
  const { fetchImpl } = scripted([response(status)]);
  const error = await rejects(() => fetchMonth(sep, { fetchImpl, ...noSleep }));
  check('HTTP ' + status + ' fails clearly', error instanceof FetchError && new RegExp('HTTP ' + status).test(error.message));
}
{
  const { fetchImpl } = scripted([response(200, '<html>not json</html>')]);
  const error = await rejects(() => fetchMonth(sep, { fetchImpl, ...noSleep }));
  check('a malformed archive list fails clearly', error instanceof FetchError);
}
{
  const { fetchImpl } = scripted([response(200, archiveBody), response(200, '<html>oops</html>')]);
  const error = await rejects(() => fetchMonth(sep, { fetchImpl, ...noSleep }));
  check('a response that is not PGN fails clearly', error instanceof FetchError && /PGN/.test(error.message));
}

// ---- Fetcher: file writes (immutable months) ----
const sandbox = join(ROOT, 'artifacts', 'check-oren-monthly-workflow-' + process.pid);
rmSync(sandbox, { recursive: true, force: true });
mkdirSync(sandbox, { recursive: true });
try {
  const quiet = () => {};
  const runNow = new Date(Date.UTC(2026, 9, 3));
  let sc = scripted([response(200, archiveBody), response(200, samplePgn)]);
  let result = await run(['--out-dir=' + sandbox], { now: runNow, deps: { fetchImpl: sc.fetchImpl, ...noSleep }, out: quiet });
  const target = join(sandbox, 'orenzbit-2026-09.pgn');
  check('run writes orenzbit-YYYY-MM.pgn for the previous month', result.status === 'fetched' && existsSync(target) && readFileSync(target, 'utf8') === samplePgn);
  sc = scripted([]);
  result = await run(['--out-dir=' + sandbox], { now: runNow, deps: { fetchImpl: sc.fetchImpl, ...noSleep }, out: quiet });
  check('an existing month file is left alone and no request is made', result.status === 'exists' && sc.calls.length === 0 && readFileSync(target, 'utf8') === samplePgn);
  sc = scripted([response(200, archiveBody), response(404)]);
  result = await run(['--month=2026-08', '--out-dir=' + sandbox], { now: runNow, deps: { fetchImpl: sc.fetchImpl, ...noSleep }, out: quiet });
  check('404 for the month exits 0 with "nothing to do" and writes no file', result.status === 'nothing' && !existsSync(join(sandbox, 'orenzbit-2026-08.pgn')));
  const lines404 = [];
  sc = scripted([response(404)]);
  await run(['--month=2026-07', '--out-dir=' + sandbox], { now: runNow, deps: { fetchImpl: sc.fetchImpl, ...noSleep }, out: (m) => lines404.push(m) });
  check('the "nothing to do" message is printed', lines404.some((m) => /nothing to do/.test(m)));
  const error = await rejects(() => run(['--month=2026-10', '--out-dir=' + sandbox], { now: runNow, deps: { fetchImpl: scripted([]).fetchImpl }, out: quiet }));
  check('the current month is refused before any request', error instanceof FetchError && error.exitCode === 2);
  const argError = await rejects(() => run(['--bogus=1'], { now: runNow, out: quiet }));
  check('unknown arguments are refused', argError instanceof FetchError && argError.exitCode === 2);
} finally {
  rmSync(sandbox, { recursive: true, force: true });
}
const fetcherSource = read('scripts/fetch-oren-month.mjs');
check('fetcher opens the month file with the exclusive "wx" flag', /open\(file, 'wx'\)/.test(fetcherSource));
check('fetcher needs no secrets', !/process\.env\.(?!GITHUB_OUTPUT)/.test(fetcherSource));

// ---- Holdout summary ----
const mkGame = (file, chunkIdx, usable = true) => ({ key: 'https://www.chess.com/game/live/' + file + '-' + chunkIdx, file, chunkIdx, split: chunkIdx % 10 === 0 ? 'holdout' : 'training', usable, reason: usable ? 'usable' : 'short' });
const games = [];
for (const file of ['orenzbit-2026-08.pgn', 'orenzbit-2026-09.pgn']) for (let i = 0; i < 25; i += 1) games.push(mkGame(file, i));
const holdoutRows = games.filter((g) => g.split === 'holdout');
const report = {
  exit: 0,
  totals: { canonicalFiles: 2, games: 50, notPlayer: 0, replayFailed: 0, short: 0, usable: 50, holdout: holdoutRows.length, training: 50 - holdoutRows.length, ledgerConflicts: 0 },
  files: [
    { name: 'orenzbit-2026-08.pgn', usable: 25, holdout: 3, training: 22 },
    { name: 'orenzbit-2026-09.pgn', usable: 25, holdout: 3, training: 22 },
  ],
  games,
};
const after = { holdoutGameCount: holdoutRows.length, trainingGameCount: 50 - holdoutRows.length, sourceGameCount: 50, holdoutGameKeys: holdoutRows.map((g) => g.key) };
const before = { holdoutGameCount: 3, trainingGameCount: 22, sourceGameCount: 25, holdoutGameKeys: holdoutRows.slice(0, 3).map((g) => g.key) };
check('holdout verification passes for a consistent build', verifyHoldout(report, before, after).length === 0, verifyHoldout(report, before, after).join('; '));
check('holdout verification flags a lost earlier holdout game', verifyHoldout(report, { ...before, holdoutGameKeys: [...before.holdoutGameKeys, 'https://www.chess.com/game/live/gone'] }, after).some((p) => /no longer holdout/.test(p)));
check('holdout verification flags a row that breaks the chunk rule', verifyHoldout({ ...report, games: [{ ...games[0], split: 'training' }, ...games.slice(1)] }, before, after).some((p) => /chunk rule/.test(p)));
check('holdout verification flags a holdout game that is also training', verifyHoldout(report, before, { ...after, holdoutGameKeys: [...after.holdoutGameKeys.slice(1), games[1].key] }).length > 0);
check('holdout verification flags count mismatches', verifyHoldout(report, before, { ...after, holdoutGameCount: after.holdoutGameCount + 1 }).length > 0);
check('holdout verification refuses a failed report', verifyHoldout({ exit: 3 }, before, after).length > 0);
const body = buildBody({ month: '2026-09', report, before, after });
check('PR body states the holdout counts from the report', body.includes('| Holdout games | 3 | ' + report.totals.holdout + ' | 3 |') && body.includes('chunkIdx % 10 === 0') && body.includes('orenzbit-2026-09.pgn'));
check('PR body says index.json is not touched', /index\.json` is \*\*not\*\* touched/.test(body));

// ---- Docs and wiring ----
const docs = read('docs/ORENBOT_MONTHLY.md');
check('docs describe the "Automatic monthly run"', /^## Automatic monthly run/m.test(docs) && /workflow_dispatch/.test(docs) && /First real run: only after this workflow is merged/.test(docs));
const pkg = JSON.parse(read('package.json'));
check('check:contracts runs this check', /check:oren-monthly-workflow/.test(pkg.scripts['check:contracts'] || '') && /check-oren-monthly-workflow\.mjs/.test(pkg.scripts['check:oren-monthly-workflow'] || ''));

if (failures.length) {
  console.log('\nFAILED (' + failures.length + '): ' + failures.join('; '));
  process.exit(1);
}
console.log('\nOren monthly workflow checks passed.');
