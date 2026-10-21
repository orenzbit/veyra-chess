# Veyra Puzzles — Project Status

## Project contents
- `src/puzzle/` — TypeScript puzzle modules used by the app: board/FEN, moves, tactics, legality (check, legal moves, checkmate), storage, engine.
- `src/puzzle-page.ts` — the puzzle streak screen (opened from the 🧩 פאזלים button in the app's top bar).
- `src/*.mjs` — JavaScript copies of the same core logic, used by the Node validators (`scripts/check-seed.mjs`).
- `data/puzzle-seed.json` — 24 puzzle records: 12 authored positions and 12 color-flipped mirrors. The build copies it to `dist/data/`.
- `scripts/` — seed builders and validators, preview builder, TypeScript package exporter, session simulation, app-level puzzle check.
- `part1.html`, `part2.html`, `part3.html` — preview source; `preview.html` is their generated interactive page.
- `.github/copilot-instructions.md` — project-specific editing and verification guidance.

## Puzzle streak feature (in the app)
- Solve puzzles in a row; a wrong move resets the streak; the streak milestone shows at 3.
- Pawn promotions ask which piece to promote to.
- Best streak is stored on the device (`localStorage`). Not yet synced to the account.
- Hints in three levels: piece square, target square, then the move.
- Hebrew and English strings are in `src/i18n.ts`.
- Not yet done: adding mistakes from Review as puzzles, storing puzzle progress in the account, more than 24 puzzles.

## Verification
- `npm run check:puzzles` builds the TypeScript and checks the shipped code against the seed (legal moves, king never left in check, mates verified, attempt checking). It is part of `npm run check:release`.
- `py scripts/check_seed.py` and `node scripts/check-seed.mjs` check all 24 records: unique IDs, legal solution moves, the side not to move is never in check, every `missed_mate` solution ends in checkmate, and seed/mirror pairs.
- `py scripts/simulate.py` runs a deterministic sample session using real seed records.
- `py scripts/build_preview.py` rebuilds the interactive preview from its source parts and seed.
- `py scripts/emit_ts.py <new-directory>` exports the TypeScript package and seed. It refuses to overwrite an existing destination.
- Browser test (run outside the repo, because it needs Playwright): open the puzzle page in Chromium, solve three puzzles in a row by dragging, check the streak milestone, make a legal wrong move and check the reset, check best-streak persistence after reload, and check there is no horizontal scroll at 390px. The sandbox cannot reach the CDN, so React is served locally in that test only.
- Both seed builders use the current UTC date for generated records; rebuilding changes the `built`/`createdAt` fields.

## Fixed in the last round
- Two seed positions were illegal (the side not to move was in check). The arabian-mate position is now `k7/4R3/2N5/8/8/8/5PPP/6K1 w` with solution `e7a7`. The validators now reject such positions.
- Move input is locked until the board finishes animating. Drags during an animation used to be lost.
- The phone layout no longer overflows horizontally after a resize.

## Known limits
- The service worker (`public/sw.js`) falls back to `index.html` for any failed request, including scripts. When the CDN is unreachable this returns HTML where a script is expected. Pre-existing; not changed here.
- The archive home page uses its own dark theme; the puzzle screen uses the main app style (black top bar, Apple blue accent), like the bots and game screens.

## Chess DNA report (in progress on feature branch)
- Plan and first implementation slice: `DNA_IMPLEMENTATION_PLAN.md`.
- New selection/aggregation module: `src/chess-dna.ts`.
- Per-game and report storage endpoint: `netlify/functions/chess-dna.mjs`.
- Required schema additions are documented in `public/data/supabase-schema.sql`; not applied to any live Supabase project.
- Report UI is reachable from the archive via **סקירת DNA** in `src/main.ts`.
- Regression scripts: `scripts/check-chess-dna.mjs`, `scripts/check-chess-dna-server.mjs`; run with `npm run check:chess-dna`.
- Draft PR: https://github.com/orenzbit/veyra-chess/pull/7.
- Status (2026-10-19): GitHub Actions run #178 passed TypeScript/release checks, production build, 28 deterministic real-WASM analyses (7 repeats on each of 4 positions), and a real Chromium board smoke test with two screenshots. The browser run caught and fixed an over-escaped PGN header regex in the account-save path. Still unverified: live authenticated endpoint/database integration, non-production schema migration/rollback, deeper Chess DNA report E2E, and independent engine evaluation fixtures. Schema changes remain unapplied to live Supabase. Do not merge/deploy until remaining gates are reviewed, a preview is shown, and the user explicitly approves.


## DNA-powered statistics (stacked feature branch, 2026-10-21)
- Branch: `feature/dna-powered-statistics`, stacked on `feature/chess-dna-review`; do not merge/deploy without the required review and explicit approval.
- Added `src/dna-statistics.ts`, a shared read model that derives general statistics from the saved DNA report. It does not rerun the engine or store a second copy of analysis data.
- Added a separate **📊 סטטיסטיקות** page from the archive. It loads the latest saved report from `/api/chess-dna?action=latest` and summarizes game count, own moves, weighted Accuracy, and move-quality rates by time control.
- Added `scripts/check-dna-statistics.mjs` to verify aggregate math, missing/invalid values, and UI wiring; added it to `npm run check:chess-dna`.
- Blindfold statistics are deliberately not fabricated from ordinary chess games. The current inspected repository has no verified Blindfold-session event source. Next phase must inspect/implement compact session summaries (stage, outcome, duration, timestamp, optional difficulty) and account-scoped persistence, then derive Blindfold stats from those summaries. Do not store every UI event or duplicate Chess DNA analysis.
- Verification status for this branch: code was written through GitHub's file API; local typecheck/build could not run because the execution environment could not resolve GitHub and did not have the target repository checkout. GitHub Actions/PR checks remain required. No live Supabase migration, merge, or deployment was performed.
