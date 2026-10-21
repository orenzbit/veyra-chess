# Veyra Chess: historical bot profiles

## Current milestone

Status: first five profiles implemented on branch `feature/historical-bots-first-five`. Not merged or deployed.

### Completed in this milestone
- Added stable `slug` values to all 20 manifest entries, aligned with `id`.
- Reworked the first five beginner opponents into distinct fictional historical-inspired personas from five different periods and regions.
- Added period, region, historical disclaimer, opening-style description, and three original in-character lines to each of the first five.
- Replaced generic opening lists for the first five with narrower repertoires inspired by the relevant era.
- Added historical metadata and in-game banter to the bot UI.
- Allowed the admin endpoint to validate/store historical fields and banter.
- Updated bot checks to allow future expansion from 20 to 50, enforce unique slugs, and validate the first five historical profiles.
- Increased saved bot-progress clamps to support a future 50-bot roster.

### Historical accuracy guardrails
- The five personas are fictional, historically inspired characters, not representations of named real players.
- Banter is newly written, not attributed to historical figures.
- Every game still uses Veyra's modern chess rules. Historical opening notes are framed as inspiration; the bot does not simulate earlier chess rule sets.
- Displayed Elo values are existing beginner targets and have not been empirically calibrated by this change.

### Not yet completed
- The remaining 15 existing bots have not yet received historical profiles.
- The roster has not yet been expanded from 20 to 50.
- No local npm commands were executed in this connector-only environment.
- CI results and browser gameplay still need verification after the branch updates.
- Opening sequences should be exercised in actual games before claiming every repertoire line is runtime-verified.

### Validation plan
1. Run `npm run check:bots`.
2. Run `npm run check` and `npm run build`.
3. Play smoke-test games as White and Black against each of the five bots.
4. Confirm metadata appears on bot cards and in the game view, and banter changes as moves progress.
5. Confirm API overrides preserve the new fields and progress is not broken.
6. Fix failures before marking this milestone complete.
