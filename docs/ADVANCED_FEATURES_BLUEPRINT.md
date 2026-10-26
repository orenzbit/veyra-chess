# Veyra Chess Advanced Features & User Analytics Blueprint (`ADVANCED_FEATURES_BLUEPRINT.md`)

This document details the architectural blueprint and build instructions for the **User Statistics & DNA Metrics Engine** along with an expanded list of 30 practical features categorized by priority. Every feature is designed for high utility and quick implementation (<1 hour with Claude 3.5 Sonnet / 3.7 Sonnet).

---

## Part 1: Core Feature – User Statistics & Performance Analytics Engine

### 1. What is it? (Definition & Scope)
The **User Statistics Engine** is a client-side analytics processor that scans the user's game archive to extract:
- **Brilliant Moves (!!) Detection**: Identifies tactical piece sacrifices or non-obvious quiet moves that maintain or improve winning evaluation (Evaluation swing >= +1.5 pawns or best move under material sacrifice).
- **Opening Win-Rate Matrix (ECO Breakdown)**: Calculates win/loss/draw percentages and Average Centipawn Loss (ACPL) for every White and Black opening played (e.g., 1.e4 vs 1.d4, Sicilian Najdorf, French Defense).
- **Game Phase Efficiency (Middlegame vs. Endgame Accuracy)**: Measures accuracy separate for moves 1–15 (Opening), 16–35 (Middlegame), and 36+ (Endgame).
- **Time-Pressure Blunder Rate**: Correlates move mistakes with remaining clock time (<15s, 15s–60s, >60s).

### 2. Why is it valuable? (Value Proposition)
- **Actionable Insight**: The user immediately sees which openings yield high win rates (e.g., "Your win rate in the Scotch Game is 68%, but only 41% in the French Defense").
- **Gamification & Pride**: Tracking Brilliant Moves (!!) gives players high satisfaction and shareable achievements.
- **Targeted Training**: Identifies exactly where game points are lost (e.g., "82% of your blunders happen in the Endgame with <30 seconds left").

### 3. How to Build It (<1 Hour Implementation Guide)
- **Step 1: Metric Aggregator Module (`src/user-stats-engine.ts`)**:
  - Input: Array of parsed game PGNs or engine-reviewed game summaries from `game-archive.ts`.
  - Algorithms:
    - *Brilliant Move Rule*: `move.isSacrifice && evalAfter >= evalBefore - 0.2 && evalAfter >= +1.0`.
    - *Opening Aggregator*: Group games by `game.headers.ECO` or first 4 plies; compute `wins / total`.
- **Step 2: UI Dashboard Component (`src/user-stats-view.ts`)**:
  - Render summary cards: Total Games, Win Rate, Brilliant Moves Counter (!!), Top Opening.
  - Interactive Opening Win-Rate Table with sorting.
- **Step 3: State Sync**: Persist calculated summaries in local storage and sync to account via existing `src/account-sync.ts`.

---

## Part 2: Comprehensive Categorized Feature Directory (30 Practical Ideas)

---

### 🚨 Category 1: Critical Fixes & Urgently Required Enhancements

1. **🚨 1.1: WASM Engine Memory Guard & Search Depth Budgeter**
   - **What it is**: Enforces strict node limits and memory caps for Stockfish WASM searches on mobile devices.
   - **Why**: Prevents browser tab crashes or UI freezing during deep analysis.
   - **How to Build**: Set `nodeLimit` based on `navigator.hardwareConcurrency`.

2. **🚨 1.2: Bullet vs. Rapid Time-Control Data Separator**
   - **What it is**: Filters PGN games by time control before computing DNA profiles.
   - **Why**: Bullet premoves contain artificial blunders that skew true classical chess accuracy.
   - **How to Build**: Parse PGN `[TimeControl]` tag and filter games into `<180s` and `>=180s` buckets.

3. **🚨 1.3: Mobile FEN & Evaluation Bar Responsive Layout Fix**
   - **What it is**: Responsive CSS layout adjustments for 360px–390px mobile screens.
   - **Why**: Ensures eval bar and FEN text do not overflow board boundaries on phones.
   - **How to Build**: Apply CSS container queries and flex column layout for viewports <480px.

4. **🚨 1.4: In-Progress Game Local Auto-Save & Recovery**
   - **What it is**: Auto-saves current board FEN and move history every turn into `localStorage`.
   - **Why**: Allows users to resume an active bot game if the browser tab reloads.
   - **How to Build**: Hook into `onMoveEnd` and save state key `veyra_active_game`.

5. **🚨 1.5: Abandoned / Short Game Filter (<6 Moves)**
   - **What it is**: Automatically ignores 2-3 move abandoned games from statistics.
   - **Why**: Prevents early disconnects from artificially lowering win rates or accuracy.
   - **How to Build**: Ignore PGNs where `plyCount < 12`.

---

### ⚡ Category 2: High Priority Rebuilds & Practical Features

6. **⚡ 2.1: User Statistics & Performance Analytics Engine (Brilliant Moves & Opening Win-Rates)**
   - **What it is**: Full analytics dashboard tracking Brilliant Moves (!!), Opening win rates, and phase accuracy.
   - **Why**: Primary request for progress tracking and opening feedback.
   - **How to Build**: See Part 1 implementation guide above.

7. **⚡ 2.2: One-Click DNA Summary PDF & Image Exporter**
   - **What it is**: Exports a stylish visual card image (PNG/PDF) summarizing the user's Chess DNA.
   - **Why**: Social media sharing and brag-worthy progress reports.
   - **How to Build**: Use HTML Canvas / `html2canvas` to render the DNA report card to PNG.

8. **⚡ 2.3: Head-to-Head DNA Comparison Radar (User vs. Legendary GMs)**
   - **What it is**: Overlay chart comparing user metrics (Aggressiveness, Endgame Accuracy, Opening Depth) against Kasparov, Fischer, or Carlsen.
   - **Why**: Gives immediate visual feedback on how user style compares to legends.
   - **How to Build**: Render SVG radar/spider chart comparing 5 normalized DNA dimensions.

9. **⚡ 2.4: Direct Lichess & Chess.com One-Click PGN Importer**
   - **What it is**: Input field accepting a username to automatically fetch public games via API.
   - **Why**: Eliminates manual PGN file downloading/uploading.
   - **How to Build**: Call `https://lichess.org/api/games/user/{username}` or Chess.com public API.

10. **⚡ 2.5: Interactive Custom Opening Repertoire Drill**
    - **What it is**: Practice mode forcing the first 5-10 moves of specific openings against the engine.
    - **Why**: Builds muscle memory for core repertoire openings.
    - **How to Build**: Load ECO move trees and validate user moves against target repertoire branches.

11. **⚡ 2.6: Instant Brilliancy & Blunder Quick-Scanner**
    - **What it is**: One-click scanner highlighting key turning points (!! and ❌) on the game timeline.
    - **Why**: Saves time by jumping straight to critical moments instead of step-by-step review.
    - **How to Build**: Filter move evaluation deltas >150 centipawns and mark timeline nodes.

12. **⚡ 2.7: Dynamic Bot Engine Personality Adapter**
    - **What it is**: Custom Stockfish search wrapper adjusting contempt, sacrifice weightings, and skill levels.
    - **Why**: Makes historical bots play authentically according to `BOTS_FINAL.md`.
    - **How to Build**: Pass dynamic search options (`contempt`, `multiPV`, `quiesce`) to WASM engine.

13. **⚡ 2.8: Real-Time Clock Pressure Stress Indicator**
    - **What it is**: On-screen visual alert when clock time drops below 20s, showing past blunder frequency under pressure.
    - **Why**: Heightens user focus during time scrambles.
    - **How to Build**: Trigger CSS pulse animation on clock when `remainingSeconds < 20`.

14. **⚡ 2.9: Explaining Bot Persona (AI Move Commentary)**
    - **What it is**: Brief textual explanation from the bot explaining why it made a move.
    - **Why**: Converts gameplay into an interactive learning session.
    - **How to Build**: Map move types (captures, threats, checks, outposts) to template commentary strings.

15. **⚡ 2.10: Smart Takeback with Dual Coach Hints**
    - **What it is**: Takeback button that displays the 2 top recommended alternative moves.
    - **Why**: Immediate learning feedback without breaking game flow.
    - **How to Build**: Run 2-ply MultiPV search on previous FEN when takeback is triggered.

---

### 🔮 Category 3: Nice-to-Have Enhancements & Future Features

16. **🔮 3.1: Spaced-Repetition DNA Mistake Trainer**
    - **What it is**: Converts user blunders into custom tactical puzzles repeated at 1, 3, 7, and 14-day intervals.
    - **Why**: Scientific method for eliminating recurring tactical weaknesses.

17. **🔮 3.2: Blindfold Visualization Practice Mode**
    - **What it is**: Option to hide piece graphics or board entirely while receiving audio move calls.
    - **Why**: Advanced visualization training for ambitious players.

18. **🔮 3.3: Weekly Progress & ACPL Trend Tracker**
    - **What it is**: Line chart showing weekly average centipawn loss and blunder rate reduction over time.
    - **Why**: Proves long-term player growth.

19. **🔮 3.4: Daily Legendary Puzzle Challenge**
    - **What it is**: One daily puzzle extracted from historic matches (Kasparov, Tal, Fischer).
    - **Why**: Drives daily user engagement and habit building.

20. **🔮 3.5: Custom Board Sound & Haptic Themes**
    - **What it is**: Choice of sound packs (Wood, Neon, Minimalist) and vibration feedback on mobile.
    - **Why**: Elevates sensory experience and satisfaction.

21. **🔮 3.6: Bot Head-to-Head Win/Loss Matrix**
    - **What it is**: Grid displaying win/loss record against all 13 bot identities.
    - **Why**: Gamified trophy collection tracking which bots have been defeated.

22. **🔮 3.7: Custom 3D & Vintage Board Themes**
    - **What it is**: Visual themes for boards and pieces (Marble, Wooden, Neon, Newspaper).
    - **Why**: Custom aesthetic personalization.

23. **🔮 3.8: Annotated PGN File Exporter**
    - **What it is**: Downloads game PGNs enriched with engine evaluation scores, ACPL, and blunder glyphs (!?, ??).
    - **Why**: Seamless integration with external tools like ChessBase.

24. **🔮 3.9: Endgame Position Practice Library**
    - **What it is**: Pre-configured endgame scenarios (Rook + Pawn vs Rook, Opposite-Colored Bishops).
    - **Why**: Focused endgame mastery drills.

25. **🔮 3.10: Full Offline PWA Cache Controller**
    - **What it is**: Service worker caching WASM engine, bot profiles, and assets for 100% offline play.
    - **Why**: Complete usability on flights or without internet connection.

26. **🔮 3.11: Audio Voice Move Announcer**
    - **What it is**: Text-to-speech voice reading opponent moves out loud (e.g., "Knight to f3").
    - **Why**: Hands-free play and accessibility.

27. **🔮 3.12: Tactical Sacrifice Recognition Badge**
    - **What it is**: Achievement pop-up when player successfully executes a knight/bishop sacrifice leading to checkmate.
    - **Why**: Dopamine reward for creative play.

28. **🔮 3.13: Time Control Performance Matrix**
    - **What it is**: Breakdown of win rates across 1m, 3m, 5m, and 10m time controls.
    - **Why**: Helps players discover their optimal time control format.

29. **🔮 3.14: Opening Trap Warning System**
    - **What it is**: Warning alert when entering known hazardous opening traps (e.g., Elephant Trap, Scholar's Mate).
    - **Why**: Prevents quick opening disasters for developing players.

30. **🔮 3.15: Automated Monthly PGN Evolution Pipeline for Oren**
    - **What it is**: Serverless function auto-ingesting monthly PGN uploads to dynamically re-index Oren's bot.
    - **Why**: Keeps Oren's bot updated with his latest playing style.

---

## Code Integration Protocol

To merge this feature specification into `main`:
```bash
git checkout -b feature/advanced-features-blueprint
git add docs/ADVANCED_FEATURES_BLUEPRINT.md
git commit -m "docs: add User Analytics Engine spec and 30 practical feature blueprints"
git checkout main
git merge feature/advanced-features-blueprint
git push origin main
```
