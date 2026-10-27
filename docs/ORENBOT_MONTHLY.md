# Oren bot: monthly PGN update (F30)

Manual, local update of Oren's bot data from `orenzbit-YYYY-MM.pgn` files that the owner supplies.
There is no network access, no scheduled job, and no deploy. Nothing is committed automatically.

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

## Open items

- The first real bootstrap waits for `scripts/build-oren-bot.mjs` and `scripts/check-oren-bot.mjs`.
  Until `check-oren-bot.mjs` exists, every promotion exits 11 (fail closed).
- No schedule exists. Any future scheduled job needs the owner's approval first.
- `artifacts/` is not in `.gitignore`. Adding it is a shared-file change that needs approval.
