# Game Archive + Board Handoff

Updated: 2026-10-14
Repository: orenzbit/veyra-chess

## Purpose
The signed-in landing page is the game archive. A selected game enters the existing Review screen through its PGN parser and board state. The current board library and Chessy WASM analysis engine remain in place.

## Files added or changed
- src/game-archive.ts (new): Chess.com/Lichess data adapters, PGN metadata normalization, result perspective, game metadata, bounded retrieval, error handling, and a clearly labeled Opponent Gamma sample PGN.
- src/main.ts (changed): archive landing page and navigation; provider selection and usernames; latest 100 games; day groups with W/L/D totals; Analyze-to-Review transfer; local accuracy badge metadata after review; clock comments in the move list; board lifecycle cleanup/recreation when navigating to/from Review; old inline provider list replaced by saved-games-only panel.
- public/styles.css (changed): archive-only dark theme and responsive game cards. Existing styles for other pages are preserved.
- GAME_ARCHIVE_HANDOFF.md (new): this note for the next AI.

## Fetch and data flow
- Chess.com: read the public archives index and fetch recent monthly archives newest-first until the latest 100 games are available; normalize then sort by game date.
- Lichess: public game-export endpoint with max=100, clocks enabled, evaluation tags disabled, opening metadata requested, and PGNs parsed individually.
- Usernames are saved in browser localStorage, matching the prior behavior. No chess-provider password or token is collected.
- Analyze uses the existing PGN loader, then switches to the existing Review view. It does not start engine analysis automatically; the user can press the existing Analyze button in Review.
- Board: cm-chessboard remains in use. Analysis: Chessy WebAssembly from public/engine-worker.js and public/vendor/chessy-ai-fast.wasm. This task does not introduce Stockfish.
- PGN clock comments matching [%clk ...] are associated by ply index and displayed beside moves.
- After Review analysis, the selected archive game's accuracy (the authenticated player's color) is stored under localStorage key veyra_archive_reviews_v1 and shown on its archive card. This badge is browser-local; it is not synchronized to another browser.

## Opponent Gamma demo
The separate demo row is a test fixture, not a record fetched from any account. It uses a short Scholar's Mate PGN and is outside the fetched-game totals. Use it to check the archive-to-board path deterministically.

## Preservation
- No files were deleted.
- Existing review/board, Coach, engine worker/WASM, authentication, saved-game API, bots, openings, legal/access gate, and deployment config were not replaced.
- The former Chess.com/Lichess controls and compact game list inside Review were removed because provider selection now lives on the archive page. Manual PGN text/file import and saved-game loading remain available.
- The profile-learning engine and its server/client persistence are not changed here; the persistence requirement is a separate decision and should not be inferred from this archive change.

## Verification status
Repository network access was unavailable from the shell, so local npm run build could not be executed in this session. Static source-target checks are performed before commit, but a runtime/deployed smoke test is not claimed complete.
After checkout, run npm run build. Then test Chess.com and Lichess public profiles, the Opponent Gamma Analyze flow, Review navigation away and back, and a PGN whose move comments include [%clk ...].
