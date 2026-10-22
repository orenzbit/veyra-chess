# Veyra Chess — per-bot phrase, identity, and playing-style audit

## Scope and execution rule

Audit every bot in `public/data/bots/index.json` one at a time. There are 61 existing profiles: 49 original fictional personas and 12 PGN-backed historical profiles. Skip Magnus Carlsen's **style/gameplay audit and profile tuning** as requested, but keep him in the cross-cutting display-name privacy check so no real player's name is shown in the game UI. Do not run the full round-robin tournament: the workflow requires a separate explicit tournament approval.

## Acceptance gates (each bot)

1. **Identity/display gate:** the in-game display name is a fictional alias; no real player's name leaks through title, persona, flavor, quips, phrase archive, or UI-facing description. Internal IDs, PGN filenames, source attribution, and research records may retain names for provenance.
2. **Phrase gate:** all five contexts (general, opening, threat, tactics, endgame) exist; the game actually selects from the contextual archive; text is non-empty, Hebrew where required, unique enough to distinguish the bot, consistent with the persona, and does not assert a false historical quote.
3. **Style hypothesis gate:** record a falsifiable, data-grounded style hypothesis; don't treat labels such as attacking/positional as proof. Compare training-derived features with held-out games and report uncertainty.
4. **Move-quality gate:** run a legal-move test and Stockfish analysis on reproducible held-out positions; record historical move, bot move, engine best move, centipawn loss, blunders, and sacrifice candidates. A sacrifice is only called brilliant after checking the continuation and engine evaluation; a heuristic flag is not proof.
5. **Adversarial review:** look for leakage, duplicate phrases, data leakage between training/holdout, side-to-move bugs, deterministic-search bugs, and engine/runtime mismatch.
6. **File quality gate:** review each changed file separately; score against role-specific criteria and only mark passed at 95/100 or better with real test evidence. If the environment cannot run a test, mark it blocked rather than inventing a result.

## Per-profile plan

| Order | Profile | Intended style hypothesis | Required individual validation | Status |
|---:|---|---|---|---|
| 1 | The Tactical Hammer (Frank Marshall source) | attacking, initiative and concrete tactics | held-out phase sample + Stockfish + phrase audit | planned |
| 2 | The Open-Board Virtuoso (Paul Morphy source) | rapid development and open lines | held-out phase sample + Stockfish + phrase audit | planned |
| 3 | The Immortal Gambit (Adolf Anderssen source) | attacking and sacrificial play | held-out phase sample + sacrifice review + phrase audit | planned |
| 4 | The Magician from Riga (Mihail Tal source) | initiative and speculative-looking but calculable sacrifices | held-out phase sample + sacrifice continuation review + phrase audit | planned |
| 5 | Cuban Endgame Maestro (José Raúl Capablanca source) | simplification, piece activity, endgame technique | held-out phase sample + endgame positions + phrase audit | planned |
| 6 | The Fearless Attacker (Judit Polgár source) | active attacking and tactical play | held-out phase sample + Stockfish + phrase audit | planned |
| 7 | The Quiet Squeeze (Anatoly Karpov source) | restriction, prophylaxis, positional pressure | held-out phase sample + positional feature comparison + phrase audit | planned |
| 8 | The Precision Machine (Bobby Fischer source) | precise development and conversion | held-out phase sample + Stockfish + phrase audit | planned |
| 9 | The Tactical Speedster (Hikaru Nakamura source) | tactical alertness and active defense | held-out phase sample + Stockfish + phrase audit | planned |
| 10 | The Lightning Strategist (Viswanathan Anand source) | adaptable, balanced play | held-out phase sample + phase-wise feature comparison + phrase audit | planned |
| 11 | The Dynamic Storm (Garry Kasparov source) | dynamic initiative and attacking pressure | held-out phase sample + sacrifice review + phrase audit | planned |
| — | Magnus Carlsen source profile | **skip profile/style tuning** | only cross-cutting public display-name privacy check | intentionally skipped |
| 12 | Remaining 49 fictional personas | each must match its declared fictional persona and style | five-category phrase audit, uniqueness/leakage checks, legal moves, style-appropriate positions | planned |

## Order of execution

1. Fix the source generator so it always uses the public alias, not the historical source name.
2. Add automated tests for public-name leakage and phrase/archive integrity; run the generator and inspect the diff.
3. Audit each of the 11 non-Carlsen PGN profiles individually, in the order above; record evidence and only then mark it passed.
4. Audit the 49 fictional bots individually for phrase/style coherence and run common regression checks.
5. Fix any failed bot/file, rerun its tests and relevant integration tests, then rerun the complete cross-cutting suite.
6. Only after the existing profiles pass or have clearly documented blockers, select one additional historical player with sufficient PGN data, build one bot, and validate it on held-out positions.
7. Match the new bot against the most challenging suitable opponent based on measured results, not guesswork. Do not start the full round-robin tournament without explicit approval.
8. Update this plan with actual status, scores, commit SHAs, test commands, evidence links, and unresolved blockers. Never mark a bot complete based on a code-shape assertion alone.

## Initial evidence and known gaps (2026-10-22)

- Manifest currently contains 61 bots, including 12 PGN-backed profiles.
- The manifest currently exposes several historical player names directly (including Marshall, Morphy, Polgár, Karpov, Fischer, Nakamura, Anand, Kasparov, and Carlsen); therefore the identity gate has **not** passed.
- Existing workflow had passed release structure, production build, and tactical accuracy at the last observed run; held-out historical validation was still running. This is not evidence that each bot mimics the source player.
- A Stockfish quality-check script exists on the feature branch, but its real run result must be confirmed before any quality claim.
- Brilliant-move imitation is not yet proven. Candidate sacrifice flags require manual/engine continuation verification and must not be reported as brilliant without that evidence.

## Status legend

- `planned`: not yet tested.
- `in progress`: actively being changed or tested.
- `passed`: all relevant tests actually ran and passed; evidence recorded.
- `blocked`: a specific environment/data limitation prevents verification.
- `intentionally skipped`: the user explicitly excluded the profile.
