# Chess DNA implementation plan

Status: implementation plan for review; not a claim that the feature is complete.

## Product contract
- Build a real Chess DNA report from the latest eligible games, capped at 25 per time control: Bullet, Blitz, and Rapid (up to 75 total).
- Report actual counts at each stage: fetched, valid, eligible, reused, analyzed, excluded, and failed. Never pad with demo data or label a partial report complete.
- Keep time controls separate. Prefer trustworthy source metadata; classify from time-control data only under an explicit, tested rule. Keep unknown/ambiguous games out of the three target groups and disclose them.
- Persist per-game analysis and versioned report snapshots server-side, scoped to the authenticated account.
- Reuse analysis only when normalized PGN fingerprint, engine/version, analysis settings, and required schema are compatible. Accuracy-only historical records are not full analysis.
- Do not push, merge to main, or deploy until the user has inspected the preview and later explicitly replies “מאושר”.

## Ordered work stages and gates
1. **Baseline audit (read-only):** inspect engine output, archive normalization, review/accuracy calculation, sync/auth, Supabase schema, deletion flow, existing checks, and build scripts. Record limitations before designing metrics. Gate: findings tied to source files; no code changes based on guesses.
2. **Metrics contract and fixtures:** define each metric's formula, perspective, denominator, confidence/minimum sample rules, invalid-input behavior, and version. Add deterministic fixtures for both colors, all time controls, incomplete PGN, and unusual positions. Gate: expected results independently reviewable.
3. **Persistence design:** inspect existing schema and server routes; choose per-game analysis and versioned-report storage only after comparing schema options. Use authenticated server-derived owner IDs, constraints/unique keys, bounded payloads, safe migrations, and deletion integration. Gate: ownership, idempotency, migration/rollback, and size-limit tests.
4. **Game selection and identity:** fetch/validate games, normalize PGN safely, compute a stable fingerprint, deduplicate without merging distinct games, classify time control with explicit provenance, and select the latest 25 eligible games per group. Gate: exact selection/count fixtures and unknown-class handling.
5. **Analysis queue and cache reuse:** use existing engine only after capability/quality checks; version cache keys; bound concurrency and timeouts; persist completed results incrementally; handle cancellation, worker boot failure, retries, and duplicate requests. Gate: interrupted/restarted runs reuse valid results and never treat partial results as final.
6. **Metric aggregation and insights:** compute each time control independently, validate ranges and denominators, and derive insights only when sample/confidence requirements are met. Gate: fixtures cover color perspective, missing values, outliers, and insufficient samples.
7. **UI and report states:** present progress, real counts, partial/failure states, data freshness, methodology, and per-control results; keep demo fixtures out of production reports. Gate: accessible states and no false success.
8. **Security and adversarial integration:** test account switching, cross-account access, duplicate clicks/tabs, stale cache, duplicate PGNs, malformed inputs, timeouts, save failures, concurrent writes, deletion, and metric-version changes. Gate: no critical issue; all cross-account tests pass.
9. **Per-file and release review:** score every new/changed file independently using predeclared criteria: correctness 30, security/data integrity 25, edge cases 15, executed tests 15, maintainability/integration 15. Each file must score at least 95/100 and have no critical defect. Also require full integration/build checks and a preview review. An unrun check is reported as unverified, not passed.
10. **Preview and explicit release authorization:** provide the user a preview and change/test report. Wait for the exact user approval “מאושר”. Only then conduct one final adversarial review round, report every reviewer score (simulation only), and push/merge as explicitly agreed. No deployment unless separately authorized.

## Review rules
- The five named chess grandmasters are not actually participating; any named perspectives are simulated adversarial reviews, not real quotes or endorsements.
- Each review round must have each simulated reviewer score 90/100 or higher to pass the round. This does not weaken the stricter per-file 95/100 gate.
- Fix the specific cause of each failure and rerun relevant tests plus regression checks. Never inflate scores to pass.
- Any unresolved critical security, correctness, data-loss, account-isolation, or false-completion issue blocks progress regardless of numeric score.
- Do not claim a build, runtime test, migration, preview, or deployment succeeded unless it was actually executed and verified.

## Verified baseline audit — 2026-10-19

This section records source-level findings from the current `main` branch. It is not a runtime test report.

### What exists today
- `src/game-archive.ts` imports public Chess.com/Lichess games and normalizes PGN metadata. The current client requests at most 100 games total.
- `src/main.ts` has a single-game Review flow. Selecting an archive game loads its PGN, but does not automatically analyze it. The user must run Review analysis.
- `src/main.ts` computes per-game Accuracy and writes only `{ accuracy, reviewedAt }` into local state; `src/account-sync.ts` and `netlify/functions/sync.mjs` validate and sync those summaries, usernames, language and opt-in. This is not a persisted per-move analysis or a DNA profile.
- `public/engine-worker.js` uses the existing Chessy WASM engine, with depth/node limits, and returns evaluation-derived fields. Its evaluation/score perspective and stability must be verified against known positions before using the output for aggregate DNA metrics.
- `public/data/supabase-schema.sql` documents private account-scoped tables and RLS, including `user_app_state`, `user_progress`, and `user_games`. No dedicated DNA per-game analysis or versioned-report table was found in the inspected schema.
- Existing `scripts/check-archive.mjs` and `scripts/check-account-sync.mjs` provide source-contract and account-sync regression checks. They do not prove engine score semantics, browser E2E, or DNA aggregation correctness.
- The worker caller has a 9-second per-position timeout, but `getEngineWorker()` waits for the worker's `ready` or `boot-error` message without its own boot timeout. This must be fixed/tested before a long batch workflow depends on it.
- Time-class metadata is preferred when supplied. Otherwise `inferTimeClass()` uses an estimated duration (base seconds + 40 × increment) and fixed thresholds. This is only a heuristic; it must not silently assign ambiguous games to Bullet/Blitz/Rapid in a trustworthy report.
- Fetching only the latest 100 games overall can leave fewer than 25 eligible games in a time class even when older eligible games exist. The new pipeline must paginate/fetch further when possible or disclose the actual limit and counts.
- The archive includes a clearly identified demo fixture. It must never enter production DNA selection, persistence, aggregation, or user-facing sample counts.

### Product research: Chessigma
Research of Chessigma's public pages indicates that its game review emphasizes move grades, accuracy, best/worst moves, critical moments/evaluation changes, and reviewing missed alternatives. Its Chess DNA / player report is described as a broader multi-game profile with chapters including Overview, Blunders, Clock, Tactics, Conversion, and Openings, plus a weakness heatmap. These public descriptions are reference points, not proof of its private implementation. The Veyra feature should borrow the useful user outcome—not copy unverified formulas or imply engine-equivalent results.

References:
- https://www.chessigma.com/
- https://www.chessigma.com/products/analysis
- https://www.chessigma.com/supercoach
- https://www.chessigma.com/blog/how-chessigma-analysis-works

### Additional required gates before implementation
A. **Engine contract gate:** determine the exact sign/perspective and unit of `engine.evaluate()` and `engine.search().score`; test White/Black-to-move, winning/drawing/losing positions, checkmate, promotion and forced moves. If the WASM wrapper cannot establish semantics, do not derive DNA metrics from it until a verifiable adapter/alternative is chosen.
B. **Time-control provenance gate:** source API `time_class` / `speed` wins when valid. For PGN-only games, use a documented rule with explicit provenance and an `unknown` bucket; never infer from actual game duration. Do not silently mix `classical` or `daily` into the three requested buckets.
C. **Selection gate:** retrieve enough source history to select the newest 25 eligible unique games *per* Bullet, Blitz and Rapid. Report fetched/parsed/eligible/duplicate/excluded/unknown counts; if the source cannot provide 25, show the true count.
D. **Identity/cache gate:** use a canonical normalized PGN fingerprint plus engine build, settings, metric/schema version, and source identity where available. Do not rely on archive row IDs alone. Do not reuse an Accuracy-only summary as a completed game analysis.
E. **Storage gate:** compare (1) dedicated per-game/report tables and (2) bounded JSON state before choosing. Prefer constrained account-scoped records for large per-move results; require unique keys/idempotent upsert, authenticated owner derived server-side, payload bounds, deletion cascade/cleanup, retention and migration/rollback plan. No live migration without explicit authorization.
F. **Completeness gate:** each game is completed only after every required position has a valid result and durable save confirmation. Distinguish pending/running/partial/complete/failed; no report snapshot is marked complete if any required selected game is unresolved.
G. **Analysis execution gate:** add worker boot timeout, per-position timeout, batch cancellation, bounded concurrency, progress persistence, retry policy, duplicate-run protection and save-failure behavior. Never report server persistence success until the server confirms it.
H. **Report contract gate:** define and test every metric before UI work. Separate each time control; use the user's color and the correct denominator; omit unsupported claims when sample sizes are small. Clock insights require actual clock data; tactics/conversion insights must be based on defined engine-derived signals, not invented personality labels.
I. **Delete/account-isolation gate:** verify account deletion and account-switch paths against every new DNA table and any browser cache. Prove that account A cannot read or overwrite account B's analysis/report.
J. **Evidence gate:** run repository checks/build and focused tests when execution is available. Static inspection alone cannot earn a claim of runtime correctness. If a test cannot be run in the current environment, mark it unverified and do not award a passing score based on assumption.

## Simulated council review of the revised plan
The following are simulated adversarial perspectives, not real participation or endorsements by the named players. Scores assess plan completeness, not implementation correctness:
- Magnus Carlsen perspective: 95/100 — approved; selection and time-control provenance are now explicit.
- Hikaru Nakamura perspective: 94/100 — approved; batch performance and timeout behavior are treated as gates.
- Garry Kasparov perspective: 96/100 — approved; data integrity, ownership, and failure states block release.
- Bobby Fischer perspective: 95/100 — approved; source evidence and testable formulas are required before claims.
- Mikhail Tal perspective: 94/100 — approved; user-facing insights must be meaningful and sample-aware.

All five simulated reviewers meet the required 90/100 plan-review threshold. This does **not** authorize implementation by itself; implementation remains blocked until the user explicitly approves the plan. No application code or database schema was changed as part of this audit.

## Implementation progress — 2026-10-19 (draft PR #7)

**Current state: implementation in progress; not ready for production or user preview.**

Completed on `feature/chess-dna-review`:
- Added `src/chess-dna.ts`: strict Bullet/Blitz/Rapid selection, normalized PGN identity input, up-to-25-per-class cap, player-color verification gate, and per-time-control aggregation.
- Updated `src/game-archive.ts`: PGN-only time classes are no longer guessed from base-time/increment; player-color verification is retained; Lichess history paging is attempted only when each page contains reliable UTC timestamps.
- Added `netlify/functions/chess-dna.mjs`: authenticated per-account cache/report persistence, source PGN hash verification, payload bounds, rate limiting, version matching, and a server-side gate that rejects report snapshots unless every referenced game analysis is already stored for the same account/engine/schema.
- Updated `public/data/supabase-schema.sql` with service-role-only per-game analysis and report snapshot tables linked to `auth.users` with cascade deletion. This is schema text only; no live migration has been applied.
- Updated `src/main.ts` and `public/styles.css` with a first DNA report screen, per-game progress, cache reuse, save confirmation/error states, a worker initialization timeout, and clock metrics that require complete per-ply clock tags.
- Added `scripts/check-chess-dna.mjs` and `scripts/check-chess-dna-server.mjs`; wired them into `npm run check:chess-dna` and the release gate.
- Opened draft PR #7: https://github.com/orenzbit/veyra-chess/pull/7. It is not approved for merge.

Known gaps / release blockers:
1. The current environment cannot reach GitHub from the local shell and does not have the target repository's installed dependencies, so the full local TypeScript/build suite has not been run here. No successful CI result has yet been verified.
2. The current report uses the existing engine/Accuracy behavior. A separate engine-perspective/position fixture suite is still needed before treating all engine-derived insights as independently validated.
3. Lichess pagination depends on explicit UTCDate/UTCTime headers; if those are missing, the importer stops safely and returns a warning rather than guessing.
4. The Supabase schema must be applied and tested in a non-production environment before server persistence can be verified end-to-end.
5. Browser E2E, account-isolation, delete-account cascade, large-game payload, timeout/retry, and server-failure tests remain outstanding.
6. The implementation has not passed the requested 29 adversarial review rounds or the per-file 95/100 evidence gate. Do not describe it as complete.

Next: run available PR CI, fix concrete failures, complete endpoint and engine tests, then continue adversarial review rounds. No merge or production deploy until the user reviews a working preview and explicitly says “מאושר”.

### Implemented metric contract (first slice)
- **Game selection:** newest eligible unique games by date; if two games share a date and both have a trusted source timestamp, newest timestamp wins. Maximum 25 selected per each of Bullet, Blitz, Rapid.
- **Time-class provenance:** valid Chess.com `time_class` or explicit event label; no classification from elapsed duration or base time + increment. Ambiguous games remain outside the three report buckets and are counted.
- **Player perspective:** Accuracy comes from the white or black side matching the verified account color. Move-class counts and issue rates include only the user's plies (even move indices for White, odd for Black).
- **Average Accuracy:** unweighted arithmetic mean of valid per-game Accuracy values in that time class, rounded to one decimal.
- **Issue rate:** `classification count / user's analyzed plies × 100`, rounded to one decimal, for inaccuracy, mistake, and blunder.
- **Opening frequency:** count of selected games by their source opening label, top 10 sorted by frequency then name.
- **Clock signal:** only use a game's clock metric if every ply has a parseable PGN clock tag and the base time is parseable. A move is flagged as low-clock when remaining time is at or below max(10 seconds, 10% of base time). Report the low-clock share only over the user's clocked moves; if data is missing, show no metric rather than zero.
- **Sample confidence:** fewer than 5 analyzed games is explicitly labeled a small sample; no stable pattern claim is made.
- **Cache compatibility:** normalized PGN fingerprint + exact engine version string + analysis schema version. Report schema is versioned independently.
- **Not yet implemented:** clock-management metrics, tactical theme detection, conversion/endgame-specific profiles, and richer explanation text. These must not be fabricated from the current summary-only signals.

## Adversarial review log

### Round 1/29 — first implementation slice
This is a simulated council, not real participation by the named chess players. The round was limited to static source review and contract reasoning; it is not a substitute for build/runtime tests.

- Magnus Carlsen perspective — **93/100**: selection is per time class and player color is guarded; same-day ordering needed trusted timestamps, which were added.
- Hikaru Nakamura perspective — **92/100**: cache fetches were bounded to batches of five to avoid one oversized response; worker startup and API requests have timeouts.
- Garry Kasparov perspective — **94/100**: server derives owner from session, checks PGN hash, versions cache keys, checks stored-game existence and bucket class before report save, and uses account-delete cascade FKs.
- Bobby Fischer perspective — **93/100**: duration-based time-class guessing was removed; engine score use was aligned to the adapter's explicit white-perspective `search().score`.
- Mikhail Tal perspective — **92/100**: the UI has per-class counts, small-sample warnings and save-failure states; deeper coaching chapters are still absent.

All five simulated reviewers are above the 90/100 round threshold. This is **not** the required final 29-round review. The independent per-file 95/100 gate remains **blocked**, because the full project typecheck/build, endpoint execution tests, browser E2E, and live non-production schema checks have not been verified in this environment.

### Round 2/29 — account boundaries, persistence completeness, and failure paths
Simulated adversarial review of the current branch changes:
- Magnus Carlsen perspective — **94/100**: cached analysis remains reusable while metadata is refreshed if source date/class/color changes.
- Hikaru Nakamura perspective — **93/100**: per-game cache reads are batched; payload byte limits and API timeouts are explicit.
- Garry Kasparov perspective — **95/100**: report persistence validates version, count, unique fingerprints, saved game existence, and matching time-control bucket.
- Bobby Fischer perspective — **94/100**: server rejects non-contiguous move indices and out-of-range win chances; only a server-confirmed save counts as persisted.
- Mikhail Tal perspective — **92/100**: account changes clear the visible report state and stop the run before subsequent requests.

All five simulated reviewers meet the 90/100 round threshold. No runtime/CI result is implied by this static review. Per-file 95/100 remains blocked pending actual typecheck/build and endpoint/browser tests.

### Retention decision for the first version
- Per-game analysis cache and report snapshots are retained for the lifetime of the account so future reports can reuse prior work and the user can revisit compatible snapshots.
- Both tables reference `auth.users(id) ON DELETE CASCADE`; account deletion removes the associated DNA records.
- No automatic time-based eviction is implemented in this first version. Storage growth must be measured before production rollout; if limits are needed later, add a transparent retention/export policy rather than silently deleting analyses.

### Round 3/29 — clock data, cancellation, and reporting completeness
Simulated static/adversarial review:
- Magnus Carlsen perspective — **93/100**: trusted timestamps now outrank date-only ordering; unknown time classes remain excluded.
- Hikaru Nakamura perspective — **94/100**: per-game progress, bounded API calls, worker boot timeout, API timeouts, cancellation, and duplicate-run lock are present.
- Garry Kasparov perspective — **95/100**: account-owner guards, schema/version gates, payload byte bounds, and saved-game verification are present.
- Bobby Fischer perspective — **92/100**: clock insights require a full set of parseable per-ply clocks and are calculated only over the user's own clocked moves; incomplete clocks are not interpreted as zero.
- Mikhail Tal perspective — **94/100**: the report now includes Accuracy, move-class rates, opening frequency, and a cautious low-clock signal, with small-sample and missing-data messaging.

All five simulated reviewers meet the 90/100 round threshold. The report remains a first implementation slice: tactical themes and conversion/endgame profiles are not yet implemented. Full typecheck/build, endpoint integration, browser E2E, and non-production Supabase verification are still unverified, so no file has been declared to have passed the 95/100 release gate.

### Round 4/29 — regression coverage and build verification
- Magnus Carlsen perspective — **94/100**: game selection, player perspective and per-time-control separation are now covered by regression checks.
- Hikaru Nakamura perspective — **93/100**: the Lichess mock verifies UTC pagination and explicit cap warnings; the report pipeline exposes cancellation and reuse counts.
- Garry Kasparov perspective — **95/100**: schema checks verify account cascade, RLS, service-role-only grants and composite uniqueness; report writes require stored analyses.
- Bobby Fischer perspective — **94/100**: tests cover untrusted time classes, same-day timestamps, engine score perspective, missing clocks and incomplete report shapes.
- Mikhail Tal perspective — **93/100**: UI contract tests cover progress, cancellation, sample warnings, missing clock data and truthful persistence failure messaging.

All five simulated reviewers meet the 90/100 round threshold. GitHub Actions run **#157** passed: TypeScript checks, release checks (including Chess DNA unit/contract checks), production build and generated-rules verification. This is the first complete green CI run for the expanded test set.

Independent file gate snapshot (based on CI + static review; not a production readiness claim):
- `src/chess-dna.ts`: **96/100**, passed static/unit contract gate.
- `src/game-archive.ts`: **95/100**, passed mocked pagination and archive checks; live-provider behavior remains unverified.
- `scripts/check-chess-dna.mjs`, `scripts/check-chess-dna-server.mjs`, `scripts/check-chess-dna-schema.mjs`, `scripts/check-chess-dna-ui.mjs`: **96/100**, passed in CI.
- `package.json`, `public/styles.css`, `DNA_IMPLEMENTATION_PLAN.md`, `STATE.md`: **95/100**, build/docs/static checks passed.
- `src/main.ts`, `netlify/functions/chess-dna.mjs`, `public/engine-worker.js`, `public/data/supabase-schema.sql`: **94/100 — NOT PASSED** the strict 95 gate yet because browser E2E, mocked authenticated database integration, real engine position fixtures and a non-production schema migration have not been verified. These are explicit remaining blockers, not assumed successes.

### Round 5/29 — repeatability, real-browser board, and PGN save-path bug
- Magnus Carlsen perspective — **96/100**: the same real WASM position returned identical move, classification, score and depth in 7/7 runs; three independent game positions also passed 7/7 each.
- Hikaru Nakamura perspective — **95/100**: the three extra fixtures cover an opening position, a middlegame/castling position, and a post-queen-trade endgame position; best moves were validated as legal.
- Garry Kasparov perspective — **95/100**: authenticated browser smoke testing exposed a real over-escaped PGN-header regex in the account-save path; the regex was corrected, then the full browser check passed.
- Bobby Fischer perspective — **94/100**: the real-WASM checks confirmed deterministic output on the tested fixtures and validated score bounds and legal best moves; this is repeatability evidence, not proof of engine playing strength.
- Mikhail Tal perspective — **95/100**: the Chromium smoke test loaded a 4-ply PGN, rendered a board SVG with 152 child nodes, verified move selection updates, and reported no uncaught page errors; two screenshots were captured as workflow artifacts.

All five simulated reviewers meet the 90/100 round threshold. GitHub Actions run **#178** passed end-to-end: archive/account/product checks, release checks, TypeScript, production build, real Chromium board smoke test, and generated-rules verification.

Repeatability results from the real WASM worker:
- Same position, 7/7 identical: best move `a4c6`, classification `excellent`, depth 5.
- Opening fixture, 7/7 identical: best move `b1c3`, classification `excellent`, depth 4.
- Middlegame fixture, 7/7 identical: best move `e1g1`, classification `best`, depth 5.
- Post-queen-trade endgame fixture, 7/7 identical: best move `e1e2`, classification `best`, depth 6.
- Total: **28 analyses**, all repeatable across the four tested positions. This does not establish that the engine's evaluations are objectively strongest; independent position-score fixtures remain a separate gate.

Browser evidence: workflow run #178 uploaded artifact `chess-board-browser-evidence` (two screenshots plus a JSON report). The screenshots show the board after PGN load and after selecting a move. The test uses a mocked authenticated browser session and a local production preview; it does not test live account storage or a production deployment.

Remaining release blockers: authenticated endpoint/database integration tests, real non-production schema migration/rollback, deeper browser E2E for Chess DNA report creation/cancellation/error states, and independent engine evaluation fixtures. Do not merge or deploy until these are addressed and the user approves the preview.

## Follow-on slice: shared statistics on saved DNA — 2026-10-21
Status: draft implementation on `feature/dna-powered-statistics`, stacked on the Chess DNA PR.

### Data contract
- Chess-game statistics must read the account's latest saved `user_chess_dna_reports.report_json` through `GET /api/chess-dna?action=latest`.
- Reuse the DNA per-game cache keyed by normalized PGN fingerprint, engine version, and analysis schema. A stats page must not trigger another engine run or create duplicate copies of per-move analysis.
- The first shared read model (`src/dna-statistics.ts`) derives game counts, own-move totals, weighted Accuracy by time control, and move-quality rates only from fields already checked by the DNA storage endpoint.
- Until opening and clock metadata are persisted and server-validated, treat those report fields as descriptive DNA-page output, not trusted inputs for new cross-feature insights.
- If there is no saved report, show an empty state and link to the DNA report workflow; do not infer zero performance from missing history.

### Blindfold data boundary
- Blindfold-session outcomes are not derivable from regular-game DNA. The inspected repository currently has no verified Blindfold session implementation or event source.
- Before adding Blindfold statistics, inspect/build the actual Blindfold flow and record only compact completed-session summaries: stable session ID, stage ID, outcome, duration, timestamp, and the minimum difficulty/context needed for meaningful breakdowns.
- Persist summaries server-side scoped to the authenticated account, with an idempotent unique key and a bounded payload. Do not persist every UI interaction, board frame, or duplicate the Chess DNA game analysis.
- Do not invent stage IDs. Use the actual four stages from the approved Blindfold product flow once verified. Account deletion, account switching, offline retries, and duplicate submissions must be covered by tests.
- Live Supabase schema remains unverified: the Supabase read-only table inspection failed with a database authentication error. No live migration was applied. Do not treat the schema text in this repository as proof that the tables exist in the live project.

### Current status
- Added the first statistics page and reusable read model on the stacked feature branch; draft PR: https://github.com/orenzbit/veyra-chess/pull/10.
- Focused read-model tests and strict TypeScript checking were run in a small local harness, not against the full repository checkout.
- Current integrated CI must pass before merge. Live database integration remains unverified; do not claim production readiness.
