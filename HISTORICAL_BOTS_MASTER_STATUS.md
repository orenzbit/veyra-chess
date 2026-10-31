# Veyra Chess — Historical Bots Master Status, Sources, Workflow, and Risk Register

**Prepared:** 2026-10-25  
**Repository:** [orenzbit/veyra-chess](https://github.com/orenzbit/veyra-chess)  
**Reviewed branch:** `player-data-batch`  
**Reviewed branch HEAD:** `2075c6a214db16e4459bbe111af342bf63c5e249`  
**Related pull request:** [#17 — Build source-grounded historical bots and full tournament evidence](https://github.com/orenzbit/veyra-chess/pull/17)  
**PR state at review:** closed, **not merged**.  
**Purpose:** A handoff document for a future developer/AI agent. It records the repository layout, PGN inventory, current profile metadata, intended one-bot-at-a-time loop, known CI evidence, risks, and completion gates. It is not a claim that every bot is qualified or that the full tournament has passed.

> **Important status rule:** A profile existing in JSON is not the same as a profile passing qualification. A successful check on an older commit is not proof that the current branch HEAD passes. Every final claim must point to a run, log, report, artifact, or commit that actually supports it.

---

## 1. Executive summary

The branch contains **61 bot definitions**, including **12 PGN-backed historical profiles**. The historical source PGNs live in the repository root. Generated runtime profile files live under `public/data/bots/`, with `public/data/bots/index.json` acting as the manifest. A generator analyzes the PGNs and writes source-grounded metadata, per-color opening repertoires, style metrics, holdout positions, examples, and phrase archives. The runtime move-selection logic is in `src/bot-engine.ts`.

At the latest branch snapshot inspected, all 12 historical manifest entries report generator version `4`, phrase archive version `2`, a source hash, 12 opening lines as White, 12 as Black, and two phrase entries in each of five categories. These are **metadata observations**, not proof that all 12 have passed the latest quality gates.

The active work must be handled **one bot at a time**. The current user instruction requires a separate approval before moving to the next bot. The first bot in this workstream is `anand` / **The Lightning Strategist**. Do not start another profile until Anand's report has been presented and the user explicitly approves moving on.

The latest GitHub Actions runs returned during this review were on commit `abbdf39f345929f27973ed658294af9d0ff8ce96`, which is **not** the current branch HEAD. On that older commit, the workflow reported passing profile-contract checks, production build, tactical accuracy, held-out validation, and surprise-response checks, but the Stockfish quality step failed because searches exceeded a 15-second timeout on four Anand positions. A generated-profile checkpoint push also reported a conflict in a run. These failures must be investigated and rerun against the current HEAD; do not silently waive them. No successful full tournament was found in the reviewed evidence. The PR is closed and unmerged, so do not assume changes are in `main`.

### Current high-priority items

1. Re-run the relevant checks on the exact current branch HEAD and save the logs/artifacts.
2. Resolve or deliberately redesign the Stockfish timeout gate without converting timeouts into false passes.
3. Confirm Anand's runtime/UI display name and phrase text remain anonymized and coherent.
4. Check the per-bot data, style metrics, repertoire, and holdout evidence profile by profile.
5. Reconcile the documented tournament-scope conflict before any tournament is launched.
6. Preserve the current one-bot-at-a-time user approval rule, even where older repository documentation says one batch approval covers all bots.
7. Do not merge, deploy, delete a branch, or start a full tournament unless the required explicit authorization and quality gates are satisfied.

---

## 2. Repository map: where the important files live

### Source PGNs — repository root

The committed source files are at the root of `orenzbit/veyra-chess`, not under `public/data/bots/`:

- `Anand.pgn`
- `Anderssen.pgn`
- `Capablanca.pgn`
- `Carlsen.pgn`
- `Fischer.pgn`
- `Karpov.pgn`
- `Kasparov.pgn`
- `Marshall.pgn`
- `Morphy.pgn`
- `Nakamura.pgn`
- `PolgarJ.pgn`
- `Tal.pgn`

Useful links:
- [Root PGN files on `player-data-batch`](https://github.com/orenzbit/veyra-chess/tree/player-data-batch)
- [Anand PGN](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/Anand.pgn)
- [Tal PGN](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/Tal.pgn)

Never assume a source PGN is valid solely because the file exists. Check its hash, parseability, player identity in the `[White]` / `[Black]` headers, date range, result, color counts, and move legality.

### Generated runtime profiles and manifest

- `public/data/bots/index.json` — manifest and the list of all 61 bot profiles.
- `public/data/bots/anand.json` — runtime JSON for Anand.
- `public/data/bots/<id>.json` — corresponding runtime profile files for other bots, where present.
- `scripts/build-historical-legend-bots.mjs` — PGN-backed profile generator. Supports targeted generation using `--only=<id>`; use this for one-bot work.
- `docs/LEGENDS_PGN_RESEARCH.md` — generated research report with source counts, date ranges, game examples, holdout positions, and phrase archives.

Keep the manifest and per-bot runtime JSON synchronized. Do not regenerate every bot when the approved scope is one bot. Before and after a targeted build, compare the diff and verify that unrelated profile files did not change.

### Engine, UI, checks, and automation

- `src/bot-engine.ts` — bot move selection, search, evaluation, and style-related move bonuses.
- `scripts/check-legends.mjs` — historical profile identity, provenance, archive, repertoire, and runtime consistency checks.
- `scripts/check-historical-holdout.mjs` — holdout-position behavior and style-signal checks.
- `scripts/check-historical-surprise.mjs` — surprise-opponent-move response checks.
- `scripts/check-historical-stockfish.mjs` — Stockfish move-quality gate and report output.
- `scripts/check-bot-accuracy.mjs` — deterministic tactical-accuracy checks.
- `scripts/check-browser-board.mjs` — browser board smoke test and screenshots.
- `scripts/run-legends-tournament.mjs` — tournament runner.
- `scripts/audit-legends-tournament.mjs` — tournament supervision/audit.
- `scripts/render-tournament-evidence.mjs` — per-game PNG and evidence rendering.
- `.github/workflows/verify.yml` — verification workflow, profile generation and quality checks, and approval-gated tournament path.
- `docs/LEGENDS_PROGRESS.md` — progress history; some earlier entries refer to older branches and must not be treated as the current branch status without checking.
- `docs/LEGENDS_AUTOMATION_LOOP.md` — workflow and tournament notes; includes conflicting scope statements that must be reconciled before launch.
- `docs/LEGENDS_BOT_PROMPT.md` — repeatable bot workflow; contains an older batch-approval rule that conflicts with the current per-bot approval instruction.
- `docs/LEGENDS_BOT_ROADMAP.md` — per-bot priority and style-specific audit notes.

### Package scripts relevant to this work

From `package.json`:

```bash
npm run build:legend-bots -- --only=anand
npm run check:legends
npm run check:bot-accuracy
npm run check:historical-holdout
npm run check:historical-surprise
npm run check:historical-stockfish
npm run build
npm run check:release
npm run tournament:legends
npm run audit:tournament
npm run render:tournament-evidence
```

Run only the checks relevant to the approved bot while developing. The full release suite may cover many unrelated project surfaces and should still be run at the appropriate release gate. Do not start a tournament just because the command exists.

---

## 3. Current profile inventory

The values below were read from `public/data/bots/index.json` on `player-data-batch`. The game counts, dates, styles, names, and source files are the branch's current metadata. They have not all been independently re-parsed in this handoff. `v4 / archive v2` means the manifest reports `sourceGeneratorVersion: 4` and `phraseArchiveVersion: 2`; it is not a qualification badge.

| Priority / ID | Display name in manifest | Source PGN | Source games | Train / holdout | Source year range | Current style label | Manifest metadata |
|---|---|---|---:|---:|---|---|---|
| 1 — `anand` | The Lightning Strategist | `Anand.pgn` | 4,253 | 3,828 / 425 | 1984–2026 | Universal-dynamic | v4 / archive v2 |
| 2 — `marshall` | The Tactical Hammer | `Marshall.pgn` | 1,024 | 921 / 103 | 1899–1941 | Attacking | v4 / archive v2 |
| 3 — `anderssen` | The Immortal Gambit | `Anderssen.pgn` | 680 | 611 / 69 | 1844–1878 | Attacking | v4 / archive v2 |
| 4 — `fischer` | The Precision Machine | `Fischer.pgn` | 825 | 742 / 83 | 1955–1992 | Positional / precision | v4 / archive v2 |
| 5 — `karpov` | The Quiet Squeeze | `Karpov.pgn` | 3,525 | 3,173 / 352 | 1961–2022 | Positional | v4 / archive v2 |
| 6 — `kasparov` | The Dynamic Storm | `Kasparov.pgn` | 556 | 501 / 55 | 2000–2021 | Attacking / dynamic | v4 / archive v2 |
| 7 — `morphy` | The Open-Board Virtuoso | `Morphy.pgn` | 211 | 189 / 22 | 1848–1866 | Attacking | v4 / archive v2 |
| 8 — `nakamura` | The Tactical Speedster | `Nakamura.pgn` | 10,214 | 9,194 / 1,020 | 1997–2026 | Tactical | v4 / archive v2 |
| 9 — `polgarj` | The Fearless Attacker | `PolgarJ.pgn` | 1,823 | 1,640 / 183 | 1987–2014 | Attacking / tactical | v4 / archive v2 |
| 10 — `tal` | The Magician from Riga | `Tal.pgn` | 2,430 | 2,186 / 244 | 1952–1992 | Tactical / attacking | v4 / archive v2 |
| 11 — `capablanca` | Cuban Endgame Maestro | `Capablanca.pgn` | 597 | 537 / 60 | 1901–1941 | Endgame / precision | v4 / archive v2 |
| 12 — `carlsen` | השחקן הטוב בכל הזמנים (Hebrew display string in manifest) | `Carlsen.pgn` | 7,815 | 7,035 / 780 | 2001–2026 | Universal | v4 / archive v2 |

**Repertoire/archive snapshot:** each historical profile currently reports 12 opening lines as White, 12 as Black, and two entries in each of the following archive categories: `general`, `opening`, `threat`, `tactics`, `endgame`. Verify the exact text, uniqueness, language, trigger, and UI use; category counts alone do not establish quality.

### Data integrity invariants

For each profile, verify all of the following:

- `sourceGameCount === trainingGameCount + holdoutGameCount`.
- The source PGN SHA-256 in the profile matches the current source file.
- A game is attributed to the player only when a normalized exact identity match is found in the PGN `[White]` or `[Black]` header. Do not infer identity from an opponent name or from move content.
- Training and holdout games are deterministically disjoint. Holdout data must not influence repertoire selection or style calibration.
- White repertoire lines are drawn from games where the historical player was White; Black lines from games where they were Black. Do not learn the historical player's style from the opponent's moves.
- Every stored opening line replays legally with the project's chess rules library.
- Held-out positions have a valid FEN, the side to move matches the historical player's color, and the recorded historical move is legal.
- Every phrase has a stable ID, matching category, trigger, language, and non-empty text.
- The manifest and runtime JSON agree on identity, display name, style, source metadata, repertoires, and phrase archive.

---

## 4. Per-bot status and risk register

### 4.1 `anand` — The Lightning Strategist — FIRST / ACTIVE SCOPE

**Source:** `Anand.pgn`  
**Current metadata:** 4,253 games; 3,828 training / 425 holdout; 1984–2026; 2,157 White games / 2,096 Black games; 1,485 wins / 2,150 draws / 618 losses in the source report; style `universal`; source generator v4; phrase archive v2.

**Existing work observed:** The manifest has the alias `The Lightning Strategist`, 12 opening lines per color, and five phrase categories. The generator includes an Anand style profile with small bonuses for opening development, central pawns, castling safety, and endgame king activity. The holdout checker includes an Anand-specific regression test ensuring position-based opening matching ignores FEN halfmove/fullmove counters only when the opt-in flag is present.

**Known evidence / issue:** In the most recent older workflow run inspected (`40141857879`, commit `abbdf39`), Anand's profile-contract checks, production build, tactical accuracy, holdout check, and surprise-response check passed. The Stockfish step failed because four searches exceeded the 15,000 ms limit at target depth 5. This run is not on the current branch HEAD and cannot qualify the current profile.

**Risks to test:**
- The PGN date range ends in 2026; verify every 2026 game header is genuine and not malformed, duplicated, or from an unintended source update.
- Confirm the alias is used consistently in every user-visible surface and in all generated phrases. Internal research may retain the real source identity, but user-facing labels and generated commentary must use the approved alias.
- The universal/dynamic style hypothesis may be too generic. Validate it using measured training/holdout signals rather than simply renaming the style.
- Search timeout must not be interpreted as a chess-quality failure or a pass. It is an infrastructure/validation failure that must be handled explicitly.

**Treatment / next steps:** Work on Anand only; record exact HEAD and source hash; run the targeted generator only if data are stale; inspect manifest/runtime diff; inspect all phrase strings and UI surfaces; validate repertoire provenance; run holdout, surprise, tactical, and Stockfish checks; tune Stockfish runtime/position budget only through an explicit, defensible test change; run build and browser checks; record real results. Do not proceed to Marshall until the report is shown and the user explicitly approves the next bot.

### 4.2 `marshall` — The Tactical Hammer

**Source:** `Marshall.pgn`; 1,024 games; 921 / 103 train/holdout; 1899–1941; style `attacking`.

**Main risks:** A simplistic attacking bonus can reward unsound sacrifices; old PGN notation or incomplete headers may reduce reliable attribution; the historical game set may overrepresent famous tactical games; raw capture/check rates do not prove that a sacrifice was sound.

**Treatment:** After approval, audit source parsing and color split; evaluate open lines, development speed, initiative and sacrifice candidates. Every sacrifice-like choice should be reviewed against Stockfish and material/positional compensation. Keep tactical style bonuses bounded. Preserve the current display alias and test phrase uniqueness. Do not use win rate alone as proof of style or strength.

### 4.3 `anderssen` — The Immortal Gambit

**Source:** `Anderssen.pgn`; 680 games; 611 / 69; 1844–1878; style `attacking`.

**Main risks:** Nineteenth-century games have different opening theory and source-data conventions; a modern engine may penalize historically typical speculative play; “immortal gambit” branding may tempt the bot to sacrifice material without compensation; the source sample is smaller than modern datasets.

**Treatment:** Validate old-game notation and replay. Treat attacking style as a hypothesis, not a command to sacrifice. Measure initiative/open-file/development signals, but prioritize legal and tactically defensible moves. Compare source-derived opening frequency separately from engine quality.

### 4.4 `capablanca` — Cuban Endgame Maestro

**Source:** `Capablanca.pgn`; 597 games; 537 / 60; 1901–1941; style `endgame`.

**Main risks:** A simplistic endgame bonus may encourage premature exchanges or overvalue king activity before an endgame exists; a 60-game holdout is useful but still a limited sample; old PGNs can contain incomplete dates or inconsistent opponent-name formats.

**Treatment:** Verify opening/middlegame/endgame holdout coverage; ensure endgame bonuses are conditional on position features and do not encourage needless exchanges. Check source attribution, color-specific repertoires, phrase archive and runtime consistency. Keep the existing bot unless checks identify a concrete defect.

### 4.5 `carlsen` — Current manifest display string is Hebrew

**Source:** `Carlsen.pgn`; 7,815 games; 7,035 / 780; 2001–2026; style `universal`.

**Main risks:** The manifest display name is currently `השחקן הטוב בכל הזמנים`, while the roadmap refers to `The Relentless Grinder`. This is a naming/consistency issue to review against the user's no-real-name display rule and the approved naming convention. A generic “best ever” label is subjective and not a style description. The source is large, so PGN parsing and holdout checks can be costly. Verify that source identity matching does not pull in games of similarly named players or duplicate events.

**Treatment:** Do not rename it as part of Anand work. When Carlsen is approved, choose one consistent alias, confirm it appears on every UI surface, verify generator v4 provenance and coverage in all tests, and check whether the large PGN can be processed within runner limits. Keep style and strength separate.

### 4.6 `fischer` — The Precision Machine

**Source:** `Fischer.pgn`; 825 games; 742 / 83; 1955–1992; style `positional` / precision.

**Main risks:** “Precision” can be mistaken for proof of high engine accuracy; a limited holdout can make style-similarity percentages noisy; a positional bonus may suppress necessary tactics or active counterplay.

**Treatment:** Report Stockfish move quality separately from style signals and historical move overlap. Include forced tactics, defense, conversion of advantage, and opening coverage in both colors. Never use the nickname as an acceptance metric.

### 4.7 `karpov` — The Quiet Squeeze

**Source:** `Karpov.pgn`; 3,525 games; 3,173 / 352; 1961–2022; style `positional`.

**Main risks:** The 2022 end year needs source-level inspection to understand which games are included; it may be valid source content, but it must not be accepted without checking headers/events. A positional bias can become passive and fail to exploit tactical opportunities. A high draw rate is not by itself evidence of positional fidelity.

**Treatment:** Check all late-dated games and attribution; compare source and holdout style signals; test active defense, piece improvement, restricting counterplay, and tactical shots. Ensure positional bonuses never override a forced win, checkmate, or clear tactical necessity.

### 4.8 `kasparov` — The Dynamic Storm

**Source:** `Kasparov.pgn`; 556 games; 501 / 55; 2000–2021; style `attacking` / dynamic.

**Main risks:** The dataset's date range is 2000–2021. This may reflect rapid, blitz, exhibition, or other records, but it should be inspected rather than assumed correct. The holdout is only 55 games. Aggressive bonuses can conflate initiative with unsound material sacrifices.

**Treatment:** Audit representative games and the latest-dated records. Validate source identity, dates, game type and color. Test initiative and piece activity with Stockfish compensation checks; do not infer style from the attacking label alone.

### 4.9 `morphy` — The Open-Board Virtuoso

**Source:** `Morphy.pgn`; 211 games; 189 / 22; 1848–1866; style `attacking`.

**Main risks:** Small holdout (22 games), historical notation, and era-specific opening conventions. A modern engine's preferred move can differ from historical practice; exact historical-move overlap is not a quality score.

**Treatment:** Validate every selected holdout position; use phase-aware reports and report uncertainty caused by the small sample. Focus style checks on development, open lines, initiative, and conversion of lead in development without blindly rewarding sacrifices.

### 4.10 `nakamura` — The Tactical Speedster

**Source:** `Nakamura.pgn`; 10,214 games; 9,194 / 1,020; 1997–2026; style `tactical`.

**Main risks:** Very large source size can increase generator, CI, and Stockfish runtime; games may cover different time controls, which can alter practical move choices; tactical style bonuses can reward checks/captures that are objectively poor. The 2026 end year should be validated against source headers.

**Treatment:** Verify source hashes and sample representative games across time controls if that metadata exists. Keep style weights bounded, test tactical accuracy and surprise responses, and budget Stockfish searches by phase and timeout. Do not silently drop slow positions or treat missing scores as passing.

### 4.11 `polgarj` — The Fearless Attacker

**Source:** `PolgarJ.pgn`; 1,823 games; 1,640 / 183; 1987–2014; style `attacking` / tactical.

**Main risks:** An attacking persona can become caricatured if it sacrifices without calculating the opponent's best defense; historical move overlap may be low even for sound alternative moves; identity aliases and accents need normalization.

**Treatment:** Verify source headers and alias normalization. Include tactical attack and defense positions in holdout. Evaluate candidate sacrifices and defensive resources with Stockfish. Keep phrase archive original and avoid fabricated quotations.

### 4.12 `tal` — The Magician from Riga

**Source:** `Tal.pgn`; 2,430 games; 2,186 / 244; 1952–1992; style `attacking` / tactical.

**Main risks:** The bot can be reduced to “always sacrifice” rather than approximating Tal's tactical calculation. The repository has explicit naming/disclosure requirements. Historical game counts may differ from older progress notes (2,431 in an earlier report versus 2,430 in the current manifest); this difference must be reconciled by source hash and generator output rather than guessed away.

**Treatment:** Keep the display name `The Magician from Riga` or `Tal-Inspired Bot`, and clearly disclose that it is an independent bot inspired by historical playing patterns and has no official association with the player or estate. Never use `Mikhail Tal Bot` as the display name. Audit sacrifice soundness with engine analysis and document count differences with exact source hash / parser output.

---

## 5. Phrase archive requirements

Every historical bot must have a source-appropriate, original phrase archive with five categories:

1. `general`
2. `opening`
3. `threat`
4. `tactics`
5. `endgame`

Current manifest entries report two phrases per category. The exact phrases still need review for each bot. The generator normalizes archives and sanitizes known player identities for custom archives, but that mechanism itself must be tested; a sanitizer can miss spelling variants, initials, diacritics, punctuation, or an unexpected alias.

Required phrase checks:

- Stable unique phrase IDs scoped to the bot and category.
- `category` matches the containing archive key.
- Non-empty `trigger`, `text`, and `language`.
- Correct language for the UI (current generated archive metadata reports Hebrew, even though this master handoff document is English).
- No real player name in user-facing display text where the no-real-name policy applies.
- No invented statement presented as a historical quote. Phrase text must be original, or a genuine quote must have a documented source and attribution approval.
- Phrases should respond to the current game context. If runtime selection only shows a generic `quips` array, category coverage in JSON does not prove context-aware behavior.
- Do not overuse one repeated sentence, and do not attach the wrong bot's phrase to another bot.

When a phrase test fails, identify whether the issue is in source text, sanitizer, archive generator, manifest/runtime copy, or UI selection. Fix the smallest relevant layer, regenerate only the approved bot, and rerun phrase, manifest, UI, and regression checks.

---

## 6. Style fidelity versus chess strength

These are separate acceptance dimensions.

### What the current metrics can support

The generator calculates source counts, game outcomes, White/Black counts, average game length, capture/check/late-king-move rates, opening diversity, representative games, and held-out positions. These are descriptive signals. They can help form a style hypothesis, but they do not establish intent, strength, or exact player imitation.

### What the move engine does

`src/bot-engine.ts` uses the existing search/evaluation infrastructure. The style bonus function uses the bot's style label and source-derived metrics to add bounded preferences to selected move types/positional features. This is a heuristic bias, not a trained neural network and not a guarantee that the bot reproduces a human player's decisions.

### Required distinction in reports

- **Legality:** Is the move legal under the project's chess rules?
- **Chess quality:** How does the selected move compare with Stockfish's evaluation at a documented depth/time budget?
- **Style proxy:** How do observed captures, checks, late king moves, opening choices, and other measured signals compare with held-out source games?
- **Historical overlap:** Does the bot choose the exact historical move in the same position? This is only a style proxy; many alternatives may be equally good or better.
- **Game result:** A win/loss/draw in a tournament is not alone proof of quality or style fidelity.

If style weighting damages chess quality, reduce the style bias and prioritize legal, tactically sound moves. Do not tune style parameters against the holdout set. The holdout must remain a validation set, not a tuning set.

---

## 7. Required one-bot-at-a-time loop

The current user instruction is stricter than an older repository prompt that says batch approval covers all bots. For this work, **the per-bot approval rule wins**. Do not interpret an earlier broad approval as permission to start the next bot.

### Phase A — Freeze the baseline

1. Record the exact branch name and HEAD SHA.
2. Record the source PGN SHA-256 and current generated profile blob hashes.
3. Check for active GitHub Actions runs before launching another expensive run.
4. Save a baseline diff and current status report.
5. Keep unrelated bot profiles unchanged.

### Phase B — Validate source data

1. Parse all PGN headers and count total, accepted, rejected, and duplicate games.
2. Match the target player only from normalized White/Black header identities.
3. Report date range, color counts, game results, event/time-control metadata where available, and parser errors.
4. Confirm every move is legal and replayable; record malformed games instead of silently accepting them.
5. Split training and holdout deterministically by game identity before computing repertoire or style metrics.
6. Confirm holdout games do not influence opening repertoires, training metrics, or tuning.

### Phase C — Research and style hypothesis

1. Select representative games with game IDs, event/date, opponent, color, result, and move sample.
2. Review opening, middlegame, endgame, tactical attack, defensive resource, sacrifice, and positional plans where the data support it.
3. Separate frequency statistics from engine analysis.
4. State a testable style hypothesis and uncertainty, especially for small historical datasets.
5. Do not claim that a style is validated merely because its label exists in JSON.

### Phase D — Implement the target profile only

1. Use the existing bot ID; do not create duplicate identities or replace unrelated bots.
2. Use `npm run build:legend-bots -- --only=<id>` for targeted generation.
3. Ensure display alias, profile title, persona, description, phrases, and UI surfaces follow the approved naming/disclosure rules.
4. Keep repertoire lines separated by the player's color.
5. Add/change style weights only when the evidence supports a specific, bounded change.
6. Regenerate only the target bot's manifest/runtime entry and research section; inspect every changed path.
7. Preserve all pre-existing user data and files. Do not delete unrelated content.

### Phase E — Validate and fix

Run relevant checks in this order, saving reports and logs:

1. Source provenance, source hash, counts, split, color, date and opening-line checks.
2. Phrase archive and manifest/runtime consistency.
3. Legal-move / opening replay checks.
4. Held-out positions across opening, middlegame and endgame.
5. Surprise-opponent-move responses.
6. Deterministic tactical accuracy.
7. Stockfish move-quality analysis with recorded depth, timeout, FEN, score, best move and failures.
8. TypeScript/build and release checks relevant to the scope.
9. Browser/UI smoke test, including alias, phrase selection, board move, move list and review behavior.
10. Diff audit proving unrelated profiles were not modified.

If a check fails: preserve the artifact; read the exact failing assertion/log; identify root cause; change the smallest relevant code/data; rerun the failed check and related regressions. Do not weaken a test simply to make it pass. If the tool/runner is genuinely unavailable, record a blocker and evidence rather than a pass.

### Phase F — Report and stop

For the current bot, provide:

- Files changed and commit/branch link.
- Source-data counts and hash.
- Display name and phrase-archive audit.
- Repertoire and style evidence.
- Test commands, run IDs, exact pass/fail results, and artifacts.
- Remaining blockers, limitations, and confidence level.
- Explicit statement of what was not run.

Then stop. Ask the user whether to move to the next bot. Do not begin it until the user approves.

### Phase G — Tournament and release gates

Do not run the full tournament during a single-bot qualification step. Before a tournament, confirm the intended scope, approval, runner capacity, shard design, and evidence format. Every game must be a real completed game with a PGN; every final-board PNG must correspond to that game. Never fabricate scores, PGNs, standings, screenshots, or artifacts.

Do not merge or deploy until the release checks, required profile checks, full tournament (if approved and in scope), supervisor audit, and CI on the exact release candidate pass. After any eventual merge, verify the actual merge commit on `main` and rerun the required post-merge checks. Branch deletion is a separate action requiring separate explicit approval; no branch is to be deleted automatically.

---

## 8. Known CI evidence and unresolved failures

### Current repository / PR status

- Branch `player-data-batch` HEAD at review: `2075c6a214db16e4459bbe111af342bf63c5e249`.
- PR #17 is closed and not merged. Do not assume any of this work is in `main`.
- The latest workflow runs returned by the queried Actions listing were on an older commit, `abbdf39f345929f27973ed658294af9d0ff8ce96`, not the current branch HEAD. A green run on that older SHA would not certify the current SHA; in this case the runs failed anyway.

### Observed older-run results

Run links:
- [Verify Anand by default; full Legends loop requires explicit approval — run 40141857879](https://github.com/orenzbit/veyra-chess/actions/runs/40141857879)
- [Approved full Legends loop — run 40141857817](https://github.com/orenzbit/veyra-chess/actions/runs/40141857817)

In the profile-validation job for run `40141857879`:

- Profile/identity/provenance checks: passed.
- Production build: passed.
- Tactical accuracy: passed.
- Held-out validation: passed.
- Surprise-response validation: passed.
- Stockfish move-quality step: **failed** because four Anand searches exceeded the configured 15,000 ms timeout at target depth 5. The log includes the affected FENs and an assertion failure in `scripts/check-historical-stockfish.mjs`.
- Browser smoke test and full tournament steps were skipped after the earlier failing step.
- A separate run reported that the generated-profile checkpoint push conflicted with newer branch changes and could not complete after retries. Preserve the exact log and investigate the race/rebase behavior before relying on automatic checkpoint pushes.

These are results for that older SHA only. Re-run on the current HEAD and record the new evidence.

### Correct handling of the Stockfish timeout

A timeout means the quality gate did not obtain a valid score for the tested position. It is not evidence that the bot played badly, and it is not a pass. Appropriate options include:

- Investigate why the search exceeds the timeout (position complexity, engine process readiness, repeated work, resource contention, or incorrect timeout accounting).
- Use a documented per-position time budget and bounded sample while retaining representative opening/middlegame/endgame coverage.
- Cache repeated FEN evaluations only when the cache key includes all engine settings that affect the result.
- Record timed-out positions in the report and keep the gate failed until the acceptance policy explicitly says how they are handled.
- If depth or time budget changes, update test expectations and document why the new budget still measures useful move quality.
- Never convert missing engine scores to zero loss, a successful result, or an invented evaluation.

### Checkpoint push conflict

The workflow attempted to push generated profile changes while the branch had newer commits. The failure must be treated as a concurrency/rebase problem, not ignored. Prefer serializing expensive profile-generation runs, generating on a clean checkout of the exact current branch head, checking the remote SHA before push, and retrying only after a safe fetch/rebase. If the workflow cannot prove it can preserve both changes, stop and report the conflict; do not force-push or overwrite work.

---

## 9. Workflow/documentation contradictions to resolve before full automation

1. **Per-bot approval vs batch approval:** `docs/LEGENDS_BOT_PROMPT.md` and some automation prose say a single full-batch approval covers every bot. The current user instruction explicitly requires approval after each bot. Update the source documentation only under an approved documentation/workflow task; until then, follow the stricter current user instruction.
2. **Tournament scope conflict:** older sections in `docs/LEGENDS_AUTOMATION_LOOP.md` describe a 12-historical-bot tournament with 132 games (12 bots, each pair twice). A later scope override in the same document calls for all 61 bots, exactly 3,660 games, with 120 deterministic shards. These are materially different workloads. Do not launch until the current authorized scope is reconciled in one canonical place and the user explicitly approves the full tournament.
3. **Current PR state:** PR #17 is closed, not merged. Confirm whether work should continue on the existing branch, a new branch, or a reopened/replacement PR before release actions. Do not assume or silently change the target branch.
4. **Progress document age:** some status entries refer to older branches and older counts (for example, Tal count 2,431 in an earlier report versus 2,430 in the current manifest). Treat them as historical notes, not current facts, until source hashes and regenerated reports reconcile the difference.
5. **Carlsen naming and test coverage:** current manifest contains a Hebrew generic display label while roadmap notes refer to an English alias. Standardize later as a dedicated Carlsen task; do not alter it during Anand work.
6. **CI evidence is SHA-specific:** never cite a run as proof for a different commit. A workflow run must identify the exact `head_sha` being qualified.
7. **Tournament approval:** the full tournament must remain disabled until a distinct, explicit approval is recorded through the documented manual workflow gate. A profile-generation approval is not tournament approval.

---

## 10. Tournament protocol (only after all required profile gates and explicit approval)

The tournament scope must first be resolved. The later scope note currently says all 61 manifest bots and exactly 3,660 games, 120 deterministic shards. If that scope remains authorized, independently verify the arithmetic and pairing generation before launch: for every unordered pair, play two games with reversed colors. For 61 bots, there are 61 × 60 = 3,660 ordered color-assignment games in the specified double round-robin.

For each game, preserve:

- unique game ID;
- both stable bot IDs and display names;
- assigned colors;
- actual start/end timestamps and clock settings if the runner implements clocks;
- full move sequence and a valid standalone PGN;
- result, termination reason, ply count, final FEN;
- any engine errors, illegal moves, timeout, crash or incomplete-game flag;
- PNG evidence of the actual final board.

The supervisor audit must check the raw games, not only trust the runner summary. It should detect missing games, duplicate IDs, incomplete PGNs, illegal move sequences, incorrect color reversals, impossible results, missing final FENs, missing PNGs, and discrepancies between PGN result and summary. Failed games return to a repair/replay process; they must not be fabricated or silently excluded.

A draw or loss does not automatically fail a bot's operational qualification. A game fails when it is illegal, incomplete, malformed, or violates the tournament protocol. Report standings only from the audited completed-game dataset. Keep pre-merge and post-merge evidence separate. Do not merge, deploy, or delete a branch as a side effect of the tournament run.

---

## 11. Recommended status vocabulary

Use exactly these meanings in progress reports:

- **Not started:** no work on this bot in the current approved cycle.
- **In progress:** source audit, implementation, or tests are underway.
- **Blocked:** a documented blocker prevents progress; include the evidence and attempted recovery.
- **Profile generated:** the JSON profile exists; this does not imply quality gates passed.
- **Qualified for next bot:** all required single-bot acceptance gates passed on the exact commit and the user has been shown the report. This status permits asking to move on, not moving on automatically.
- **Tournament-ready:** all profiles in the authorized scope are qualified and the user has explicitly approved tournament execution.
- **Release-ready:** all required checks, approved tournament/audit evidence, CI, diff review and release gates passed on the exact release candidate.
- **Merged/deployed:** only after the merge/deployment is actually confirmed in the target environment.

Never use a percentage such as “100%” unless the denominator and acceptance criteria are explicit and every required check has evidence.

---

## 12. Acceptance checklist for every historical bot

### Source and provenance
- [ ] Source PGN exists and its SHA-256 is recorded.
- [ ] Header identity matching is exact and documented.
- [ ] Date range, result distribution, White/Black counts and parser warnings are recorded.
- [ ] Training/holdout split is deterministic and disjoint.
- [ ] Repertoire and style metrics use training games only.
- [ ] Holdout positions cover opening, middlegame and endgame where source data allow it.

### Profile and UI
- [ ] Stable internal bot ID preserved.
- [ ] User-visible alias is consistent and contains no prohibited real-name display.
- [ ] Manifest and runtime JSON agree.
- [ ] At least the required number of legal source-derived opening lines exists for both colors.
- [ ] Five phrase categories exist with valid IDs, triggers, language and original text.
- [ ] Phrases are connected to the right runtime contexts and have no fabricated historical attributions.
- [ ] The UI shows the right alias and phrase, and board/move-list/review state remains consistent.

### Quality
- [ ] All selected holdout FENs parse and the source moves are legal.
- [ ] The bot returns legal moves in all tested positions.
- [ ] Surprise-response checks pass.
- [ ] Tactical accuracy check passes.
- [ ] Stockfish report contains valid scores or explicitly recorded failures; no timeout is silently passed.
- [ ] Style signals are reported separately from engine quality and historical overlap.
- [ ] Build and required checks pass on the exact commit.
- [ ] Diff confirms only the approved bot and necessary shared infrastructure changed.
- [ ] Progress/research documentation is updated with actual results.
- [ ] The user receives a report and is asked whether to approve the next bot.

---

## 13. Immediate next actions

1. **Stay on Anand only.** No other bot is authorized in the current active task.
2. Confirm the current branch HEAD is still `2075c6a214db16e4459bbe111af342bf63c5e249`; if it has moved, record the new SHA and inspect the diff before testing.
3. Inspect the exact current Anand source hash, runtime JSON, manifest entry, phrase text, and user-facing UI surfaces.
4. Run targeted provenance/profile checks and capture outputs.
5. Run build, holdout, surprise-response, and tactical checks on the current HEAD.
6. Diagnose and rerun the Stockfish gate. The previously observed 15-second timeouts are unresolved until a new run proves otherwise.
7. Run the browser smoke test once earlier required checks pass.
8. Verify that no unrelated bot data changed.
9. Update the progress report with exact commands, run IDs, artifacts, and limitations.
10. Present the Anand report to the user and stop. Ask for explicit approval before starting the next bot, expected to be Marshall according to the current roadmap.

---

## 14. Reference links

- [Repository](https://github.com/orenzbit/veyra-chess)
- [Current work branch](https://github.com/orenzbit/veyra-chess/tree/player-data-batch)
- [PR #17 — closed, not merged at review](https://github.com/orenzbit/veyra-chess/pull/17)
- [Historical profile manifest](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/public/data/bots/index.json)
- [Anand runtime profile](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/public/data/bots/anand.json)
- [Historical profile generator](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/scripts/build-historical-legend-bots.mjs)
- [Move-selection engine](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/src/bot-engine.ts)
- [PGN research report](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/docs/LEGENDS_PGN_RESEARCH.md)
- [Automation loop](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/docs/LEGENDS_AUTOMATION_LOOP.md)
- [Bot roadmap](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/docs/LEGENDS_BOT_ROADMAP.md)
- [Bot prompt](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/docs/LEGENDS_BOT_PROMPT.md)
- [Progress log](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/docs/LEGENDS_PROGRESS.md)
- [Older Anand verification run 40141857879 — failed Stockfish gate](https://github.com/orenzbit/veyra-chess/actions/runs/40141857879)
- [Older full-loop run 40141857817 — failed](https://github.com/orenzbit/veyra-chess/actions/runs/40141857817)

**End of handoff document.**
