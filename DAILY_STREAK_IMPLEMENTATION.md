# Daily Streak — implementation handoff

**Status:** code and automated checks are being integrated on `feature/daily-streak`. This feature is intentionally dormant until its SQL migration is applied with owner approval and `DAILY_STREAK_ENABLED=true` is configured. Do not claim production activation before both are verified.

## Behavior implemented

- The daily streak is separate from the existing puzzle-solving streak, which remains intact.
- A day qualifies only after a server-verified correct puzzle move. The standalone seed-puzzle screen submits the puzzle ID and move for server verification. Personal puzzle checkpoints are recorded only after the existing server validates the move; regular training checkpoints are labeled `training`, while Rush/streak puzzle modes are labeled `puzzle`.
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
