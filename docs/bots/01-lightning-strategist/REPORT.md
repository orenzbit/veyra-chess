# #1 The Lightning Strategist — work and readiness report

Status: **in progress**. This file follows Oren's *Bot Readiness, Quality & Completion Standard* (§15–§16). The bot is called only by its alias and roster number.

| Field | Value |
|---|---|
| Bot | #1 The Lightning Strategist |
| Branch | `dna-lab` (from `player-data-batch` `2bd5e30` + `main`) |
| Approved by | Benzi, 25.10.2026 (plan, 500-game DNA sample, two files per bot, separate clone) |
| Player DNA | [DNA.md](DNA.md) |

## Pass marks (fixed before any result was seen)

These pass marks were committed before the DNA analysis results and before any conformance or quality check ran (Oren's standard §8.6). They are not changed after the fact. If one proves unreasonable, the change and the reason are recorded here as a separate entry.

### Openings (compared with the player's training games in DNA.md)

| ID | Check | Pass mark |
|---|---|---|
| O1 | As White, the bot's first-move distribution vs the player's | Total variation distance ≤ 0.20 |
| O2 | As Black, the bot's reply distribution to each of the player's 4 most-faced first moves | Total variation distance ≤ 0.25 for each |
| O3 | Share of the player's **test** games whose first 6 plies are covered by the bot's repertoire | ≥ 40% as White and as Black |

Distributions of a deterministic bot are measured over 200 starts. A bot that always plays the same move has that move at 100%.

### Play on test positions (classical test games the bot never saw; player to move; ply ≥ 10)

The baseline is the same bot with its style profile removed (style "universal", no style bonuses), so it isolates the effect of the style settings.

| ID | Check | Pass mark |
|---|---|---|
| P1 | Exact match with the player's move | Bot ≥ baseline − 2 percentage points |
| P2 | Capture, check and pawn-move rates of the chosen moves vs the player's | For each: within 5 percentage points of the player, or at least as close as the baseline |
| P3 | Every chosen move is legal, and no position errors | 100% |

### Quality and speed

| ID | Check | Pass mark |
|---|---|---|
| Q1 | Oren's Stockfish gate on held-out positions | Every sampled position measured (no timeouts); average loss ≤ 250 cp; blunders (≥ 300 cp) ≤ max(2, 25%) |
| Q2 | Bot thinking time per move on the test positions (GitHub runner) | Median ≤ 5 s and maximum ≤ 20 s. The app runs the search on the page's main thread, so longer searches freeze the page. |

### Identity and phrases

| ID | Check | Pass mark |
|---|---|---|
| N1 | No real-name token in any user-visible field (name, title, flavour, description, style label, quips, phrase texts) | 0 occurrences |
| N2 | Oren's profile, identity, provenance and phrase checks (`check:legends`) | Pass |
| N3 | Phrase voice: every phrase is the bot's own first-person or neutral line, not a command or a historical quote | Manual review, all 10 phrases |

### Software

| ID | Check | Pass mark |
|---|---|---|
| S1 | Tactical accuracy, held-out and surprise-move checks (`check:bot-accuracy`, holdout, surprise) | Pass |
| S2 | Other bots' data unchanged (diff of `public/data/bots/` outside bot #1) | No changes |
| S3 | `npm run check` (TypeScript) and `npm run build` | Pass |

## Results

To be filled in from the GitHub runs, with run links.
