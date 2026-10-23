# Daily Streak Hardening — execution plan

**Status:** In progress  
**Branch:** `feature/daily-streak-hardening`  
**Base:** `main` at `3eba9d9a1a46d66977f78521712686704bebae4c`  
**Scope:** harden the existing daily-streak feature; do not activate it in production.

## Research and product decision

Official Duolingo material describes a streak as a low-friction daily habit: one completed lesson can extend the streak independently of a larger daily goal, and milestone feedback makes progress feel meaningful. Duolingo also documents streak freezes and operational repair for service incidents. Sources:
- https://blog.duolingo.com/improving-the-streak/
- https://blog.duolingo.com/how-duolingo-streak-builds-habit/
- https://blog.duolingo.com/streak-milestone-design-animation/
- https://blog.duolingo.com/protecting-streaks-from-site-issues/

For Veyra, the existing product decision is to count one server-verified chess learning activity per local day, separately from the in-session puzzle streak. The existing 35-day calendar, account sync, timezone policy, offline queue and milestones are in scope. Streak freezes, reminders, social streaks and broad redesign are out of scope for this hardening pass; they need separate product approval and planning.

## Repository comparison

Classification: **small targeted changes**, not a rebuild. The feature already exists in `main`, has a dedicated API, server-side date calculations, account-scoped events, schema isolation, and deterministic tests. It remains intentionally disabled until the database migration is explicitly approved/applied and the server flag is configured.

## Ordered implementation steps

1. **Establish baseline** — inspect the current main commit, implementation, migration, existing checks and CI workflow. Preserve `main`; work only on the dedicated feature branch.
2. **Fix history truncation** — `readEvents()` currently stops after 10,000 rows while requesting the oldest rows first. For a long-lived account, newer dates can be omitted, incorrectly breaking the current streak and understating the longest streak. Read pages until the database returns fewer than a full page.
3. **Add a regression test** — exercise the real handler with more than 10,000 historical events and verify that the newest active streak and the historical longest streak are both computed correctly.
4. **Run focused checks** — run `npm run check:daily-streak` and inspect any failure before changing code further.
5. **Run the full project workflow** — typecheck, release checks, production build, generated-rules check, product checks, bot-accuracy checks, and the existing Chromium smoke test through GitHub Actions.
6. **Investigate and iterate** — if a job fails, inspect the failed job and logs, identify the root cause, make a minimal fix on this branch, commit, and rerun CI. Do not label a run successful unless GitHub reports success.
7. **Review product behavior against Duolingo** — retain the low-friction daily action and milestone feedback. Do not add freeze/reminder/social features in this pass.
8. **Update project state** — record exact commits, test results, outstanding limitations, and migration/production status in `STATE.md` and this plan.
9. **Merge gate** — only merge the PR to `main` after all required checks pass, the diff is reviewed, and no unresolved blocker remains. Do not apply the live database migration or enable the production flag as part of this work; the repository's handoff explicitly requires separate owner approval for those steps.

## Acceptance criteria

- More than 10,000 event rows do not cause recent activity or historical streak data to be silently ignored.
- The new regression test fails against the old capped implementation and passes against the fix.
- Focused daily-streak checks and the full required GitHub Actions workflow pass on the final PR head.
- The feature remains off in production; no live database changes are made.
- `STATE.md` reports only verification that actually happened.
