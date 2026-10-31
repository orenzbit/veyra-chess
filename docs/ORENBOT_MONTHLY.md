# Oren bot: monthly PGN update (F30)

Update of Oren's bot data from `orenzbit-YYYY-MM.pgn` files. The manual pipeline below works on local files the
owner supplies: no network access, no deploy, nothing committed automatically. The separate scheduled workflow
(see "Automatic monthly run") fetches the month files itself and only ever opens a pull request.

## Commands

```
node scripts/oren-monthly-update.mjs --pgn-dir=. --bootstrap --dry-run   # first look, no writes
node scripts/oren-monthly-update.mjs --pgn-dir=. --bootstrap             # first run only
node scripts/oren-monthly-update.mjs --pgn-dir=. [--dry-run]             # later months
node scripts/check-oren-monthly.mjs                                      # F30 acceptance checks
```

`--root=<dir>` moves the whole layout (used by the checks). `--builder=` and `--bot-check=` replace the
default scripts (used by the checks with test doubles).

## Inputs

- Month files: `orenzbit-YYYY-MM.pgn` in `--pgn-dir`. Other names that start with `orenzbit` and end in
  `.pgn` must be byte-identical copies of a canonical file (for example `orenzbit-2026-04 (1).pgn`), which
  are counted once and recorded as duplicates. Anything else exits 10.
- Public base manifest: `public/data/bots/index.json` (read only by the pipeline; the builder writes only to staging).
- State, created by `--bootstrap` only: `data/oren-pipeline/split-ledger.json`, `provenance.json`, `last-good.json`, `runs.json`.

## Builder contract (`scripts/build-oren-bot.mjs`, bot plan §5.2)

```
node scripts/build-oren-bot.mjs --pgn-dir=<dir> --base-index=public/data/bots/index.json --out=<staging> --split-ledger=data/oren-pipeline/split-ledger.json --report=<staging>/report.json --data-version=<N>
```

- `--split-ledger` is omitted on bootstrap only.
- Outputs in `--out`: `orenzbit.json` (the profile, named `<id>.json`), `index.json` (one bot entry changed), `report.json`.
- Builder exit codes: 0 ok, 1 unexpected, 2 validation, 3 input, 4 ledger conflict, 5 identity collision.

## Pipeline exit codes

| Code | Meaning |
|---|---|
| 0 | Done (promoted, bootstrapped, unchanged, or dry-run passed) |
| 1 | Unexpected error, or builder file not found. Nothing public changed. |
| 10 | Input rejected: bad or non-canonical file name, edited or removed ingested month, missing header tag, duplicate Link, text outside a game, state files missing or invalid |
| 11 | Candidate rejected: holdout leak, ledger tampered, game lost, file counts changed, profile or index mismatch, bot checker failed or missing |
| 12 | Promotion failed; backup restored (last good data is back) |
| 20 + x | Builder exited x (x = 1..5) |

On any non-zero exit the public bot files (`public/data/bots/orenzbit.json`, `index.json`) and the state files
(`split-ledger.json`, `provenance.json`, `last-good.json`) do not change. The one exception is `runs.json`,
an append-only log that records failed runs too.

## Rules

- Monthly files are immutable: an ingested month whose SHA-256 changes exits 10.
- A game keeps its split forever. The split ledger is append-only and checked by hash on every run.
- The builder must never train on holdout games. The pipeline rejects a candidate whose report, profile
  `holdoutGameKeys`, or ledger disagree with the chunk rule (`chunkIdx % 10 === 0` is holdout).
- Version: `version` rises by 1 only when the month set changes, or when the builder output changes at the
  same months. It equals `dataVersion` in the profile. A dry run does not change it.
- Staging is `artifacts/oren-monthly/staging-<runId>/` and is removed only after success. Failed or dry-run
  stagings stay for diagnosis. Promotion backups are in `artifacts/oren-monthly/backup-<runId>/`.
- `artifacts/` is runtime output and is not committed.

## Automatic monthly run

Workflow: `.github/workflows/oren-monthly.yml` ("Oren monthly update"). The owner approved fetching the
account's own games (`orenzbit`) from the Chess.com public API inside GitHub Actions. No secrets are needed.

- Triggers: `schedule` on the 3rd of each month at 03:00 UTC (previous complete UTC month), and
  `workflow_dispatch` with an optional `month` input (`YYYY-MM`, must be a finished month). Only runs on `main`
  (a manual run from another branch is skipped). A `concurrency` group (`oren-monthly`) prevents overlapping runs.
- Permissions: `contents: write` and `pull-requests: write`, nothing else. It uses the built-in `GITHUB_TOKEN`.
- Steps:
  1. `scripts/fetch-oren-month.mjs` reads `https://api.chess.com/pub/player/orenzbit/games/archives`, then
     `.../games/YYYY/MM/pgn`, with a descriptive `User-Agent`. 404, a month missing from the list, or an empty
     month means "nothing to do" (exit 0, no PR). 429 is retried with backoff (3 retries at most). Any other
     error fails the run. `orenzbit-YYYY-MM.pgn` is written only if it does not exist (months are immutable).
  2. `scripts/build-oren-bot.mjs --pgn-dir=. --base-index=public/data/bots/index.json --out=<runner temp> --report=<...>`
     runs in **staging mode**: the profile and the manifest are written to a temp directory, never to
     `public/data/bots/`. The builder reads only the committed rules bundle, so `npm run build` is not needed.
  3. `scripts/check-oren-bot.mjs` checks the staged profile against the staged manifest and the PGN files.
     This is why the pending "show Oren in the bot list" decision does not block the workflow: the real
     `public/data/bots/index.json` has no Oren entry, and the workflow never adds one.
  4. Only `public/data/bots/orenzbit.json` is copied from staging. `scripts/oren-monthly-summary.mjs` then
     verifies holdout separation (every report row follows `chunkIdx % 10 === 0`, profile counts equal report
     counts, no game is both holdout and training, every earlier holdout game is still holdout) and writes
     the PR body with the holdout counts from the builder report. `scripts/check-oren-monthly-workflow.mjs` runs last.
  5. The workflow creates a new branch `bot/oren-monthly-YYYY-MM`, commits the new PGN and the regenerated
     profile, pushes **that branch only** and opens a PR to `main` with `gh pr create`.
- It never pushes to `main`, never force-pushes and never merges. If the branch already exists on origin, or
  nothing changed, it stops without a PR. A human reviews and merges.
- The pipeline's split ledger (`data/oren-pipeline/`) is not used by the workflow: the pipeline would promote
  `index.json` with an Oren entry. Split stability is guaranteed instead by immutable month files, the fixed
  chunk rule and the earlier-holdout check above.
- `data-version` is not passed, so `dataVersion` stays unset, as in the committed profile.
- Repository setting needed: Settings → Actions → General → "Allow GitHub Actions to create and approve pull
  requests". PRs opened with `GITHUB_TOKEN` do not start other workflows; run `Verify project` manually or push an
  empty commit from a normal account if checks are required.
- First real run: only after this workflow is merged to `main`, through **Actions → Oren monthly update → Run
  workflow** (`workflow_dispatch`, optionally with `month`). It has never been run against the real API before that.
- Offline check (no network): `node scripts/check-oren-monthly-workflow.mjs`, part of `npm run check:contracts`.

## Open items

- The first real bootstrap waits for `scripts/build-oren-bot.mjs` and `scripts/check-oren-bot.mjs`.
  Until `check-oren-bot.mjs` exists, every promotion exits 11 (fail closed).
- Showing Oren in the bot list (`public/data/bots/index.json`) is a separate pending decision.
- `artifacts/` is not in `.gitignore`. Adding it is a shared-file change that needs approval.
