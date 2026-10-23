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

Run a small smoke batch (not the full championship):

    npm run tournament:run -- --max-games=20 --out=artifacts/championship-smoke
    npm run tournament:audit -- --input=artifacts/championship-smoke/games.jsonl --summary=artifacts/championship-smoke/summary.json
    npm run tournament:dna -- --input=artifacts/championship-smoke/games.jsonl --out=artifacts/championship-smoke/dna-report.json

Continue an interrupted run using the same output directory and options:

    node scripts/run-championship-tournament.mjs --resume --out=artifacts/championship-smoke --max-games=20

Run the full tournament only after explicit approval:

    npm run tournament:run
    npm run tournament:audit
    npm run tournament:dna

## Supabase archive and restore

The archive endpoint is server-side only and requires the Netlify environment variables SUPABASE_URL, SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY), and CHAMPIONSHIP_ARCHIVE_TOKEN. Do not expose these values in browser code or commit them.

Apply the SQL additions in public/data/supabase-schema.sql to Supabase before enabling archive calls. Configure CHAMPIONSHIP_ARCHIVE_URL as the HTTPS URL of the deployed championship-archive function and CHAMPIONSHIP_ARCHIVE_TOKEN as the same random secret configured on Netlify.

After the run and DNA report exist locally:

    npm run tournament:archive

Restore a run from Supabase as the source of truth:

    npm run tournament:restore -- --run-id=championship-<timestamp>-<manifest-hash> --out=artifacts/restored-championship

The archive client uploads the run summary, full PGN records in bounded batches, and the full DNA report. The restore client downloads all archived game records and writes games.jsonl, summary.json, and dna-report.json. Run the audit after restoration before using the files.

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
