# Personal Bot + Streak Reminder Plan

Status: planning and evidence collection only. This document does not mean any feature is implemented or production-enabled.

## Audited baseline

Audit date: 2026-10-24 UTC.

- Repository: https://github.com/orenzbit/veyra-chess
- Main baseline: `e4cb4377fbd5a9730e4309ec8ee8a57f6400d999`
- Historical bot work branch at audit time: `player-data-batch`, head `160abe47ec92c1c4533a2f5bfb54f208fe787469`
- Main has a release check script in `package.json` and GitHub Actions workflow `.github/workflows/verify.yml`.
- Main contains server-verified daily streak logic in `netlify/functions/daily-streak.mjs` and `netlify/functions/lib/daily-streak.mjs`.
- Existing streak milestones are 7, 14, 30, 50, 100, and 365 days. The requested reminder interval of every five days is separate and must not change existing streak semantics.
- PR #19 (server-verified daily streak) and PR #21 (history pagination hardening) are merged. PR #17 (historical bot profiles and tournament evidence) was open at audit time. Do not alter or merge it as a shortcut.
- The daily streak API checks `DAILY_STREAK_ENABLED` and returns DISABLED unless it is true. Live Netlify flags and live Supabase migration state were not verified.
- The migration file and schema declarations do not prove that the live database has the corresponding tables.
- Main contains optional adaptive signals: `src/main.ts`, `netlify/functions/adaptive.mjs`, and tables described in `public/data/supabase-schema.sql`. The endpoint uses a visitor ID and coarse signals; it is not an automatically retrained personal chess bot. Adaptive opt-in is stored locally and the account sync layer can store the preference, but that does not establish model training or bot profile promotion.
- `netlify/functions/sync.mjs` has account-scoped access to saved games in `user_games` and returns up to 500 game records; individual PGNs can be fetched by game ID. `src/game-archive.ts` can import up to 100 public games from Chess.com/Lichess. Neither observation by itself proves the ingestion set is complete or suitable for training; audit ownership, duplicates, validity, provenance, and consent first.
- Run https://github.com/orenzbit/veyra-chess/actions/runs/40042756172 failed at the historical holdout check. The error was `holdout split/provenance is incomplete` for nine profiles; the combined assertion checks generator version, at least eight positions, and consistency of training + holdout counts with source count. Determine the specific failing subcondition before changing anything.
- Run https://github.com/orenzbit/veyra-chess/actions/runs/40043364456 was cancelled. Run https://github.com/orenzbit/veyra-chess/actions/runs/40043360462 was in progress at last observation. Recheck current status before relying on either.
- A dedicated branch `work/personal-bot-streak-plan` holds planning-only artifacts. It is separate from `main` and `player-data-batch`.

## Product requirements

1. Offer the user a reminder at every five-day streak interval, without duplicate delivery for the same user and milestone.
2. Respect notification permission, user preferences, account state, timezone, and ability to disable reminders.
3. Do not assume browser push is available. Inspect current delivery channels first. Push requires explicit permission, a service worker, secure subscription storage, server-side delivery, and protected VAPID credentials in environment variables. Never expose private keys to the browser.
4. The personal bot must reflect the user's own verified games, not historical grandmaster PGNs or other accounts' games.
5. Improvement must be sustained and credible; a single win or small sample must not trigger an update.
6. Track chess decision quality and style similarity as separate metrics.
7. Evaluate candidate profiles against a holdout that was not used to train or tune the candidate.
8. Build/evaluate candidate versions in isolation. Do not overwrite the active profile until legality, quality, regression, and style gates pass.
9. Preserve rollback to the last accepted bot profile.
10. Do not run live migrations, enable production flags, send real notifications, or deploy without required explicit approval and access.

## Recommended data boundaries

### Supabase (server-only unless an existing secure pattern proves otherwise)

- Existing streak settings and server-verified events.
- Notification preferences and consent.
- Push subscriptions only if push is selected; treat endpoints and keys as sensitive and user-scoped.
- Reminder delivery ledger with a unique idempotency key such as user + streak milestone + notification type.
- Versioned bot profile metadata: source-game fingerprints/count, training window, engine version, metrics, acceptance state, creation time, and rollback parent.
- Compact per-game metrics or content hashes where useful. Reference existing account-owned PGNs rather than duplicate them when safe.
- Candidate evaluation summaries and promotion/rollback audit records.

Every table needs explicit account isolation, RLS review, least-privilege grants, retention rules, and account-deletion behavior.

### Netlify

- Authenticated server functions for reminder state/delivery and candidate profile evaluation/promotion.
- Server-side secrets only.
- Scheduled functions only if needed by the chosen delivery design; prefer a milestone event plus idempotent delivery when sufficient.
- UI for opt-in/opt-out, permission state, reminder status, bot version/last update, and clear failure states.
- Do not claim delivery merely because a job was queued.

### Client

- Ask permission only after a clear user action.
- Keep reminder settings visible and reversible.
- Show bot updates only after candidate profile passes the release gate.
- Never expose service-role keys or VAPID private keys in client bundles.

## Implementation sequence

1. Finish read-only audit of current main, relevant branches/workflows, migrations/schema, auth/sync, adaptive signals, deletion flow, and personal game ingestion.
2. Record baseline tests before edits.
3. Select notification channel based on existing architecture and deployment constraints.
4. Write migration and rollback plan; review ownership and idempotency before any live DB operation.
5. Implement preferences, idempotent reminder ledger, and delivery integration behind a default-off flag.
6. Implement user-game provenance and split rules with whole games kept together across train/validation/holdout and chronological holdout where volume permits.
7. Implement candidate evaluation and controlled promotion; keep active profile unchanged on any failure.
8. Test streak boundaries, timezone changes, duplicate/concurrent requests, opt-out, denied permission, delivery errors/retries, account isolation/deletion, profile rollback, legal moves, Stockfish quality, style holdout, and full games.
9. Run focused checks, full release checks, browser tests, and CI on the exact PR head SHA.
10. Review diff and evidence. Merge only when all required checks pass and required approvals are satisfied.
11. Verify post-merge checks. Live migration, live flags, notification delivery, and deployment are separate actions and must not be implied by a code merge.

## Explicit unknowns

- Live Supabase migration state and permissions.
- Live Netlify environment flags and scheduled/background function support.
- Whether a push provider is configured; a code search alone cannot prove absence.
- Exact reliable ingestion set of the user's own games and update cadence.
- Meaningful-improvement metric, minimum sample size, and evaluation thresholds.
- Notification channel and cost/retention expectations.

Do not silently decide unknowns that affect privacy, cost, or production behavior. If a safe default is possible, keep the feature disabled until explicitly enabled.
