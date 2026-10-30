# Daily Streak — implementation handoff

**Status:** code and automated checks are being integrated on `feature/daily-streak`. This feature is intentionally dormant until its SQL migration is applied with owner approval and `DAILY_STREAK_ENABLED=true` is configured. Do not claim production activation before both are verified.

## Behavior implemented

- The daily streak is separate from the existing puzzle-solving streak, which remains intact.
- A day qualifies after a server-verified correct puzzle move or a newly completed opening's validated core-line transcript. The standalone seed-puzzle screen submits the puzzle ID and move for server verification. Personal puzzle checkpoints are recorded only after the existing server validates the move; regular training checkpoints and opening completion are labeled `training`, while Rush/streak puzzle modes are labeled `puzzle`.
- The server supplies the completion timestamp and computes the local calendar date. Client-provided completion timestamps and local dates are ignored.
- The initial IANA timezone is saved per account. An explicit timezone change is staged and applies after the next local date boundary in the old timezone, but waits longer if necessary so the new timezone's date does not move behind the last qualified date. Historical event dates are not rewritten.
- Current streak remains visible through the open day if the last qualified date was yesterday. If the last qualified date is older than yesterday and today has no verified activity, the active streak is zero. Historical longest streak is derived from the event-date history and never falls.
- The calendar shows the last 35 local dates. Multiple events can be shown as a count but contribute only one qualified day.
- Offline standalone-puzzle completions are queued per account in local storage and shown as pending. The server timestamps them when received; no client timestamp is trusted to backdate activity.
- Milestones 7, 14, 30, 50, 100, and 365 are derived from the historical longest streak, avoiding duplicate award writes.
- Streak protection and reminders are not included.

## Security and storage

- New server-only tables: `user_daily_streak_settings` and `user_daily_streak_events`.
- The event primary key is `(user_id, event_id)` to make retries idempotent per account.
- RLS is enabled and browser roles have no direct access; the service role is granted access.
- The API requires a valid session, same-origin POST, rate limits, a known seed puzzle, and a server-verified correct move.
- The feature flag defaults off. The migration in `supabase/migrations/20261022000000_daily_streak.sql` has not been applied to any live database by this work.

## Verification

- `npm run check:daily-streak` covers calendar math, local-time and timezone boundaries, request validation, API behavior, UI wiring, schema isolation, and idempotency.
- The project CI also runs the existing release suite and browser board smoke test.
- Keep the feature flag off until the migration is applied with explicit owner approval, then run an authenticated smoke test against the intended Supabase and Netlify environment. No production database mutation is part of this branch.

## Selective preservation from PR #18

- Preserve the current API, tables, event history, 35-day calendar, personal best, milestones, timezone rules, puzzle modes, offline puzzle queue and audio behavior. No schema or sound changes; the feature flag still defaults off.
- Add opening completion to the existing `record` endpoint with `activityType: "training"`, an explicit `ownerId`, opening ID and canonical completed core lines. A mismatched authenticated owner, incomplete/changed transcript or unknown opening is rejected. Catalog validation cannot prove human interaction; it verifies the submitted learning transcript, not anti-cheat.
- The browser and server share `src/opening-core.mjs`, preserving the existing starred-lines/topped-up-to-six rule. Existing progress is neither reset nor automatically re-awarded. Only a new transition to a fully learned opening submits an event.
- Reuse the current `training` category and unique per-account/date/category constraint. Several openings, or personal training plus an opening, still create at most one training row for that day; they never add multiple streak days.
- Opening events use `veyra_opening_streak_outbox_v1:<userId>`, separate from existing puzzle queues. Persist before sending, retain unacknowledged/rejected/disabled events, retry when reopening the trainer or reconnecting while it is open, and stop on account change/unmount. Retry uses the same event ID. The receipt date counts; offline activity is never backdated. Storage/full-queue errors are shown, never reported as saved.
- The older PR's replacement schema, alternative API, duplicate client/core/view, and 42-day layout are not copied over current main. Nothing is deleted from PR #18 or its branch; it remains available pending owner approval.
- `npm run check:daily-streak` covers existing behavior plus transcript validation, additive history, idempotency, queue errors/retries and account isolation.
- After `npm run build` and the existing Playwright setup, `node scripts/check-daily-streak-browser.mjs` exercises the real trainer, pending/retry UI, saved progress/bests and the local HTML. Auth/storage API responses are mocked, not production-verified.
- `design-preview/daily-streak.html` is a standalone bilingual local visual proposal, using sample data and no network/storage/audio. Its separate visual tabs are not a deployed layout change; the actual daily card remains within the puzzle-streak screen until design approval.
