# Daily streak v1 — implementation and release notes

## Product behavior

- A day qualifies after a server-accepted puzzle solution or a completed opening-training item.
- The server assigns the qualifying local date when it receives and validates the activity. Client timestamps are ignored, including for events queued offline.
- An open day is not marked as missed. If yesterday qualified and today is still open, the current streak remains visible through yesterday and the UI tells the user to complete an activity today.
- A closed missed day breaks the active streak. The personal best remains.
- Milestones: 7, 14, 30, 50, 100 and 365 days. Award state is stored per account so repeated reads do not re-award the same milestone.
- Timezone changes become effective on the next local date. The timezone identifier is validated with the platform IANA timezone database.
- Offline events are queued in local storage scoped by account ID. They remain pending until the server accepts or rejects them. They are attributed to the server receipt date, not the device's claimed activity date.
- No streak protection or reminders are included in v1.

## Implementation

- `netlify/functions/lib/daily-streak-core.mjs`: timezone-aware local date conversion, streak calculations, milestone thresholds and 42-day calendar.
- `netlify/functions/daily-streak.mjs`: authenticated same-origin endpoint; verifies puzzle moves against known seed/personal puzzle data, validates opening completion transcripts against the server repertoire, assigns dates on the server, deduplicates by account and source event ID, and stores timezone/milestone state.
- `src/daily-streak-client.ts`: same-origin API calls and an account-scoped offline outbox.
- `src/daily-streak-view.ts`: current/best streak, 42-day activity calendar, pending-sync status and milestones.
- `src/puzzle-page.ts`: separate daily-streak tab; the existing consecutive-puzzle challenge remains available.
- `src/main.ts`: completed opening study submits its canonical core-line transcript for server-side catalog validation.
- `public/data/supabase-schema.sql`: server-only settings and activity tables with RLS, service-role grants and idempotency constraint.
- `netlify.toml`: includes the opening repertoire file in the function bundle.

## Verification

Run `npm run check:daily-streak`. It includes:
- 31 focused assertions for date arithmetic, timezone conversion, active/best streak rules, open-day behavior and calendar output.
- 34 API assertions for authentication, same-origin enforcement, validation, timezone changes, idempotency, account isolation, puzzle validation and opening transcript validation.
- 34 integration-contract assertions for the UI wiring, outbox scoping, server-time attribution, schema access controls and build packaging.

The full release suite also runs these checks through `npm run check:release`.

## Release boundary / known limitations

- The SQL in `public/data/supabase-schema.sql` has been added to the repository only. It has **not** been applied to the live Supabase project. The endpoint will return an unavailable response until the two daily-streak tables exist in the live database.
- No live Supabase migration, Netlify environment change, or production deployment was performed by this work.
- Opening completion is checked against the server's canonical required lines and move transcript. As with other browser-submitted learning progress, this validates the reported transcript against the catalog; it cannot prove that a person physically interacted with the UI.
- Browser/manual QA against the live Netlify site remains separate from automated CI. Do not call the feature production-verified until migration and authenticated browser verification are completed.
