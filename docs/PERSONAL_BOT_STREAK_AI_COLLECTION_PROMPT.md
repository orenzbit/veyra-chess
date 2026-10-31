# Prompt for an AI to collect evidence only

Copy everything below into the other AI. This task is **read-only evidence collection**, not implementation.

---

You are preparing a handoff package for the Veyra Chess repository:
https://github.com/orenzbit/veyra-chess

The goal is to collect the current source files and verified results needed for a later model to implement (a) reminders at every fifth day of a qualifying streak and (b) a personal chess bot that may update only after a measurable, sustained improvement in the user's own games.

## Hard restrictions

- Do not build the bot or implement either feature.
- Do not edit the repository, commit, open a PR, merge, deploy, or apply database migrations.
- Do not send notifications or change live feature flags.
- Never output secrets, environment values, tokens, service-role keys, VAPID private keys, or credentials. At most report variable names and whether they appear configured if this can be safely verified.
- Do not claim a live Supabase migration or Netlify setting is verified unless you actually checked the live system read-only.
- Do not claim a test passed unless it ran and produced a successful result.
- Use `PASS`, `FAIL`, `BLOCKED`, and `NOT RUN` precisely.
- If a source is inaccessible, document the exact missing item and reason; continue with other sources.

## Collect these current sources

1. Repository metadata: default branch, full commit SHAs for `main` and `player-data-batch`, relevant open/merged PRs, current workflow runs and direct links.
2. Main project files: `package.json`, lockfile, `.github/workflows/*`, `netlify.toml`, `STATE.md`, README and project-specific agent instructions.
3. Streak system: `netlify/functions/daily-streak.mjs`, `netlify/functions/lib/daily-streak.mjs`, `scripts/check-daily-streak.mjs`, streak UI files, migrations, and relevant schema/RLS/grants.
4. Notification system: search for Service Workers, Push API, Notification permission, subscription storage, scheduled functions, provider SDKs, and delivery logs. Absence from code search is not proof of absence; say what was searched.
5. Auth, sync, deletion and saved games: `netlify/functions/auth.mjs`, `netlify/functions/sync.mjs`, relevant account deletion handlers, `src/account-sync.ts`, `src/game-archive.ts`, schema for `user_games`, and related tests.
6. Adaptive features: `src/main.ts` relevant adaptive opt-in/signals, `netlify/functions/adaptive.mjs`, telemetry endpoint, schema tables for adaptive signals and bot overrides, and tests. Distinguish coarse adaptive signals from a trained personal chess bot.
7. Bot engine and PGN processing: `src/bot-engine.ts`, bot manifests/profile schemas, PGN ingestion/build scripts, historical holdout/surprise/Stockfish checks, game-run tests, and relevant source PGNs if accessible.
8. All existing test results and relevant failed logs. For each failure, include the exact assertion/error and the affected commit SHA. Do not infer a root cause beyond the evidence.

## Output folder

Create `veyra-evidence-pack/` with:

- `00_README_HE.txt`: how to read the package, collection date, source commits, and limits.
- `01_REPO_STATE.txt`: branches, SHAs, PRs, workflows.
- `02_FILE_INDEX.txt`: path, branch/commit, source URL, SHA-256 if available.
- `03_STREAK_NOTIFICATIONS_FINDINGS.txt`: source-grounded streak and notification findings.
- `04_BOT_ENGINE_FINDINGS.txt`: source-grounded bot and adaptive-training findings.
- `05_PGN_INVENTORY.txt`: PGN filenames, sizes, hashes, game counts if actually computed, and known limitations.
- `06_DATABASE_SCHEMA_AND_MIGRATIONS.txt`: schema/migrations/RLS/grants plus a separate live-verification status.
- `07_CI_TEST_RESULTS.txt`: exact commands, run links, commits, statuses and relevant failure messages.
- `08_BLOCKERS_AND_UNKNOWNS.txt`: everything not verifiable, with reason.
- `source-files/`: copies of the relevant source files when allowed and feasible.
- `SHA256SUMS.txt`: hashes of collected files, if available.

If you can create a ZIP, name it `veyra-evidence-pack.zip`, then verify that it opens and contains the expected files. If you cannot create a ZIP, provide all text files individually. Never invent a download path or claim a file was created if it was not.

## Iterative collection loop

Repeat:
1. Compare the required list against collected evidence.
2. Collect missing read-only sources.
3. Verify source URLs, branch/commit and hashes when possible.
4. Update the index and blockers list.
5. Stop retrying any identical access failure after two attempts and document it.
6. Finish only when every item is labeled collected, not found after documented search, blocked, or not applicable with evidence.

Do not spend time designing the bot algorithm. The deliverable is a reliable evidence package for the next model, not a solution implementation.

## Final response

Return the actual ZIP or actual files, plus a short summary of:
- What was collected and verified.
- What remains unknown or blocked.
- Which tests actually ran and their status.
- Confirmation that no code, live database, feature flags, notifications, PRs, merges, or deployments were changed.
