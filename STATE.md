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

### Threat model for `/api/puzzles` (checked by `scripts/check-puzzle-security.mjs`)
- Attacker is a logged-in user (or someone with a stolen cookie). Anonymous callers get 401 before anything else happens.
- Cross-user: every query carries `user_id=eq.<session user>`; another user's puzzle, job or kit is never returned (tested).
- Injection: ids are matched against fixed patterns and quoted before they enter a PostgREST filter; arrays and objects where strings are required give a clean 400.
- Forged results: `solved` is re-checked on the server against the accepted moves; a Rush score must fit the puzzles named and the time (impossible runs are refused). A user can still claim a plausible score for himself: the score is only his own best, there is no public leaderboard.
- Cost abuse: allowlist flag, rate limit per IP and per user (IP rotation does not help), one active job per user, 120 analysed games per user per day, 9 minute budget per run, the background function refuses unrunnable jobs before loading the engine.
- Server-side requests: usernames must match a strict pattern, provider answers can only lead to that user's own archive pages, links stored from providers must be on chess.com or lichess.org.
- Storage growth: attempts (5000), Rush runs (200) and finished jobs (30) are capped per user.
- Puzzle correctness: the move the user actually played is never accepted; alternative moves are re-checked at full puzzle depth.
- Not covered: Supabase and Netlify account security themselves, and the existing auth/session code (not changed here).

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


## Bot campaign: 50 historical-era personas — status updated 2026-10-21

**Status: merged to `main`, CI passed on the merge commit. Manual browser verification remains pending.**

- PR: https://github.com/orenzbit/veyra-chess/pull/11
- Full commit history for the work: https://github.com/orenzbit/veyra-chess/pull/11/commits
- Merged commit: https://github.com/orenzbit/veyra-chess/commit/58aa1857db103d8aefe20f2bcf03fd0d952bb050
- Source branch: `qa/bot-accuracy-loop`
- CI on merge commit: https://github.com/orenzbit/veyra-chess/actions/runs/39646668719 — success.
- Pre-merge PR CI: https://github.com/orenzbit/veyra-chess/actions/runs/39646107307 — success.

### What was integrated
- 50 original fictional chess personas, Elo 100–2550, with tiers, styles, era/region, original quips and opening repertoires.
- Search extracted to `src/bot-engine.ts`; includes terminal checkmate/draw scoring, move ordering, alpha-beta search, side-aware repertoire selection, style bonuses and tiered depth.
- Deterministic benchmark: `scripts/check-bot-accuracy.mjs`, wired into `npm run check:bot-accuracy` and `.github/workflows/verify.yml`.

### Actual verification evidence
From the successful GitHub Actions log for run #229:
- `npm run check:release`: passed. This includes `npm run check`, `npm run check:blindfold`, bot integrity and the release checks.
- `npm run build`: passed.
- `node scripts/build-rules.mjs --check`: passed.
- `npm run check:bot-accuracy`: passed.
- Opening repertoires: 300/300 legal lines.
- Mate in one: 100/100 (100%) across 50 bots and two positions.
- Grandmaster puzzle benchmark: 92/96 (95.8%) across 8 seeded puzzles and 12 grandmaster bots.
- The 95.8% figure is only for this small deterministic puzzle set; it is not full-game accuracy or a measured human-equivalent Elo.

### Verification still outstanding
- No separate local npm run was performed; these command results are from CI.
- No manual browser session was completed for Elo range selection, opening behavior, live move legality, quip/persona UI, console/network errors or mobile layout.
- Netlify site access found in the connected account requires team SSO. A reviewer with authorized browser access must perform the browser checklist before the work is considered fully release-verified.
- CI and these deterministic benchmarks do not prove that each style produces strategically distinct play.

### Full independent-review prompt
Use the full browser/QA prompt in the matching “מנוע הבוטים ובדיקות דיוק” section of `README.md`. It includes commands, Elo ranges, openings for both colors, mate-in-one, style and persona/quips UI, edge cases, evidence requirements and all source links.

### Next action
Ask a reviewer with authorized Netlify/browser access to execute the README prompt and append actual results here. Do not mark manual QA as passed unless the reviewer supplies reproducible evidence. The PR is merged; do not merge it again. Branch cleanup is separate from verification and should only happen after confirming no unique commits remain outside the merged history.

## Chess DNA report (code validation; live schema unverified)
- Plan and first implementation slice: `DNA_IMPLEMENTATION_PLAN.md`.
- New selection/aggregation module: `src/chess-dna.ts`.
- Per-game and report storage endpoint: `netlify/functions/chess-dna.mjs`.
- Required schema additions are documented in `public/data/supabase-schema.sql`; not applied to any live Supabase project.
- Report UI is reachable from the archive via **סקירת DNA** in `src/main.ts`.
- Regression scripts: `scripts/check-chess-dna.mjs`, `scripts/check-chess-dna-server.mjs`; run with `npm run check:chess-dna`.
- Draft PR: https://github.com/orenzbit/veyra-chess/pull/7.
- Status (2026-10-19): GitHub Actions run #178 passed TypeScript/release checks, production build, 28 deterministic real-WASM analyses (7 repeats on each of 4 positions), and a real Chromium board smoke test with two screenshots. The browser run caught and fixed an over-escaped PGN header regex in the account-save path. Still unverified: live authenticated endpoint/database integration, non-production schema migration/rollback, deeper Chess DNA report E2E, and independent engine evaluation fixtures. Schema changes remain unapplied to live Supabase. The user authorized merge after checks pass. Live schema migration and authenticated database integration remain unverified and must not be claimed complete.

## Daily streak feature — implementation in progress

- Plan: `DAILY_STREAK_IMPLEMENTATION.md`.
- Branch: `feature/daily-streak`.
- New API: `netlify/functions/daily-streak.mjs`; core date rules: `netlify/functions/lib/daily-streak.mjs`.
- New migration: `supabase/migrations/20261022000000_daily_streak.sql`; schema reference updated in `public/data/supabase-schema.sql`.
- The feature flag `DAILY_STREAK_ENABLED` defaults off. The SQL migration has not been applied to a live database. Do not enable the flag until the migration is explicitly approved and applied.
- Automated test suite: `npm run check:daily-streak`; CI result and final merge status will be recorded after the PR workflow finishes.
