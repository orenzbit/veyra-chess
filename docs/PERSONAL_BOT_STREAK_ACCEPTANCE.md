# Acceptance Criteria: Five-Day Streak Reminders and Personal Bot Updates

A criterion is accepted only with a passing automated test or an explicitly documented manual test. Missing infrastructure is BLOCKED, not PASS.

## Streak reminders

- [ ] Reminder interval is exactly every five days of the qualifying streak (5, 10, 15, ...), independently of existing 7/14/30/50/100/365 streak display milestones unless product requirements explicitly say otherwise.
- [ ] A reminder is not emitted before its milestone qualifies.
- [ ] The same user/milestone cannot receive duplicate sends after retries, concurrent workers, or replayed events.
- [ ] The reminder is scoped to the authenticated account.
- [ ] User timezone and date-boundary behavior are deterministic.
- [ ] Disabled preferences prevent future sends.
- [ ] Missing permission, invalid subscription, provider error, timeout, and retry are handled without claiming successful delivery.
- [ ] Delivery logs contain minimal operational metadata and no secrets.
- [ ] Account deletion removes or invalidates subscriptions and related preference/ledger data according to the retention policy.
- [ ] No push is sent before explicit opt-in and production approval.
- [ ] Existing streak behavior and the separate puzzle streak do not regress.

## Personal bot data and improvement detection

- [ ] Only games belonging to the correct user are eligible for the personal profile.
- [ ] Game identity/provenance is retained; duplicate games are not counted twice.
- [ ] Invalid or incomplete games are quarantined or excluded with an explicit reason, not silently repaired.
- [ ] Train, validation, and holdout splits operate on whole games, not plies/positions from the same game.
- [ ] Chronological evaluation is used when data volume supports it.
- [ ] Improvement is measured over a minimum sample/window and compared against a stored baseline; a single win does not trigger an update.
- [ ] Chess strength/decision quality and style similarity are separate scores.
- [ ] Candidate profile version and its evaluation evidence are stored before promotion.
- [ ] Candidate must pass legal-move tests, tactical/mate tests, Stockfish quality thresholds, style holdout checks, full-game tests, and regression tests.
- [ ] Failed or inconclusive evaluation leaves the active profile unchanged.
- [ ] Rollback to the previous accepted profile is tested.
- [ ] Every promotion has an auditable reason, source version, engine version, and evaluation summary.

## Security and reliability

- [ ] RLS and server-side authorization prevent cross-account reads and writes.
- [ ] No privileged database or push key reaches client bundles or logs.
- [ ] Request validation, rate limiting, and idempotency are tested.
- [ ] Feature flags default off until release approval.
- [ ] Database migration has a reviewed rollback/recovery plan.
- [ ] Existing build, release, browser, puzzle, archive, account-sync, and bot checks remain green.

## Release gate

Do not merge if any required check is FAIL, BLOCKED, or NOT RUN. Do not deploy or mutate the live database merely because CI is green. Record the exact commit SHA, check URLs, migration status, and post-merge verification.
