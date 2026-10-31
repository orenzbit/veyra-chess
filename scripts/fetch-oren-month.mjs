#!/usr/bin/env node
// Downloads one complete month of the account's games from the Chess.com public API
// (https://www.chess.com/news/view/published-data-api) and writes orenzbit-YYYY-MM.pgn.
// Intended to run inside GitHub Actions (.github/workflows/oren-monthly.yml); no secrets are needed.
//   node scripts/fetch-oren-month.mjs [--month=YYYY-MM] [--out-dir=.]
// Without --month the previous complete UTC month is used.
// Exit codes: 0 = fetched, or nothing to do (no games / month already ingested) · 1 = failure · 2 = bad arguments.
// When GITHUB_OUTPUT is set, `status` (fetched | nothing | exists) and `month` are written for later workflow steps.
import { appendFileSync, existsSync } from 'node:fs';
import { open } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const ACCOUNT = 'orenzbit';
export const API_ROOT = 'https://api.chess.com/pub/player/' + ACCOUNT + '/games';
export const USER_AGENT = 'veyra-chess-oren-monthly/1.0 (+https://github.com/orenzbit/veyra-chess; monthly archive of the owner\'s own games; contact: GitHub user orenzbit)';
export const MAX_RETRIES = 3;
export const BASE_DELAY_MS = 2000;
export const MAX_DELAY_MS = 30000;

export class FetchError extends Error {
  constructor(message, exitCode = 1) { super(message); this.exitCode = exitCode; }
}

const pad2 = (n) => String(n).padStart(2, '0');

export function parseMonth(value) {
  const match = /^(\d{4})-(\d{2})$/.exec(String(value || ''));
  if (!match) throw new FetchError('invalid month "' + value + '", expected YYYY-MM', 2);
  const year = Number(match[1]), month = Number(match[2]);
  if (year < 2000 || month < 1 || month > 12) throw new FetchError('invalid month "' + value + '", expected YYYY-MM with a real month', 2);
  return { year, month, ym: match[1] + '-' + match[2] };
}

// The previous complete month in UTC. January rolls back to December of the previous year.
export function previousMonth(now = new Date()) {
  const year = now.getUTCFullYear(), month = now.getUTCMonth() + 1;
  return parseMonth(month === 1 ? (year - 1) + '-12' : year + '-' + pad2(month - 1));
}

// A month is complete only after it has ended (UTC); the current and future months are rejected.
export function assertCompleteMonth(target, now = new Date()) {
  const current = now.getUTCFullYear() * 12 + now.getUTCMonth();
  if (target.year * 12 + (target.month - 1) >= current) {
    throw new FetchError('month ' + target.ym + ' is not complete yet (UTC); only past months can be ingested', 2);
  }
}

export const archivesUrl = () => API_ROOT + '/archives';
export const monthArchiveUrl = (target) => API_ROOT + '/' + target.year + '/' + pad2(target.month);
export const monthPgnUrl = (target) => monthArchiveUrl(target) + '/pgn';
export const monthFileName = (target) => ACCOUNT + '-' + target.ym + '.pgn';

export function retryDelayMs(attempt, retryAfterHeader) {
  const seconds = Number(retryAfterHeader);
  if (retryAfterHeader && Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, MAX_DELAY_MS);
  return Math.min(BASE_DELAY_MS * 2 ** attempt, MAX_DELAY_MS);
}

// Returns the final Response. 429 is retried with exponential backoff (at most MAX_RETRIES retries);
// every other status is returned to the caller untouched.
export async function requestWithRetry(url, { fetchImpl = fetch, sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)), log = () => {} } = {}) {
  for (let attempt = 0; ; attempt += 1) {
    let response;
    try {
      response = await fetchImpl(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json, application/x-chess-pgn, text/plain;q=0.8' } });
    } catch (error) {
      throw new FetchError('network error for ' + url + ': ' + (error && error.message ? error.message : error));
    }
    if (response.status !== 429) return response;
    if (attempt >= MAX_RETRIES) throw new FetchError('HTTP 429 (rate limited) for ' + url + ' after ' + MAX_RETRIES + ' retries');
    const delay = retryDelayMs(attempt, response.headers && response.headers.get ? response.headers.get('retry-after') : null);
    log('HTTP 429 for ' + url + '; retry ' + (attempt + 1) + '/' + MAX_RETRIES + ' in ' + delay + ' ms');
    await sleep(delay);
  }
}

export async function fetchArchiveList(deps) {
  const response = await requestWithRetry(archivesUrl(), deps);
  if (response.status === 404) return null;
  if (!response.ok) throw new FetchError('HTTP ' + response.status + ' from ' + archivesUrl());
  let body;
  try { body = await response.json(); } catch { throw new FetchError('archive list is not valid JSON'); }
  if (!body || !Array.isArray(body.archives) || body.archives.some((item) => typeof item !== 'string')) throw new FetchError('archive list has an unexpected shape');
  return body.archives;
}

export function looksLikePgn(text) {
  return /^\[Event\s+"/m.test(text) && /^\[Link\s+"/m.test(text);
}

// Core flow without file-system writes: resolves to { status, month, text? } where status is fetched | nothing.
export async function fetchMonth(target, deps) {
  const archives = await fetchArchiveList(deps);
  if (!archives || !archives.includes(monthArchiveUrl(target))) return { status: 'nothing', month: target.ym, reason: 'no archive for ' + target.ym };
  const response = await requestWithRetry(monthPgnUrl(target), deps);
  if (response.status === 404) return { status: 'nothing', month: target.ym, reason: 'HTTP 404 for the month PGN' };
  if (!response.ok) throw new FetchError('HTTP ' + response.status + ' from ' + monthPgnUrl(target));
  const text = await response.text();
  if (!text.trim()) return { status: 'nothing', month: target.ym, reason: 'the month PGN is empty' };
  if (!looksLikePgn(text)) throw new FetchError('the response for ' + target.ym + ' does not look like PGN (no Event/Link headers)');
  return { status: 'fetched', month: target.ym, text };
}

function parseArgs(argv) {
  const opts = { month: null, outDir: '.' };
  for (const arg of argv) {
    const match = /^--([a-z-]+)=(.+)$/.exec(arg);
    if (!match) throw new FetchError('unknown or incomplete argument: ' + arg, 2);
    if (match[1] === 'month') opts.month = match[2];
    else if (match[1] === 'out-dir') opts.outDir = match[2];
    else throw new FetchError('unknown argument: ' + arg, 2);
  }
  return opts;
}

function setOutputs(values) {
  if (!process.env.GITHUB_OUTPUT) return;
  appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(values).map(([key, value]) => key + '=' + value + '\n').join(''));
}

export async function run(argv, { now = new Date(), deps = {}, out = console.log } = {}) {
  const opts = parseArgs(argv);
  const target = opts.month ? parseMonth(opts.month) : previousMonth(now);
  assertCompleteMonth(target, now);
  const file = join(opts.outDir, monthFileName(target));
  if (existsSync(file)) {
    out('fetch-oren-month: ' + monthFileName(target) + ' already exists; months are immutable. Nothing to do.');
    return { status: 'exists', month: target.ym };
  }
  const result = await fetchMonth(target, { log: out, ...deps });
  if (result.status === 'nothing') {
    out('fetch-oren-month: nothing to do for ' + target.ym + ' (' + result.reason + ').');
    return result;
  }
  // 'wx' refuses to overwrite: a month file is never replaced.
  let handle;
  try { handle = await open(file, 'wx'); } catch (error) {
    if (error.code === 'EEXIST') { out('fetch-oren-month: ' + monthFileName(target) + ' appeared meanwhile; leaving it untouched.'); return { status: 'exists', month: target.ym }; }
    throw new FetchError('cannot write ' + file + ': ' + error.message);
  }
  try { await handle.writeFile(result.text, 'utf8'); } finally { await handle.close(); }
  out('fetch-oren-month: wrote ' + file + ' (' + Buffer.byteLength(result.text) + ' bytes).');
  return { status: 'fetched', month: target.ym };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await run(process.argv.slice(2));
    setOutputs({ status: result.status, month: result.month });
  } catch (error) {
    console.error('fetch-oren-month: ' + (error && error.message ? error.message : error));
    process.exitCode = error instanceof FetchError ? error.exitCode : 1;
  }
}
