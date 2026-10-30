# Veyra Chess — Bot Readiness, Historical Fidelity, and Release Playbook

**Purpose:** Define how to research, plan, implement, validate, approve, and release each chess bot; what “finished” means; and what must happen after every individual bot and the complete roster are ready.

**Repository:** https://github.com/orenzbit/veyra-chess  
**Reference product for feature research:** https://www.chessigma.com/

## 1. Product goal

Veyra Chess should provide polished and trustworthy chess opponents whose behavior, strength, presentation, and commentary are deliberately designed and tested.

For a historically inspired bot, the goal is not to claim that software recreated a human mind or plays exactly as a historical player did. The goal is to create an independent bot whose observable choices are supported by evidence from that player's games and whose limitations are described honestly.

A bot is complete only when all applicable areas work together:

1. Identity, profile, visual design, and language.
2. Traceable and validated source data.
3. Legal, robust move selection that is evaluated against the intended style and strength.
4. Color-specific opening repertoire derived from the target player's own moves.
5. Original, context-appropriate commentary with no fabricated historical quotations.
6. Integration into all relevant game and review flows.
7. Real test results, including data, engine, holdout, regression, build, and UI checks.
8. Documentation, known limitations, and explicit user approval before proceeding to another bot.

A JSON profile, distinctive name, successful build, or small number of wins does not prove that a bot is finished.

## 2. Non-negotiable rules

1. **One bot at a time.** Research, plan, implement, test, and report on one bot before starting another.
2. **Approval before implementation.** Present bot-specific findings and a detailed plan. Do not change implementation files until the user approves the plan.
3. **Approval after each bot.** After reporting results, stop and ask whether to proceed. A batch approval does not override this rule unless the user explicitly changes it.
4. **Baseline first.** Record the branch and commit; inspect relevant files, dependencies, tests, entry points, and UI surfaces before editing.
5. **No unrelated changes.** Keep each bot's work isolated. Explain and request approval before material scope expansion.
6. **Evidence, not assumptions.** Never claim a test, browser run, tournament, build, push, or deployment succeeded unless it actually ran and its result was inspected.
7. **No fabricated evidence.** Never invent PGNs, screenshots, metrics, historical quotes, benchmark outcomes, or test results.
8. **Unknown means unknown.** Mark unverified items UNKNOWN or BLOCKED, not complete.
9. **No automatic release actions.** Do not merge to main, deploy, delete branches or existing files, or run a full tournament without the required explicit approval.
10. **Preserve compatibility.** Keep stable internal bot IDs and existing data contracts unless an approved plan requires a migration.
11. **Respect provenance and licensing.** Record the origins and applicable terms of code, assets, engines, and datasets. Do not copy unlicensed code or data.
12. **Check current state.** Old PRs, old assistant messages, stale CI runs, and previous successful builds do not prove the current commit is valid.

## 3. Required workflow for every bot

### Phase A — Baseline and scope

Before changing files:

- Confirm repository, branch, current commit SHA, and working-tree state where available.
- Inspect the current manifest, individual profile, data generator, move-selection engine, phrase archive, tests, and CI workflows.
- Trace where bot ID, display name, persona, style, repertoire, phrases, tier/strength, and source metadata are consumed.
- Identify every relevant user-facing surface: bot picker, profile card, match header, game screen, commentary, result, review, rematch, and responsive/mobile layouts.
- Record relevant baseline test results.
- List the files expected to change and the areas explicitly out of scope.

**Output:** a baseline report with verified facts, uncertainties, risks, and scope.

### Phase B — Research the target player and style

For a historically inspired bot:

1. Identify the intended historical player using reputable sources.
2. Record the exact game archive/source, source file, retrieval details when known, and license or terms.
3. Validate PGN syntax and headers, player aliases, dates, colors, results, duplicates, malformed games, variants, and ambiguous attribution.
4. Do not identify a target player merely because their surname appears in an opponent's name or unrelated text.
5. Separate games where the target player played White from games where they played Black.
6. Record valid game counts, date range, exclusions and reasons, and train/holdout split.
7. Prevent duplicate games and near-identical positions from leaking between training and holdout sets.
8. Form measurable style hypotheses from actual moves and positions, not only biography or stereotype.
9. Define metrics and a comparison baseline before tuning.
10. Clearly separate sourced facts from hypotheses and inference.

Possible metrics include opening choices, tactical and forcing-move frequency, sacrifice decisions and compensation, king safety, piece activity, pawn structure, endgame transitions, advantage conversion, defensive resources, risk, and draw tendency. Use only metrics that are meaningful and supported by the data.

**Output:** a research report with source provenance, data counts, style hypotheses, evaluation design, and limitations.

### Phase C — Compare with the reference product

Research the relevant Chessigma behavior and inspect the current Veyra Chess implementation. Describe what the reference feature demonstrably does, what user problem it solves, and what is present in the repository. Do not copy proprietary code, text, assets, or protected expression.

Classify the current state as exactly one of:

- **Build from scratch:** the needed capability is absent.
- **Rebuild:** an implementation exists, but its architecture or behavior cannot reliably meet the requirement.
- **Small change:** a working implementation needs targeted changes.
- **No change:** the requirement is already met and verified.

Document the evidence, rationale, user value, unnecessary scope, and any data, license, accessibility, performance, or maintenance risks. Do not assume every reference-product feature is required.

### Phase D — Plan and request approval

Before implementation, present:

- Baseline and findings.
- Source-data gaps.
- Display identity, visual design, and UX requirements.
- Proposed style model and measurable evaluation.
- Phrase archive plan.
- Exact expected files and ordered implementation steps.
- Tests, acceptance criteria, risks, and explicit non-goals.
- Dependencies or uncertainties that could block progress.

Wait for approval. If implementation reveals a material new requirement or requires work outside the approved scope, stop and ask again.

### Phase E — Implement in isolated steps

- Make the smallest coherent change for the approved bot.
- Preserve stable IDs and contracts.
- Prefer a bot-specific generation mode rather than regenerating every bot.
- Before running shared generators, confirm their scope and guard against unintended changes.
- Keep public presentation separate from internal source attribution.
- Add or update tests alongside behavior changes.
- Run narrow tests after each meaningful step.
- Inspect the full diff for accidental changes.

If a requirement cannot be verified, mark it UNKNOWN and stop at the relevant gate.

### Phase F — Validate and report

Use Sections 7–10. Report what changed, evidence, test outcomes, known limitations, readiness score, and hard-gate status. Then stop and ask the user for explicit approval before starting the next bot.

## 4. Identity, naming, design, and UX

### Internal identity versus public display

- Preserve the stable machine-readable ID unless an approved migration is needed.
- Use the approved public alias consistently wherever the product shows the bot.
- If project policy prohibits real player names in the product UI, audit every user-facing surface—not just the main profile name.
- Real names may remain in internal source metadata and research documentation when needed for traceability, but must not leak through visible labels, quips, descriptions, tooltips, accessible labels, results, or user-facing errors.
- Describe the bot as an independent historically inspired bot. Do not imply endorsement, official affiliation, consciousness, or an exact recreation of a human player.
- Never claim “plays exactly like the original player” without evidence that could justify such a claim; normally use a qualified statement about measured similarities.

### Design review

Verify the bot in the real product, not only in JSON:

- Name, subtitle, description, style label, and difficulty agree.
- Visual treatment fits Veyra Chess and remains consistent with its design system.
- Layout is readable and usable at supported viewport sizes and on touch devices.
- Text is localized appropriately and does not overflow or duplicate awkwardly.
- Accessible text follows the same identity policy.
- Game, review, results, and rematch consistently use the selected bot.
- Commentary does not block board input or destabilize layout.
- UI does not imply measured strength when strength is not calibrated.

A design review is incomplete until the rendered interface is checked at runtime.

## 5. Source data and repertoire

For each bot, maintain a data ledger with:

| Field | Required evidence |
|---|---|
| Source | URL/archive and exact file identifier |
| Attribution | Rules used to identify the target player |
| Valid games | Count after parsing and validation |
| Date range | Earliest/latest valid game when known |
| Color counts | Target-player games as White and Black |
| Results | Win/draw/loss from the target player's perspective |
| Exclusions | Duplicates, malformed/ambiguous games, and reasons |
| Training/holdout | Counts, split method, and leakage checks |
| Derived data | Repertoire, positions, metrics, examples, generator version |
| Limitations | Missing headers, uncertain attribution, small sample, licensing issues |

Counts must reconcile. Unexplained discrepancies block the data gate.

### Color-correct repertoire

- White repertoire comes from the target player's own moves in games where they played White.
- Black repertoire comes from their own moves in games where they played Black.
- Never use the opponent's moves as the target player's repertoire.
- Validate side to move, move sequence, replayed PGNs, and opening positions.
- Opening frequency is descriptive, not a measure of quality.
- Validate repertoire against held-out games and positions.
- Disclose limitations when the source sample is too small or attribution is uncertain.

### Reproducibility

- Make generation deterministic where practical.
- Record generator version and configuration.
- Rebuilding one bot must not silently rewrite others.
- Compare generated output against the baseline.
- Keep source data and derived profiles synchronized, or document intentional differences.

## 6. Phrase archive and personality

The current historical-bot system expects these categories, subject to verification against the live schema:

- general
- opening
- threat
- tactics
- endgame

Phrase requirements:

- Commentary is original; do not invent historical quotes or attribute generated text to the real player.
- Each phrase fits the bot's persona and actual board situation.
- Do not claim a threat, sacrifice, tactic, or endgame that is not present.
- Follow the display-name policy and avoid real-name leaks.
- Avoid boilerplate repetition, malformed text, awkward translation, offensive content, and unsupported factual claims.
- Preserve required IDs, category, trigger, language, and other schema fields.
- Check uniqueness after normalization.
- Test that runtime selection displays the intended archive; valid JSON alone is insufficient.
- Test missing, empty, malformed, and outdated archives and safe fallback behavior.
- Ensure commentary does not duplicate on rerender or replay and does not appear in inappropriate states.

**Phrase acceptance:** every required category has the schema-required number of valid lines; text is original and sufficiently varied; identity and attribution rules pass; contextual triggers are tested; runtime rendering is verified.

## 7. Proving that a bot plays like itself

A style label such as attacking, positional, or universal is not evidence. Actual move-selection behavior must be evaluated.

### Separate four questions

- **Style fidelity:** Does behavior match measured tendencies from the target player's games?
- **Chess quality:** Are moves legal and reasonably sound, with measured evaluation loss and blunder frequency?
- **Difficulty calibration:** Does the bot provide the intended challenge?
- **Repertoire fidelity:** Do opening choices reflect the target player's own color-specific moves?

Do not use win rate alone as proof of style. Do not use engine agreement alone as proof of style. Do not randomly weaken moves and call that historical personality.

### Holdout evaluation

- Use games and positions excluded from training and tuning.
- Prevent duplicate games and near-identical test positions from contaminating the split.
- Evaluate opening, middlegame, and endgame positions where data supports them.
- Include both colors where relevant.
- Compare bot choices with the target player's historical move and with a strong engine baseline.
- Report top-1/top-k historical move agreement where meaningful, engine evaluation loss in centipawns or mate outcomes, and sample sizes.
- Interpret move agreement carefully: human and engine choices can differ while both are sound, and an exact match does not prove general style fidelity.
- Report uncertainty; a tiny sample is not conclusive.

### Engine testing

Use a strong engine such as Stockfish when available and properly configured. Record version, depth/time settings, position source, side to move, and evaluation convention.

Test:
- Legal moves and correct game-state handling.
- Tactical oversights and blunders.
- Evaluation loss against the reference engine under consistent settings.
- Reproducibility or controlled variation according to intended policy.
- Opening, middlegame, tactical, check, checkmate, and endgame behavior.
- Runtime budget, cancellation, and fallback paths.

Engine results measure chess quality, not historical style directly. Do not compare evaluations from incompatible settings as if equivalent.

### Controlled comparisons

Where useful, compare against the previous implementation, a neutral baseline policy at comparable settings, historical holdout positions, and other bots only when a scoped comparison is approved. Use fixed positions and recorded configurations. For stochastic selection, record seeds when supported and report distributions across multiple runs.

## 8. Automated, integration, and UI testing

Verify actual test commands and scripts in the current repository before relying on their names.

### Data and schema
- Parse relevant JSON and PGN.
- Validate required fields, stable IDs, schema versions, phrase categories, repertoire structure, and source metadata.
- Check manifest/profile consistency and deterministic generation.
- Confirm no other bot data changed unexpectedly.

### Chess behavior
- Every selected move is legal.
- Invalid positions, malformed PGN, and unsupported variants fail safely.
- Check, checkmate, stalemate, draw, promotion, castling, en passant, and game-over handling work as applicable.
- Cancellation and error paths do not leave the UI stuck.
- The bot never moves for the wrong side or after game end.

### Integration and regression
- Bot selection loads the correct profile and move policy.
- Game start does not use a cached/default bot by mistake.
- Correct persona, strength policy, repertoire, and phrase archive are used at runtime.
- Move list, clocks, board state, PGN export, review, rematch, and results still work.
- Shared features and other bots still work.
- Persistence and caches remain compatible.

### UI and build
- Inspect the rendered product in a browser or supported UI test.
- Test relevant desktop and narrow/mobile layouts.
- Check display alias and name leaks across labels, tooltips, accessible text, comments, and results.
- Confirm commentary is contextual, readable, and does not block the board.
- Capture genuine screenshots where required.
- Run targeted tests, relevant full tests, and production build.
- Record exact commands, exit codes, CI links, and commit SHA.
- A queued, running, cancelled, stale, or unrelated CI run is not a pass.
- Document skipped, flaky, or environment-blocked tests and their impact.

## 9. Definition of Done — per bot

A bot is READY only when all applicable hard gates pass.

### Hard gates

- [ ] Scope and acceptance criteria approved before implementation.
- [ ] Baseline and changed-file scope documented.
- [ ] Source attribution, data quality, and provenance are adequate.
- [ ] Training/holdout separation is credible and documented.
- [ ] White and Black repertoires use the target player's own moves on the respective color.
- [ ] Internal ID, manifest, profile, and runtime contract are consistent.
- [ ] Display name, design, and accessibility text follow approved policy.
- [ ] Phrase archive is structurally valid, original, contextual, and compliant.
- [ ] Legal-move and game-state tests pass.
- [ ] Style is measured on holdout data against pre-defined metrics; limitations are documented.
- [ ] Chess-quality/engine tests have real results; material failures block readiness.
- [ ] Relevant UI flows are inspected at runtime.
- [ ] Relevant tests and build pass on the reported commit, or exceptions are explicitly approved and documented.
- [ ] No unintended changes to other bots or shared features remain.
- [ ] Documentation and completion report are updated.
- [ ] User reviewed the report; the next bot has not started without separate approval.

### Internal quality score

Use this 100-point score as a diagnostic summary, not as a substitute for hard gates:

| Area | Points |
|---|---:|
| Data provenance and correctness | 15 |
| Historical/style fidelity evidence | 20 |
| Chess quality and engine validation | 15 |
| Repertoire correctness | 10 |
| Phrase/personality quality | 10 |
| UI, naming, accessibility | 10 |
| Integration and regression safety | 10 |
| Documentation and reproducibility | 10 |
| **Total** | **100** |

**Target: 95/100 or higher.** The score must be evidence-backed and cannot override a failed hard gate. A bot with a high score but illegal moves, a prohibited name leak, contaminated holdout data, or failed critical test is NOT READY.

### Status definitions

- **NOT STARTED:** baseline audit not done.
- **RESEARCHING:** research and baseline in progress.
- **PLAN PENDING APPROVAL:** findings exist; implementation is not approved.
- **IN PROGRESS:** approved implementation or validation is underway.
- **BLOCKED:** a dependency, source, permission, or test prevents safe progress.
- **NOT READY:** one or more hard gates failed.
- **READY WITH DOCUMENTED LIMITATIONS:** hard gates pass; a non-critical limitation remains and is disclosed.
- **READY:** all hard gates pass and evidence supports the claims.

Never change UNKNOWN, BLOCKED, or NOT READY to READY just to meet a deadline.

## 10. Required completion report for each bot

1. **Bot and scope:** stable ID, approved display identity, branch, commit.
2. **Summary:** changes and reasons.
3. **Baseline:** starting state and pre-existing issues.
4. **Source data:** source, valid counts, color counts, split, date range, exclusions, provenance.
5. **Identity and UI:** surfaces checked, naming audit, responsive/accessibility results.
6. **Phrases:** category counts, uniqueness and trigger checks, runtime evidence, name-leak audit.
7. **Style fidelity:** pre-defined metrics, holdout size, results, baseline, uncertainty.
8. **Chess quality:** engine/version/settings, evaluation results, legality tests, failures, limitations.
9. **Tests:** exact commands and outcomes; CI links for the reported commit.
10. **Diff safety:** changed files and confirmation that unrelated bots were not modified.
11. **Score and status:** point breakdown, hard-gate checklist, readiness status.
12. **Known limitations:** unresolved or accepted limitations and rationale.
13. **Decision requested:** ask whether to proceed to the next bot.

Do not claim a score is independently verified unless the method and evidence are reproducible.

## 11. Full-roster management

Use the current manifest as the source of truth for the bot roster; do not assume old bot counts remain accurate.

Maintain a ledger with one row per bot and these fields:

- Stable bot ID and approved display identity.
- Source/data status.
- Plan approval.
- Implementation status.
- Data, phrase, style, engine, UI/integration, and CI/build gate status.
- Overall readiness status.
- Links to research, tests, CI, evidence, and commit.
- User approval for proceeding.

Update the ledger only from verified evidence. Similar bots do not inherit each other's readiness.

Required order:
1. Audit the roster and identify gaps without bulk-editing.
2. Select one bot.
3. Research and compare.
4. Present the plan and wait for approval.
5. Implement and validate only that bot.
6. Report and pause for approval.
7. Repeat for the next approved bot.

Shared infrastructure changes are allowed only when necessary for the approved bot, carefully scoped, regression-tested, and disclosed. Ask before material scope expansion.

## 12. After every bot is individually ready

After the user has approved each individual bot and all intended bots have a documented ready status, start a separate roster integration and release-readiness phase. This phase needs its own scope and approval.

### Step 1 — Reconcile the roster
- Re-read the current manifest and compare it with the readiness ledger.
- Confirm each intended bot appears exactly once and every stable ID resolves.
- Identify missing, duplicate, obsolete, or unexpected profiles.
- Do not remove bots or files without explicit approval.

### Step 2 — Full data and identity audit
- Validate all profiles against the current schema.
- Check manifest/profile consistency and generator versions.
- Audit all user-facing surfaces for prohibited real-name leaks.
- Check phrase archives and fallback templates.
- Reconcile source counts and color-specific repertoire.
- Record all exceptions.

### Step 3 — Shared-feature regression
- Test bot selection, game start, move selection, completion, clocks, PGN, review, rematch, and shared UI.
- Verify engine changes across all tiers and profiles.
- Test error, fallback, cache, and missing-data paths.
- Run the complete relevant suite and production build on the exact release candidate commit.

### Step 4 — Approved tournament or benchmark
A full tournament is separate and requires explicit approval before execution.

When approved:
- Freeze the candidate commit and configuration.
- Define format, colors, time/search budgets, seeds, and stopping conditions in advance.
- Play both colors for each pairing when practical.
- Preserve genuine PGNs and required final-position evidence.
- Record crashes, illegal moves, timeouts, adjudications, and engine failures.
- Never fabricate games or silently discard losses.
- Report sample sizes and uncertainty. Tournament performance measures relative strength, not historical fidelity by itself.
- Tournament success does not authorize merge or deployment.

### Step 5 — Performance and reliability
- Measure response time and resource use on representative positions/devices.
- Verify cancellation, timeout, and fallback behavior.
- Check data/phrase loading and memory use.
- Check for nondeterminism and cross-game state leakage.
- Document bottlenecks and fix only within approved scope.

### Step 6 — Final documentation and release candidate
- Update the roster ledger and project progress docs.
- Summarize completed, blocked, and accepted-limitation items.
- Record provenance and licensing notes.
- Link tests, CI, benchmark artifacts, and exact commit.
- Prepare release checklist and rollback plan.
- Review relevant security, privacy, accessibility, and legal/provenance concerns.

### Step 7 — Request explicit release approval
Present the consolidated report and request a decision. Do not merge to main, publish, deploy, or delete branches/files without explicit authorization.

## 13. Definition of “the entire bot project is finished”

The bot project is finished only when:

- Every intended bot has an approved scope and completion report.
- Every bot passes applicable hard gates.
- The roster ledger matches the current manifest.
- Cross-roster naming, phrase, schema, source, and repertoire audits pass.
- Shared integration and regression tests pass.
- Full build and CI results match the release candidate commit.
- Any approved tournament/benchmark is complete and evidence is archived.
- Known limitations and unverified areas are documented.
- Project docs and user-facing claims accurately reflect evidence.
- The user reviews the consolidated report and explicitly approves the next release action.

This does not automatically authorize merging, publishing, deploying, or deleting branches. Those are separate decisions.

## 14. Evidence and reporting rules

Label evidence as one of:

- **Verified:** directly observed in code, data, test output, or runtime behavior.
- **Measured:** produced by a reproducible test/benchmark with recorded configuration.
- **Inferred:** a reasoned conclusion with uncertainty stated.
- **Unknown:** not verified or insufficient evidence.
- **User-approved:** explicitly approved by the user; approval is not technical verification.

For each test, record its name, exact command/configuration, commit/environment where practical, status, output/artifact/CI link, and caveats.

A successful build does not replace runtime testing. Runtime testing does not replace data validation. Engine strength does not replace style validation.

## 15. Checklist before starting the next bot

- [ ] The prior bot has a completion report.
- [ ] Its status and known limitations are documented.
- [ ] The user explicitly approved proceeding.
- [ ] Current repository state and target branch were rechecked.
- [ ] The new bot's baseline has been audited.
- [ ] Research and reference-product comparison are complete.
- [ ] Build/rebuild/small-change/no-change classification is documented.
- [ ] A bot-specific plan and acceptance criteria are ready for approval.
- [ ] No implementation began before approval.

## 16. Final principle

A finished bot is not just a name, persona, phrase list, or profile that passes a build. It is an integrated, tested, evidence-backed chess opponent whose public presentation is honest, whose behavior is evaluated against the intended identity, whose data and limitations are traceable, and whose completion is documented.

**Work one bot at a time. Measure what can be measured. State uncertainty honestly. Stop at failed gates. Ask before expanding scope, moving to the next bot, running a full tournament, merging, or deploying.**
