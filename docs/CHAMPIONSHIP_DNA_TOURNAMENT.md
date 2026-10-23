# Veyra Chess Championship and Chess DNA

This workflow is deliberately separate from the public application and does not start a full tournament automatically.

## Current design

- The roster is loaded from public/data/bots/index.json; there is no hard-coded roster size.
- A full double round-robin schedules N * (N - 1) games. Each unordered pair plays twice with colors reversed.
- Each oriented pairing has a stable game ID and a deterministic per-game seed derived from the base seed and the two bot IDs.
- Completed games are appended to games.jsonl; summary.json is atomically replaced after each completed game.
- A resumed run must use the same manifest hash, base seed, ply limit, and time control. Invalid/failed checkpoint records are not counted as completed.
- Every game record stores full PGN, final FEN, result, termination reason, move timings, remaining clocks, bot IDs, and seed.
- The audit replays PGN and verifies the final FEN, ply count, result/termination, and schedule coverage.
- The first DNA processor produces descriptive metrics from archived PGNs. It does not claim engine-derived ACPL, move accuracy, or blunder rates.

## Commands

Run the structural contract check:

    npm run check:tournament

Run the approved 20-game smoke batch, audit every PGN, produce descriptive DNA, and verify a 10-position resumable engine-analysis pass:

    npm run tournament:smoke

Benchmark engine-analysis runtime across one complete smoke-game PGN:

    npm run tournament:benchmark-analysis

These commands do not start the full championship. The PR CI runs the same smoke batch and uploads its reports as a temporary workflow artifact.

Continue an interrupted run using the same output directory and options:

    node scripts/run-championship-tournament.mjs --resume --out=artifacts/championship-smoke --max-games=20

Run the full tournament only after explicit approval:

    npm run tournament:run
    npm run tournament:audit
    npm run tournament:dna

### Full move-by-move engine analysis

After a tournament run has been audited, run the resumable analysis pass:

    npm run tournament:analyze

If it is interrupted, continue with the same input and output paths:

    node scripts/analyze-championship-games.mjs --resume

Then create a DNA report that combines descriptive PGN patterns with engine classifications:

    npm run tournament:dna:engine

The analysis cache stores the engine worker, engine glue, WASM, and rules-bundle fingerprints; per-position before/after FEN; best move; classification; depth; score changes; and elapsed time. The processor verifies each analysis against the replayed PGN. Reported chance drop is in percentage points, not centipawns; ACPL is not claimed.

The full pass can involve hundreds of thousands of positions. It is intentionally not run automatically by the 20-game smoke workflow; first use the one-game benchmark to estimate runtime and storage.

## Supabase archive and restore

The archive endpoint is server-side only and requires the Netlify environment variables SUPABASE_URL, SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY), and CHAMPIONSHIP_ARCHIVE_TOKEN. Do not expose these values in browser code or commit them.

Apply the SQL additions in public/data/supabase-schema.sql to Supabase before enabling archive calls. Configure CHAMPIONSHIP_ARCHIVE_URL as the HTTPS URL of the deployed championship-archive function and CHAMPIONSHIP_ARCHIVE_TOKEN as the same random secret configured on Netlify.

After the run and DNA report exist locally:

    npm run tournament:archive

Restore a run from Supabase as the source of truth:

    npm run tournament:restore -- --run-id=PASTE_RUN_ID_HERE --out=artifacts/restored-championship

The archive client uploads the run summary, full PGN records in bounded batches, and the full DNA report. The restore client downloads all archived game records and writes games.jsonl, summary.json, and dna-report.json. Run the audit after restoration before using the files.

### GitHub archive copy

The optional GitHub archive stores each run on a separate archival branch (default: championship-archive), without merging tournament data into main. It writes summary.json, dna-report.json, a checksummed index, and bounded JSONL chunks of completed games.

Configure GITHUB_REPOSITORY as owner/repo and CHAMPIONSHIP_GITHUB_TOKEN with repository contents write access. For restore, the token needs read access. CHAMPIONSHIP_GITHUB_ARCHIVE_BRANCH can override the branch name.

    npm run tournament:archive-github
    npm run tournament:restore-github -- --run-id=PASTE_RUN_ID_HERE --out=artifacts/restored-championship-github

Supabase remains the primary restore source; the GitHub archive is a second durable copy. Verify restored data with the tournament audit before using it.

## Scale

For 82 bots, the full double round-robin contains 6,642 games and 3,321 unique unordered pairs. Each bot plays 81 games. This count is derived from the roster and must be recalculated if the roster changes.

## Acceptance gates before a full run

1. Add and validate the final roster; confirm IDs are unique and all required profile fields are present.
2. Run a 20-game smoke batch and audit PGN replay, final FEN, result, and clock metadata.
3. Measure runtime of game simulation and the proposed engine-analysis pass on representative games.
4. Test interruption/resume and confirm that no game is counted twice.
5. Define and benchmark the engine-analysis methodology before publishing accuracy, ACPL, blunder, or strategic-quality metrics.
6. Archive all full PGNs and reports durably. Git history/artifacts alone are not a substitute for a verified external backup; Supabase persistence requires a separately implemented and tested server-side writer, schema, credentials, and restore drill.
7. Run the full tournament and publish results only after explicit approval.

## Known limitations

- Existing bot profile Elo values are profile parameters, not tournament Elo. This workflow does not update ratings.
- The current DNA report is descriptive. Engine-based move-quality analysis is a separate phase and must record engine version, depth/node limits, and analysis schema version.
- A deterministic seed controls Math.random used by the current bot chooser; it does not guarantee byte-for-byte reproducibility across changed code, engine versions, or runtime environments.
- The runner currently writes local files. It does not yet persist to Supabase or GitHub automatically.
- Runtime estimates must be measured; the theoretical game count is not a runtime guarantee.
