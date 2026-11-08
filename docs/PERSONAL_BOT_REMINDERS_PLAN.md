# Personal Bot + Five-Day Streak Reminders

Status: approved for implementation; audit started read-only on 2026-10-24.
Branch: `feature/personal-bot-reminders`
Base: `main` (branch created after initial read-only inspection).

## Scope
1. A personal chess bot grounded in the user's own eligible games, with a conservative legal-move policy and measurable style fidelity.
2. A reminder milestone every five consecutive active days (5, 10, 15, ...) to play the personal bot, with timezone-aware, idempotent delivery and user control.
3. Adaptive bot improvement only when repeated evidence supports it. Separate playing strength from style similarity, evaluate a candidate profile before promotion, and preserve rollback.
4. Keep existing streak, Chess DNA, puzzle, auth and account-sync behavior unchanged.

## Initial verified findings
- `main` already contains a daily-streak endpoint and core date logic: `netlify/functions/daily-streak.mjs` and `netlify/functions/lib/daily-streak.mjs`.
- Existing daily-streak milestones are `[7, 14, 30, 50, 100, 365]`, not five-day milestones.
- Existing migration `supabase/migrations/20261022000000_daily_streak.sql` stores streak settings/events and restricts activity types to `puzzle` and `training`. It does not provide a reminder-delivery ledger.
- Existing bot engine `src/bot-engine.ts` and historical persona scripts exist on `player-data-batch`; this is not proof that a personal user-specific bot is implemented.
- Existing Chess DNA code can select/hash eligible user games, but it is an analysis pipeline, not a validated personal-play-style bot by itself.
- `netlify.toml` routes `/api/*` to Netlify Functions and builds with `npm run build`.
- Existing release command is broad: `npm run check:release`; CI workflow `.github/workflows/verify.yml` also runs streak checks, build and browser smoke tests.

## Known blockers / unverified items
- Supabase project metadata is readable, but direct live table and migration inspection failed with PostgreSQL password-authentication errors. Live schema/migration state remains INCONCLUSIVE.
- Netlify project metadata says SSO team login is required for all deploys. Function logs/runtime and actual deploy behavior have not been verified.
- No web-push subscription/VAPID integration was found in the targeted repository search. Push delivery must not be claimed working without opt-in, service worker support, secrets, and a real delivery test.
- The PDF artifacts requested by the user could not be generated in the current session because the data-analysis/Python capability is unavailable. This Markdown plan and tracker are the durable text alternatives; no PDF is claimed to exist.

## Proposed architecture
### Database
- Add a private reminder ledger keyed uniquely by user, streak-cycle identity and milestone, so retries cannot deliver duplicates.
- Store notification preference/consent and timezone explicitly.
- Store personal-bot profile versions and evaluation metadata, not secrets.
- Keep raw PGNs out of new tables where possible; use existing account-scoped game sources or normalized hashes/references.
- RLS and server-only privileges must be reviewed against the existing service-role pattern.

### Runtime
- Netlify Functions own authentication, account isolation, reminder scheduling/delivery and profile promotion.
- The frontend requests explicit notification permission only after the user chooses to enable push.
- Push secrets stay in protected Netlify environment variables. If push credentials/runtime cannot be verified, in-app reminders may be delivered, but push remains disabled and clearly reported as such.
- Scheduled jobs run in UTC; reminder dates must be computed using the user's IANA timezone.

### Personal bot update policy
- Never promote a profile after a single win or a tiny sample.
- Define a rolling-window improvement signal with minimum sample size and confidence bounds.
- Evaluate style fidelity on game-level holdout data separate from training; prevent duplicate-game leakage.
- Check chess quality separately from style match. Do not override legal move generation, forced mates or obvious tactical safety for style.
- Build candidate profile off-path; promote atomically only after every gate passes; retain last-known-good profile for rollback.

## Acceptance gates
- [ ] PGN/source audit: provenance, hashes, duplicate handling, valid parsing, player attribution and result consistency.
- [ ] Train/validation/holdout splits operate at complete-game level and avoid duplicate leakage.
- [ ] Bot only selects legal moves; edge cases include castling, en passant, promotion, checkmate and stalemate.
- [ ] Stockfish/baseline quality and held-out style fidelity are separately measured.
- [ ] Five-day milestones are 5, 10, 15, ... consecutive qualified local days; existing streak semantics remain unchanged.
- [ ] Reminder ledger is idempotent under retries/concurrency; timezone and consent are enforced.
- [ ] Cross-user isolation and RLS are verified.
- [ ] Adaptive promotion needs repeated evidence, full checks and tested rollback.
- [ ] Full CI/build/browser regression passes on exact PR head SHA.
- [ ] Merge only after required gates are green. Live migration, enabling flags, push activation and deployment are separately reported.

## Release status vocabulary
Use only: NOT STARTED, IN PROGRESS, PASS, FAIL, BLOCKED, INCONCLUSIVE.
A failed connection or unavailable test is INCONCLUSIVE, never PASS.
