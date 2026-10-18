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
