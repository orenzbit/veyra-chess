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
