# Personal Bot + Streak Reminder Plan

Status: planning and evidence collection only. This document does not mean any feature is implemented or production-enabled.

## Audited baseline

Audit date: 2026-10-24 UTC.

- Repository: https://github.com/orenzbit/veyra-chess
- Main baseline: `e4cb4377fbd5a9730e4309ec8ee8a57f6400d999`
- Personal/historical bot work branch at audit time: `player-data-batch`, head `160abe47ec92c1c4533a2f5bfb54f208fe787469`
- The repository has a release check script in `package.json` and a GitHub Actions workflow at `.github/workflows/verify.yml`.
- Main contains a server-verified daily streak implementation in `netlify/functions/daily-streak.mjs` and `netlify/functions/lib/daily-streak.mjs`.
- Existing streak milestones are 7, 14, 30, 50, 100, and 365 days. The requested reminder interval of every five days is not the same as the existing milestone list and must be added without changing current streak semantics.
- PR #19 (server-verified daily streak) and PR #21 (history pagination hardening) are merged. PR #17 (historical bot profiles and tournament evidence) was open at audit time, with CI activity in progress. Do not alter or merge that unrelated work as a shortcut.
- The daily streak API checks `DAILY_STREAK_ENABLED` and returns DISABLED when it is not set to true. This audit did not verify live Netlify environment values or live Supabase migration state.
- The main schema file describes server-only tables and RLS, but a schema file alone does not prove that the live database has those tables.
- The bot branch contains `src/bot-engine.ts`, source-grounded historical profiles, and scripts such as `check-historical-holdout.mjs`, `check-historical-surprise.mjs`, and `check-historical-stockfish.mjs`. These do not, by themselves, prove that a production personal bot trained from the user's own games is already available.
- GitHub Actions run https://github.com/orenzbit/veyra-chess/actions/runs/40042756172 failed at the held-out historical-position/style-overlap step. The run is about historical profiles, not the requested personal bot. Investigate the cause before relying on those results.
- A separate full historical-bot workflow was in progress at audit time: https://github.com/orenzbit/veyra-chess/actions/runs/40043360462. Avoid conflicting edits to `player-data-batch`.

## Product requirements

1. Offer the user a reminder at every five-day streak interval, without duplicate delivery for the same user and milestone.
2. Respect the user's notification permission, preferences, account state, timezone, and ability to disable reminders.
3. Do not assume browser push is available. First determine the existing delivery channels. If push is selected, it requires explicit browser permission, a service worker, secure subscription storage, server-side delivery, and protected VAPID credentials in deployment environment variables. Never expose private keys to the browser.
4. The personal bot should reflect the user's own verified game history, not historical grandmaster PGNs or other accounts' games.
5. A detected improvement must be sustained and statistically credible enough to avoid reacting to one win or a small sample.
6. Track chess strength/quality and style similarity as separate metrics.
7. Candidate bot profiles must be evaluated against a held-out set that was not used to train or tune the candidate.
8. Train/evaluate a candidate version in isolation; do not overwrite the active profile until all quality, legality, regression, and style gates pass.
9. Keep a rollback path to the last accepted bot profile.
10. Do not run live migrations, enable production flags, send real notifications, or deploy without the required explicit approval and environment access.

## Recommended data boundaries

### Supabase (server-only access unless an existing secure pattern proves otherwise)

- Existing streak settings and server-verified streak events.
- Notification preferences and consent state.
- Push subscriptions only if push delivery is selected; treat endpoints and keys as sensitive and user-scoped.
- Reminder delivery ledger with a unique idempotency key such as user + streak start/date + milestone + notification type.
- Bot profile version metadata: version, source-game fingerprints/count, training window, engine version, evaluation metrics, acceptance state, creation time, and rollback parent.
- Compact per-game metrics or content hashes where useful. Avoid duplicating full PGNs if the existing account-game storage can be referenced safely.
- Candidate evaluation summaries and promotion/rollback audit records.

Every table needs explicit user isolation, server-only access where appropriate, RLS review, least-privilege grants, retention rules, and account-deletion behavior.

### Netlify

- Authenticated server functions for reminder scheduling/delivery and bot profile evaluation/promotion.
- Server-side secret configuration only.
- Scheduled function only if the selected delivery design requires it; prefer a milestone event plus idempotent delivery where that is sufficient.
- UI for opt-in/opt-out, permission state, reminder status, bot version/last update, and understandable error states.
- Do not claim a notification was delivered merely because a job was queued.

### Client

- Ask permission only after a clear user action.
- Keep reminder settings visible and reversible.
- Show bot updates only after a candidate passes the release gate.
- Never put service-role keys, VAPID private keys, or other secrets in client code.

## Implementation sequence

1. Finish read-only audit of current main, relevant branches, workflows, database schema/migrations, auth/sync, and current PGN ingestion.
2. Record current tests and baseline behavior before edits.
3. Choose reminder channel based on existing architecture and deployment constraints.
4. Write migration and rollback plan; review user isolation and idempotency before any live database operation.
5. Implement reminder preferences, idempotent reminder ledger, and delivery integration behind a default-off feature flag.
6. Implement personal-game provenance and split rules, keeping entire games together across train/validation/holdout and adding a chronological holdout where data volume permits.
7. Implement candidate profile evaluation and controlled promotion; keep the current profile active on any failure.
8. Add tests for streak boundaries, timezones, duplicate/concurrent events, opt-out, permission denied, delivery failure/retry, account isolation, deletion, profile rollback, legal moves, Stockfish quality, style holdout, and full games.
9. Run focused checks, full release checks, browser tests, and CI on the exact PR head SHA.
10. Review the diff and artifacts. Merge only when all required checks pass and all required approvals are satisfied.
11. Verify post-merge checks. Live database migration, live feature flags, and production notification delivery are separate release actions and must not be implied by a code merge.

## Explicit unknowns

- Live Supabase migration state and access permissions.
- Live Netlify feature flags and scheduled/background function support.
- Whether push notifications are already configured anywhere in the current project.
- The exact reliable source of the user's own games and how new games are ingested.
- Which user activity/strength metric will define meaningful improvement and the minimum sample size.
- Whether a push provider or another notification channel is preferred.

Do not silently decide unknowns when the choice affects privacy, cost, or production behavior. If a safe default is possible, keep the feature disabled until explicitly enabled.
