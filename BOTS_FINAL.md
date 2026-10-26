# Veyra Chess DNA & Legendary Bot Architecture Blueprint (`BOTS_FINAL.md`)

This document provides a comprehensive, production-grade Chess DNA breakdown and bot creation blueprint for **13 chess identities**: 12 iconic Grandmasters analyzed from 35,000+ historical PGN games, and **Oren** (a dynamic, self-evolving player bot profile based on monthly `.pgn` game imports).

---

## Executive Overview & DNA Analysis Engine

The Veyra Chess DNA engine evaluates player games across four core dimensions:
1. **Opening Repertoire & Performance (Phase 1)**: White/Black opening choices, ECO coverage, win rates, and depth of book knowledge.
2. **Endgame Mastery & Conversion (Phase 3)**: Accuracy in simplified positions, pawn structure conversion, rook endgame efficiency, and technique under low material.
3. **Playing Style & Risk Spectrum**: Tactical vs. Positional index, Move Aggressiveness score, King Safety tolerance, and Sacrifice Frequency.
4. **Tactical Blunder & Weakness Patterns**: Blunder frequency under pressure, missed tactical motifs, time-trouble error rate, and diagonal/back-rank vulnerability.

---

# Section 1: Oren (Dynamic Evolving Player Bot)

### 1. Overview & Player DNA Profile
- **Identity**: Oren (Dynamic User Profile)
- **Style Classification**: Adaptive Hybrid / Evolving Practical Attacker
- **White Repertoire**: Primary 1.e4 (Italian Game, Ruy Lopez, Scotch Game), Secondary 1.d4 (London System / Queen's Gambit Accepted).
- **Black Repertoire**: Against 1.e4: Sicilian Defense (Accelerated Dragon / Najdorf) and French Defense; Against 1.d4: King's Indian Defense / Grunfeld.
- **Aggressiveness Score**: 68 / 100 (Leans towards active piece play and kingside initiative).
- **Tactical Blunder Motifs**: Occasional knight forks under time pressure (<15s remaining), over-expansion in the center before king castling, and back-rank tactical oversights in heavy piece endgames.
- **Endgame Mastery**: 72 / 100 (Strong in queen endgames, moderate precision in minor piece vs. pawn endgames).

### 2. How to Build Oren's Bot (Engine & Technical Specification)
To replicate Oren's playstyle and allow him to evolve as new monthly PGN files (`orenzbit-YYYY-MM.pgn`) are uploaded:
- **Base Engine Configuration**: Stockfish WASM wrapper with target ELO slider range 1500–1850.
- **Search Parameters**:
  - `Skill Level`: 12–16
  - `Contempt`: +15 (Refuses early draw offers, seeks active wins)
  - `Search Depth`: 10–14 plies
  - `MultiPV`: 3 (Evaluates top 3 candidate moves to simulate human decision-making)
- **Opening Book Integration**:
  - Weights 1.e4 (65%) and 1.d4 (35%) when White.
  - Dynamically selects moves based on Oren's top 10 most frequent ECO codes extracted from his monthly PGN uploads.
- **Blunder Injection Engine**:
  - Injects a 7% chance of a minor blunder (0.8–1.5 pawn loss) when remaining clock time drops below 30 seconds.
  - Injects a 3% chance of missing a defensive tactical intermezzo in complex tactical melees.

### 3. Evolving Bot Architecture & Monthly Adaptation Blueprint
Oren's bot is unique because it is designed to **evolve continuously** over time:
1. **Automated Monthly PGN Ingestion Pipeline**:
   - As new monthly files (`orenzbit-2025-06.pgn`, `orenzbit-2025-09.pgn`, `orenzbit-2026-10.pgn`, etc.) are deposited into `data/orenzbit/`, an automated script parses all games.
   - Computes updated Centipawn Loss (ACPL), Win/Loss/Draw ratios per opening, and mistake distribution.
2. **Repertoire & Weight Auto-Tuning**:
   - The bot's opening weight tree is automatically re-indexed based on Oren's latest 100 games.
   - If Oren starts playing the Caro-Kann in 2026, the bot instantly adjusts its Black response weights against 1.e4.
3. **Skill Progression Scaling**:
   - The bot tracks Oren's trailing 3-month ACPL. As Oren's ACPL decreases (improves), the bot's Stockfish `Skill Level` and search depth automatically scale up to remain a challenging training partner.

### 4. Potential Issues & Edge Cases
- **Data Gap / Missing Months**: If certain monthly files (e.g., `2025-07`, `2025-08`) are missing, the pipeline must smoothly fall back to the most recent historical baseline without crashing.
- **Bullet vs. Classical Distortion**: Bullet games contain high ACPL due to premoves. The ingestion filter must separate Bullet (<3m) from Blitz/Rapid to prevent skewing the bot's core tactical evaluation.
- **Overfitting to Recent Traps**: If Oren repeatedly falls for a specific opening trap in a single month, the bot might over-exploit it. Mitigation: Apply a 20% smoothing factor across historical months.

---

# Section 2: Garry Kasparov ("The Baku Dragon")

### 1. Overview & Player DNA Profile
- **Identity**: Garry Kasparov (Historical World Champion, 1985–2000)
- **Dataset Analyzed**: `Kasparov.pgn` (2,128 games)
- **Style Classification**: Fierce Tactical Aggressor & Opening Pioneer
- **White Repertoire**: 1.e4 (Ruy Lopez - Scotch / King's Gambit / Openings), 1.d4 (Catalan, Queen's Gambit, King's Indian Attack).
- **Black Repertoire**: Against 1.e4: Sicilian Najdorf (1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6); Against 1.d4: King's Indian Defense (Mar del Plata Variation) & Grünfeld Defense.
- **Aggressiveness Score**: 98 / 100
- **Endgame Mastery**: 95 / 100 (Relentless tactical pressure carried into the endgame; exceptional rook and pawn coordination).
- **Blunder Motifs**: Very rare. Occasional over-ambitious material sacrifices in extreme time pressure against top rival defensive specialists.

### 2. How to Build Kasparov's Bot
- **Engine Configuration**: Stockfish WASM, ELO target ~2850.
- **Search Parameters**:
  - `Skill Level`: 20 (Max)
  - `Contempt`: +35 (Aggressive preference for initiative over equality)
  - `Search Depth`: 18–22 plies
- **Opening Book Weights**:
  - White: 1.e4 (55%), 1.d4 (45%). Enforces deep main lines up to 20 moves deep.
  - Black: Sicilian Najdorf (70%), Grünfeld (60% against 1.d4).
- **Custom Playstyle Heuristics**:
  - +25% bonus weight for moves that increase piece mobility, open lines against the enemy king, or deliver double attacks.

### 3. Potential Issues & Edge Cases
- **Engine Passive Pitfalls**: Standard Stockfish may choose dry, simplifying moves in equal positions. Kasparov's bot requires custom move-selector filtering that rejects forced drawish simplification when attacking chances exist.
- **Resource Exhaustion**: Deep search depth (20+ plies) in browser WASM may cause frame drops on low-end devices. Requires web worker execution with strict step-budgeting.

---

# Section 3: Bobby Fischer ("The Lone Wolf")

### 1. Overview & Player DNA Profile
- **Identity**: Bobby Fischer (Historical World Champion, 1972–1975)
- **Dataset Analyzed**: `Fischer.pgn` (827 games)
- **Style Classification**: Universal Precision Machine & Uncompromising Clarity
- **White Repertoire**: 1.e4 exclusively ("Best by test"). Ruy Lopez (Exchange & Main Line), Sozin Attack against Sicilian, King's Indian Attack.
- **Black Repertoire**: Against 1.e4: Sicilian Najdorf & King's Indian Defense; Against 1.d4: Nimzo-Indian Defense & Grünfeld.
- **Aggressiveness Score**: 88 / 100 (Relentless energy combined with crystal-clear positional logic).
- **Endgame Mastery**: 99 / 100 (Legendary bishop vs. knight technique, perfect rook endgame play).
- **Blunder Motifs**: Virtually zero tactical blunders; highly disciplined calculation.

### 2. How to Build Fischer's Bot
- **Engine Configuration**: Stockfish WASM, ELO target ~2780.
- **Search Parameters**:
  - `Skill Level`: 20
  - `Contempt`: +20
  - `Search Depth`: 18–20 plies
- **Opening Book Rules**:
  - White MUST play 1.e4 in 99% of games.
  - Black plays Sicilian Najdorf against 1.e4 and King's Indian Defense against 1.d4.
- **Custom Evaluation Tuning**:
  - Increases evaluation score of active Bishops by +15 centipawns in open endgames.
  - Rejects premature draw offers unconditionally.

### 3. Potential Issues & Edge Cases
- **Predictability**: Because Fischer played a tight opening repertoire, human players can prepare specific lines against the bot. Mitigation: Allow minor repertoire variations within Fischer's historical games.

---

# Section 4: Anatoly Karpov ("The Python")

### 1. Overview & Player DNA Profile
- **Identity**: Anatoly Karpov (Historical World Champion, 1975–1985)
- **Dataset Analyzed**: `Karpov.pgn` (3,529 games)
- **Style Classification**: Positional Squeeze & Prophylactic Mastermind
- **White Repertoire**: 1.e4 (Ruy Lopez Flohr/Zaitsev), 1.d4 (Queen's Gambit Declined, Nimzo-Indian Rubinstein, English Opening).
- **Black Repertoire**: Against 1.e4: Caro-Kann Defense (1.e4 c6 2.d4 d5) & Petroff Defense; Against 1.d4: Queen's Indian Defense & Nimzo-Indian.
- **Aggressiveness Score**: 42 / 100 (Prophylactic; restricts opponent options before attacking).
- **Endgame Mastery**: 98 / 100 (Master of minimal advantage conversion and knight outposts).
- **Blunder Motifs**: Extremely defensive; can occasionally succumb to hyper-sharp chaotic tactical onslaughts if overwhelmed by tactical complexities.

### 2. How to Build Karpov's Bot
- **Engine Configuration**: Stockfish WASM, ELO target ~2750.
- **Search Parameters**:
  - `Skill Level`: 20
  - `Contempt`: +10 (Patient, willing to accumulate tiny advantages over 60+ moves)
  - `Search Depth`: 18 plies
- **Prophylaxis Heuristic**:
  - MultiPV candidate move sorting prioritizes moves that diminish opponent's piece mobility and prevent opponent counterplay.
- **Opening Book Rules**:
  - Enforces Caro-Kann against 1.e4 (80% frequency).

### 3. Potential Issues & Edge Cases
- **Boredom / Fast Draws**: Karpov's patient style might lead to long, maneuvering games that test user patience. The bot interface should display insightful commentary on prophylactic moves.

---

# Section 5: Mikhail Tal ("The Magician from Riga")

### 1. Overview & Player DNA Profile
- **Identity**: Mikhail Tal (Historical World Champion, 1960–1961)
- **Dataset Analyzed**: `Tal.pgn` (2,431 games)
- **Style Classification**: Intuitive Romantic Attacker & Sacrificial Wizard
- **White Repertoire**: 1.e4 (Sicilian Openings, Ruy Lopez, King's Gambit).
- **Black Repertoire**: Benoni Defense (1.d4 Nf6 2.c4 c5 3.d5 e6), Sicilian Dragon/Najdorf, King's Indian Defense.
- **Aggressiveness Score**: 100 / 100
- **Endgame Mastery**: 82 / 100 (Prefers to checkmate in the middlegame; endgames are secondary).
- **Blunder Motifs**: Speculative piece sacrifices that standard engines evaluate as -0.5 to -1.5, but create extreme psychological and tactical pressure on human opponents.

### 2. How to Build Tal's Bot
- **Engine Configuration**: Stockfish WASM with custom speculative sacrifice mode. ELO ~2700.
- **Sacrifice Engine Tuning**:
  - When evaluating candidate moves, if a move sacrifices a piece (Knight/Bishop/Rook) for 2+ open attacking lines against the opponent's King, grant a +180 centipawn artificial bonus even if engine score drops slightly.
- **Search Parameters**:
  - `Skill Level`: 19
  - `Contempt`: +40
  - `Search Depth`: 16 plies (Slightly shallower to allow romantic intuitive moves)

### 3. Potential Issues & Edge Cases
- **Engine Refutation**: Standard Stockfish at depth 22 will refute Tal's speculative sacrifices. The bot MUST use bounded depth or specific candidate weighting so it actually plays speculative sacrifices rather than playing like standard Stockfish.

---

# Section 6: Magnus Carlsen ("The Mozart of Chess")

### 1. Overview & Player DNA Profile
- **Identity**: Magnus Carlsen (Historical World Champion, 2013–2023)
- **Dataset Analyzed**: `Carlsen.pgn` (7,818 games)
- **Style Classification**: Universal Endgame Grind & Psychological Flexist
- **White Repertoire**: Completely universal (1.e4, 1.d4, 1.Nf3, 1.c4, Catalan, London System, Ruy Lopez).
- **Black Repertoire**: Sicilian, Berlin Defense (1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6), Nimzo-Indian, Queen's Gambit.
- **Aggressiveness Score**: 70 / 100
- **Endgame Mastery**: 100 / 100 (Unrivaled conversion of tiny micro-advantages in 80-move endgames).
- **Blunder Motifs**: Near zero; unparalleled psychological resistance under fatigue.

### 2. How to Build Carlsen's Bot
- **Engine Configuration**: Stockfish WASM, ELO ~2880.
- **Search Parameters**:
  - `Skill Level`: 20
  - `Contempt`: +25
  - `Search Depth`: 20–24 plies
- **Endgame Boost**:
  - Activates tablebase/deep endgame search heuristics when piece count <= 6, maximizing endgame squeeze.

### 3. Potential Issues & Edge Cases
- **High Resource Demand**: Highest calculation requirements in the browser; requires optimized worker threads.

---

# Section 7: Viswanathan Anand ("The Tiger of Madras")

### 1. Overview & Player DNA Profile
- **Identity**: Viswanathan Anand (Historical World Champion, 2007–2013)
- **Dataset Analyzed**: `Anand.pgn` (4,310 games)
- **Style Classification**: Lightning Intuition & Deep Opening Preparation
- **White Repertoire**: 1.e4 (Ruy Lopez, Sicilian Open), 1.d4 (Semi-Slav, Grunfeld).
- **Black Repertoire**: Sicilian Najdorf, Semi-Slav (Meran Variation), Petroff Defense.
- **Aggressiveness Score**: 80 / 100
- **Endgame Mastery**: 92 / 100
- **Blunder Motifs**: Rapid calculation speed; extremely low time-trouble blunder rate.

### 2. How to Build Anand's Bot
- **Engine Parameters**: Fast move generation (max 1.5 seconds per move execution), ELO ~2780.
- **Opening Depth**: Pre-indexed book up to move 22 for main lines.

### 3. Potential Issues & Edge Cases
- Must maintain rapid response timing in UI without skipping calculation quality.

---

# Section 8: Jose Raul Capablanca ("The Human Chess Machine")

### 1. Overview & Player DNA Profile
- **Identity**: Jose Raul Capablanca (Historical World Champion, 1921–1927)
- **Dataset Analyzed**: `Capablanca.pgn` (597 games)
- **Style Classification**: Effortless Crystal Clarity & Endgame Perfection
- **White Repertoire**: 1.d4 (Queen's Gambit Declined), 1.e4 (Ruy Lopez Four Knights).
- **Black Repertoire**: Orthodox Defense to QGD, 1.e4 e5 (Classical Ruy Lopez).
- **Aggressiveness Score**: 50 / 100
- **Endgame Mastery**: 100 / 100 (Flawless pawn structure logic and king activity).

### 2. How to Build Capablanca's Bot
- **Engine Configuration**: Harmonious positional evaluation, ELO ~2720.
- **Pawn Structure Priority**: Penalizes pawn weaknesses (doubled, isolated pawns) by double centipawn values.

### 3. Potential Issues & Edge Cases
- Avoids complications; can be vulnerable to hyper-modern engine tactical traps if depth is too low.

---

# Section 9: Paul Morphy ("The Pride and Sorrow of Chess")

### 1. Overview & Player DNA Profile
- **Identity**: Paul Morphy (Unofficial World Champion, 1857–1859)
- **Dataset Analyzed**: `Morphy.pgn` (211 games)
- **Style Classification**: Rapid Development & Open Board Dominance
- **White Repertoire**: 1.e4 (Evans Gambit, King's Gambit, Italian Game, Ruy Lopez).
- **Black Repertoire**: 1.e4 e5 (Two Knights Defense, Philidor Defense refutation).
- **Aggressiveness Score**: 95 / 100

### 2. How to Build Morphy's Bot
- **Development Metric**: Prioritizes moves that develop minor pieces before move 10 and open files against uncastled king.

---

# Section 10: Adolf Anderssen ("The Romantic Master")

### 1. Overview & Player DNA Profile
- **Identity**: Adolf Anderssen (Winner of London 1851, Romantic Era Legend)
- **Dataset Analyzed**: `Anderssen.pgn` (681 games)
- **Style Classification**: Romantic Combinative Brilliancy
- **White Repertoire**: 1.e4 (Evans Gambit, King's Gambit), 1.a3 (Anderssen's Opening).
- **Black Repertoire**: Sicilian Defense, King's Gambit Accepted.
- **Aggressiveness Score**: 96 / 100

---

# Section 11: Frank Marshall ("The Gambit King")

### 1. Overview & Player DNA Profile
- **Identity**: Frank Marshall (US Champion 1909–1936)
- **Dataset Analyzed**: `Marshall.pgn` (1,027 games)
- **Style Classification**: Swindle Specialist & Gambit Aggressor
- **White Repertoire**: 1.d4, 1.e4 (Max Lange Attack, Danish Gambit).
- **Black Repertoire**: Marshall Attack in Ruy Lopez (1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 O-O 8.c3 d5!).

---

# Section 12: Hikaru Nakamura ("The Speed Demon")

### 1. Overview & Player DNA Profile
- **Identity**: Hikaru Nakamura (Top GM, Speed Chess Master)
- **Dataset Analyzed**: `Nakamura.pgn` (10,220 games)
- **Style Classification**: Hyper-Tactical Speed Squeeze & Resourceful Swindler
- **White Repertoire**: 1.e4, 1.Nf3, 1.b3 (Nimzo-Larsen Attack), King's Indian Attack.
- **Black Repertoire**: King's Indian Defense, Sicilian Najdorf, Modern Defense.
- **Aggressiveness Score**: 90 / 100

---

# Section 13: Judit Polgar ("The Queen of Chess")

### 1. Overview & Player DNA Profile
- **Identity**: Judit Polgar (Strongest Female Player in History)
- **Dataset Analyzed**: `PolgarJ.pgn` (1,825 games)
- **Style Classification**: Unrelenting Tactical Attack & King-Hunt Specialist
- **White Repertoire**: 1.e4 (Sicilian Open, King's Indian Attack, Ruy Lopez).
- **Black Repertoire**: Sicilian Defense (Najdorf / Scheveningen), King's Indian Defense.
- **Aggressiveness Score**: 97 / 100

---

# Summary Matrix of All 13 Bots

| Bot Name | Primary Opening (White) | Primary Opening (Black) | Aggressive Rating | Primary Focus / Trait |
| :--- | :--- | :--- | :--- | :--- |
| **Oren** | 1.e4 (Italian / Scotch) | Sicilian / French / KID | 68/100 | **Dynamic Self-Evolving Player Bot** |
| **Garry Kasparov** | 1.e4 / 1.d4 | Sicilian Najdorf / KID / Grunfeld | 98/100 | Dynamic Attacking & Opening Power |
| **Bobby Fischer** | 1.e4 (Ruy Lopez / Sozin) | Sicilian Najdorf / KID | 88/100 | Crystal Clarity & Uncompromising Precision |
| **Anatoly Karpov** | 1.d4 / 1.e4 | Caro-Kann / Petroff / QGD | 42/100 | Prophylactic Squeeze & Pawn Structures |
| **Mikhail Tal** | 1.e4 (Open Sicilian) | Benoni / Sicilian Dragon | 100/100 | Intuitive Sacrifices & King Attacks |
| **Magnus Carlsen** | Universal (1.e4, 1.d4, 1.c4) | Universal / Berlin / Sicilian | 70/100 | Endgame Squeeze & Flexibility |
| **Viswanathan Anand** | 1.e4 / 1.d4 | Sicilian Najdorf / Semi-Slav | 80/100 | Rapid Intuition & Deep Prep |
| **Jose R. Capablanca**| 1.d4 / 1.e4 | QGD / 1.e4 e5 Classical | 50/100 | Flawless Simplicity & Endgames |
| **Paul Morphy** | 1.e4 (Evans / King's Gambit) | 1.e4 e5 (Two Knights) | 95/100 | Rapid Development & Open Lines |
| **Adolf Anderssen** | 1.e4 (Evans) / 1.a3 | Sicilian / King's Gambit Acc. | 96/100 | Romantic Tactical Combinations |
| **Frank Marshall** | 1.d4 / 1.e4 Gambits | Marshall Attack (Ruy Lopez) | 89/100 | Tactical Swindles & Gambits |
| **Hikaru Nakamura** | 1.e4 / 1.Nf3 / 1.b3 | KID / Sicilian Najdorf / Modern | 90/100 | Fast Tactical Calculation & Resilience |
| **Judit Polgar** | 1.e4 (Open Sicilian) | Sicilian Najdorf / KID | 97/100 | Uncompromising King-Hunt Attacks |

---

## Pre-Commit & Code Integration Protocol

To merge this bot architecture into `main`:
1. **Verification**: Run `node scripts/check-bots.mjs` and `node scripts/check-release.mjs`.
2. **Git Workflow**:
   ```bash
   git checkout -b feature/chess-dna-bots-final
   git add BOTS_FINAL.md
   git commit -m "docs: add comprehensive Chess DNA and bot architecture spec"
   git checkout main
   git merge feature/chess-dna-bots-final
   ```
