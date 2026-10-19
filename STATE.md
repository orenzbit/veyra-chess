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

## Personal puzzles and Puzzle Rush (built, switched off)
Status: code is in the repo and tested; it is **off** in production until the owner approves three live steps (below).
- Server (Netlify Functions, `netlify/functions/`): `puzzles.mjs` (`/api/puzzles`: state, checkpoint, kit, dna, job, remove, refill), `puzzle-refill-background.mjs`, and `lib/puzzle-{config,sources,harvest,jobs,kits,store,service}.mjs`, `lib/engine-node.mjs` (+ generated `wasm-engine.gen.mjs`). Engine: `public/vendor/chessy-ai-fast.wasm`.
- What it does: DNA = analyse the user's own games (Chess.com / Lichess / saved) in the background, keep mistakes from any phase as puzzles (pool about 100, cap 150), kits of 15 (training) and 30 (Rush), spaced repetition (1, 3, 7, 14, 30 days), results saved to the account, never analyses on app open.
- Client (`src/puzzle/`): `api`, `outbox` (offline queue), `data` (hub), `rush` (state machine), `board-view`, `personal-view`, `rush-view`; `src/puzzle-page.ts` has three tabs: training, Rush, streak.
- Database: 6 new tables in `public/data/supabase-schema.sql` (RLS on, service_role only). **Not applied to Supabase yet.**
- Flags: `PUZZLES_SERVER_ENABLED` and `PUZZLES_ALLOWLIST` (both unset = feature disabled, the app shows "not opened yet" and the old streak keeps working).
- Added during the build (not in the original plan): `refill` action on `/api/puzzles`.
- Checks: `npm run check:puzzles` (includes `check:puzzles-engine`, about 2.5 minutes). Optional browser test: `REACT_UMD_DIR=<dir with react@18.2.0 and react-dom@18.2.0 in node_modules> node scripts/e2e-puzzles.mjs` (needs Playwright; 31 checks).
- Waiting for the owner, in this order: (1) approve the SQL migration, (2) approve a probe of the Netlify background function (WASM packaging, speed, provider access), (3) approve enabling the flag for his account only. Not yet verified live: Netlify runtime and credit cost, real puzzles-per-game yield, GitHub Actions result.
- Known: `scripts/check-account-bilingual.mjs` fails on a missing `signup` action; it failed before this work and is not part of CI.

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
