# Personal Bot + Streak Reminder Progress Log

This file is an evidence log. Update it only with observed facts and link the exact source/run/commit.

## 2026-10-24 — Read-only repository audit

### Confirmed

- [x] Repository default branch is `main`.
- [x] Main SHA observed: `e4cb4377fbd5a9730e4309ec8ee8a57f6400d999`.
- [x] `player-data-batch` SHA observed: `160abe47ec92c1c4533a2f5bfb54f208fe787469`.
- [x] Main has daily streak API/library and a SQL migration file.
- [x] Current streak milestones in the library are 7, 14, 30, 50, 100, 365.
- [x] `DAILY_STREAK_ENABLED` is checked by the API before serving requests.
- [x] `package.json` includes `check:daily-streak`, `check:release`, `build`, and other focused checks.
- [x] PR #19 and PR #21 are merged.
- [x] PR #17 was open and historical-bot GitHub Actions runs were active at audit time.
- [x] Historical holdout workflow failed in run 40042756172 at the held-out historical-position/style-overlap step.
- [x] A full historical-bot workflow was in progress at run 40043360462.
- [x] Existing `netlify/functions/adaptive.mjs` stores optional signals keyed by `visitor_id`, not the authenticated account ID. It returns success with `stored:false` on storage failure. This is an adaptive-training signal endpoint, not evidence of an automatically retrained personal bot.
- [x] `src/main.ts` keeps the adaptive opt-in in browser localStorage and submits coarse signals when opted in. `netlify/functions/sync.mjs` also syncs an `adaptiveOptIn` boolean in account app state. This must not be mistaken for a trained bot profile.
- [x] `netlify/functions/sync.mjs` exposes authenticated account-scoped saved games from `user_games`; it lists up to 500 games and can fetch an individual saved PGN. This is a plausible source for a personal bot, subject to a full provenance/ownership/PGN audit.
- [x] `src/game-archive.ts` imports up to 100 public Chess.com/Lichess games client-side. PGN-only imports may have unknown time class; the code explicitly avoids inferring Bullet/Blitz/Rapid from game duration.
- [x] Main has a release workflow at `.github/workflows/verify.yml`, but the GitHub Actions workflow can make generated-profile commits on PR branches under certain conditions. Avoid opening a plan-only PR if it could trigger unrelated writes.
- [x] Run https://github.com/orenzbit/veyra-chess/actions/runs/40042756172 failed at `scripts/check-historical-holdout.mjs:169`. The log says `holdout split/provenance is incomplete` for morphy, anderssen, tal, capablanca, polgarj, karpov, fischer, nakamura, and kasparov. The assertion combines generator version, minimum holdout position count, and train/holdout/source count consistency, so the log alone does not establish which subcondition fails for each profile.
- [x] Run https://github.com/orenzbit/veyra-chess/actions/runs/40043364456 was cancelled on head `160abe47ec92c1c4533a2f5bfb54f208fe787469`.
- [x] Run https://github.com/orenzbit/veyra-chess/actions/runs/40043360462 was in progress at last observation. Recheck before using it as final evidence.

### Not verified

- [ ] Live Supabase schema/migration state.
- [ ] Live Netlify environment flags.
- [ ] Push notification provider, credentials, subscription persistence, and actual delivery. A GitHub code search for common notification terms returned no results, but that is not proof no notification implementation exists.
- [ ] Current production personal-bot availability.
- [ ] Complete PGN integrity/hash/duplicate audit.
- [ ] Reliable ingestion of new games for the account and a safe game-selection policy.
- [ ] A statistically justified improvement-detection threshold.
- [ ] No end-to-end tests have yet been run for the new five-day reminder or personal-bot auto-update requirements.

### Safety decisions

- A dedicated branch `work/personal-bot-streak-plan` was created from main SHA `e4cb4377fbd5a9730e4309ec8ee8a57f6400d999`.
- Added planning artifacts only:
  - `docs/PERSONAL_BOT_STREAK_PLAN.md`
  - `docs/PERSONAL_BOT_STREAK_PROGRESS.md`
  - `docs/PERSONAL_BOT_STREAK_ACCEPTANCE.md`
- These documents are not a product implementation. No production migration or flag changes.
- No notification was sent.
- No merge or deployment was performed for these new requirements.
- The historical-bot branch/workflow was not modified by this planning audit.

## Next cycle

1. Recheck current branch heads and Actions results because the repository is active.
2. Inspect the exact failing profile fields in the historical holdout report before attempting any related code change. Do not merge PR #17 merely to progress this request.
3. Complete the read-only review of the current personal-game/profile learning code, deletion flow, and all relevant schema grants.
4. Establish baseline tests on the dedicated feature branch.
5. Implement one bounded vertical slice at a time: first reminder preferences/ledger/channel, then personal profile candidate evaluation and promotion gates.
6. Run focused tests, then full release and browser checks on the exact PR head SHA. Keep production migration, live flags, real notification delivery, and deployment separate.

## Per-cycle template

- Date/time:
- Base SHA:
- Working branch SHA:
- Scope changed:
- Tests run (exact commands):
- Results and evidence links:
- Failures/root cause:
- Fixes applied:
- Regression tests added:
- Remaining blockers:
- Production actions: must be explicitly listed; default is none.
