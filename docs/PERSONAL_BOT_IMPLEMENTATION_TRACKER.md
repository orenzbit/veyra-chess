# Personal Bot Implementation Tracker

Last updated: 2026-10-24
Repository: `orenzbit/veyra-chess`
Branch: `feature/personal-bot-reminders`
Approval: user explicitly approved implementation.

## Current phase: initial audit
- [x] Create dedicated feature branch from `main`.
- [x] Read `package.json`, `netlify.toml`, `STATE.md`, streak core, streak API, streak migration, streak tests, schema, bot engine on `player-data-batch`, and CI workflow.
- [x] Identify existing daily-streak implementation and current milestone list.
- [x] Identify existing PGN-derived Chess DNA code and historical bot engine.
- [x] Query Supabase project metadata.
- [x] Query Netlify project metadata.
- [ ] Confirm live Supabase tables and applied migrations: INCONCLUSIVE (database credentials rejected by connector).
- [ ] Verify Netlify runtime/function logs and push delivery: INCONCLUSIVE (site requires team SSO).
- [ ] Finish PGN file inventory/hashes and duplicate audit.
- [ ] Finish personal-bot data design and implementation.
- [ ] Finish five-day reminder ledger/API/UI.
- [ ] Finish adaptive improvement evaluation/promotion/rollback.
- [ ] Add and pass focused tests.
- [ ] Pass full CI on exact PR head.
- [ ] Review PR diff and required checks.
- [ ] Merge only after all gates pass.
- [ ] Post-merge smoke check and final evidence report.

## Verified evidence
- `package.json`: `check:daily-streak`, `check:chess-dna`, `check:release`, and production `build` scripts exist.
- `.github/workflows/verify.yml`: runs Node 24, npm ci, daily-streak checks, product checks, release checks, build and Chromium smoke test on PRs to main.
- `netlify/functions/lib/daily-streak.mjs`: `STREAK_MILESTONES = [7, 14, 30, 50, 100, 365]`.
- `supabase/migrations/20261022000000_daily_streak.sql`: current streak settings/events tables; activity types are puzzle/training; server-only privileges.
- `STATE.md`: existing personal puzzles and Chess DNA schema additions have prior documented live-schema gaps; don't assume those schemas are deployed.
- Supabase project ID discovered: `bwondddbpifqxadzzchq`, status metadata ACTIVE_HEALTHY; this does not prove migration/table access.
- Netlify site ID discovered: `f49502cd-bfbe-42b6-8e60-b925211dfc06`; all deploys require team SSO per metadata.

## Current blockers
1. Live Supabase table/migration queries failed with PostgreSQL password-authentication errors. No live schema changes attempted.
2. Netlify requires SSO for all deploys; no live deploy or production function verification attempted.
3. PDF creation was unavailable due current data-analysis/Python capacity. No PDF exists yet; retry only when that capability is available again.

## Safety rules
- Never apply a live migration, change production environment variables, enable production flags, or trigger a production deploy without verified access and an appropriate safe release path.
- Never merge a red, skipped, or inconclusive check as if it passed.
- Never claim a notification was delivered without provider evidence.
- Never claim the personal bot learned/improved without holdout evaluation evidence.
- Keep secrets out of repository, client bundles and logs.
