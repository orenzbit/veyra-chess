#!/usr/bin/env node
// Verifies holdout separation for the monthly Oren update and writes the pull-request body.
// Pure file work, no network.
//   node scripts/oren-monthly-summary.mjs --report=<report.json> --before=<old orenzbit.json> --after=<new orenzbit.json> --month=YYYY-MM --out=<body.md>
// Exit codes: 0 ok · 1 holdout separation broken or unreadable input · 2 bad arguments.
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const HOLDOUT_MODULUS = 10;

// Returns a list of human-readable problems; an empty list means holdout separation is intact.
export function verifyHoldout(report, before, after) {
  const problems = [];
  if (!report || report.exit !== 0 || !report.totals) return ['the builder report is missing or does not describe a successful build'];
  const { totals } = report;
  const games = Array.isArray(report.games) ? report.games : [];
  for (const game of games) {
    const expected = game.chunkIdx % HOLDOUT_MODULUS === 0 ? 'holdout' : 'training';
    if (game.split !== expected) problems.push('game ' + game.key + ' has split ' + game.split + ' but the chunk rule says ' + expected);
  }
  const holdoutRows = games.filter((game) => game.usable && game.split === 'holdout');
  const trainingRows = games.filter((game) => game.usable && game.split === 'training');
  if (holdoutRows.length !== totals.holdout) problems.push('report holdout total ' + totals.holdout + ' differs from the ' + holdoutRows.length + ' holdout game rows');
  if (trainingRows.length !== totals.training) problems.push('report training total ' + totals.training + ' differs from the ' + trainingRows.length + ' training game rows');
  if (after.holdoutGameCount !== totals.holdout) problems.push('profile holdoutGameCount ' + after.holdoutGameCount + ' differs from the report total ' + totals.holdout);
  if (after.trainingGameCount !== totals.training) problems.push('profile trainingGameCount ' + after.trainingGameCount + ' differs from the report total ' + totals.training);
  const afterHoldout = new Set(after.holdoutGameKeys || []);
  if (afterHoldout.size !== totals.holdout) problems.push('profile holdoutGameKeys has ' + afterHoldout.size + ' unique keys, expected ' + totals.holdout);
  const trainingKeys = new Set(trainingRows.map((game) => game.key));
  for (const key of afterHoldout) if (trainingKeys.has(key)) problems.push('holdout game ' + key + ' is also a training game');
  // A game keeps its split forever: every earlier holdout game must still be holdout, none may become training.
  if (before && Array.isArray(before.holdoutGameKeys)) {
    for (const key of before.holdoutGameKeys) {
      if (!afterHoldout.has(key)) problems.push('earlier holdout game ' + key + ' is no longer holdout');
    }
  }
  return problems;
}

export function buildBody({ month, report, before, after, runUrl = '' }) {
  const { totals } = report;
  const monthFile = 'orenzbit-' + month + '.pgn';
  const row = report.files.find((file) => file.name === monthFile);
  const beforeHoldout = before && Number.isInteger(before.holdoutGameCount) ? before.holdoutGameCount : null;
  const beforeTraining = before && Number.isInteger(before.trainingGameCount) ? before.trainingGameCount : null;
  const lines = [
    '## Oren bot monthly update — ' + month,
    '',
    'Automatic pull request from the `Oren monthly update` workflow. It only adds the new month file and regenerates `public/data/bots/orenzbit.json`. **Review it before merging; nothing is merged automatically.**',
    '',
    '### Holdout counts (from the builder report)',
    '',
    '| | Before | After | This month |',
    '|---|---:|---:|---:|',
    '| Holdout games | ' + (beforeHoldout ?? 'n/a') + ' | ' + totals.holdout + ' | ' + (row ? row.holdout : 'n/a') + ' |',
    '| Training games | ' + (beforeTraining ?? 'n/a') + ' | ' + totals.training + ' | ' + (row ? row.training : 'n/a') + ' |',
    '| Usable games | ' + (before && Number.isInteger(before.sourceGameCount) ? before.sourceGameCount : 'n/a') + ' | ' + totals.usable + ' | ' + (row ? row.usable : 'n/a') + ' |',
    '',
    '- Holdout rule: a game is holdout when its chunk index in its month file is divisible by 10 (`chunkIdx % 10 === 0`); every other game is training.',
    '- Verified by `scripts/oren-monthly-summary.mjs`: every report row follows the rule, the profile counts equal the report counts, no holdout game is also a training game, and every earlier holdout game is still holdout (earlier holdout games before: ' + (beforeHoldout ?? 'n/a') + ').',
    '- Builder totals: ' + totals.canonicalFiles + ' month files, ' + totals.games + ' games, ' + totals.short + ' short, ' + totals.replayFailed + ' replay failures, ' + totals.notPlayer + ' not the account, ' + totals.ledgerConflicts + ' ledger conflicts.',
    '',
    '### What changed',
    '',
    '- `' + monthFile + '` — new immutable month file from the Chess.com public API (`orenzbit`).',
    '- `public/data/bots/orenzbit.json` — regenerated profile (builder run in staging mode).',
    '- `public/data/bots/index.json` is **not** touched: showing Oren in the bot list is a separate pending decision.',
    '',
    'Checks run by the workflow: `scripts/check-oren-bot.mjs` against the staged profile and staged index, the holdout verification above, and `scripts/check-oren-monthly-workflow.mjs`.',
  ];
  if (runUrl) lines.push('', 'Workflow run: ' + runUrl);
  return lines.join('\n') + '\n';
}

function parseArgs(argv) {
  const opts = {};
  for (const arg of argv) {
    const match = /^--([a-z-]+)=(.+)$/.exec(arg);
    if (!match) throw Object.assign(new Error('unknown or incomplete argument: ' + arg), { exitCode: 2 });
    opts[match[1]] = match[2];
  }
  for (const key of ['report', 'before', 'after', 'month', 'out']) {
    if (!opts[key]) throw Object.assign(new Error('--' + key + '=<value> is required'), { exitCode: 2 });
  }
  if (!/^\d{4}-\d{2}$/.test(opts.month)) throw Object.assign(new Error('--month must be YYYY-MM'), { exitCode: 2 });
  return opts;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const opts = parseArgs(process.argv.slice(2));
    const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
    const report = await readJson(opts.report);
    const before = await readJson(opts.before).catch(() => null);
    const after = await readJson(opts.after);
    const problems = verifyHoldout(report, before, after);
    if (problems.length) {
      console.error('oren-monthly-summary: holdout separation check FAILED:\n- ' + problems.slice(0, 20).join('\n- '));
      process.exitCode = 1;
    } else {
      const runUrl = process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
        ? process.env.GITHUB_SERVER_URL + '/' + process.env.GITHUB_REPOSITORY + '/actions/runs/' + process.env.GITHUB_RUN_ID : '';
      await writeFile(opts.out, buildBody({ month: opts.month, report, before, after, runUrl }), 'utf8');
      console.log('oren-monthly-summary: holdout separation intact (' + report.totals.holdout + ' holdout, ' + report.totals.training + ' training); wrote ' + opts.out);
    }
  } catch (error) {
    console.error('oren-monthly-summary: ' + error.message);
    process.exitCode = error.exitCode || 1;
  }
}
