# Blindfold Chess — independent review brief

**Review date:** 2026-10-21  
**Repository:** https://github.com/orenzbit/veyra-chess  
**Requested reviewer:** Claude Sonnet 5.5 (the owner's available model)  
**Review mode:** read-only first; propose a minimal patch only after recording reproducible findings.

## What this change is intended to do

Add a dedicated blindfold-chess training screen that reuses Veyra's existing chess rules, board renderer, bot registry, and bot move chooser. The board is a display surface; the canonical `Chess` instance remains authoritative. Concealment must never rewrite the actual game position, legal-move calculation, PGN, captures, promotion, turn, castling rights, en-passant state, or game-end detection.

## Exact review locations

1. `src/blindfold-visibility.ts` — pure display-only FEN transform and validation. Verify levels 1–4, preservation of every FEN field except piece placement, and malformed input behavior.
2. `src/main.ts` — `BlindfoldTrainingPage`, routing/navigation integration, bot selection, input handling, move list, bot replies, game-over and review handoff. This is the highest-risk review target.
3. `public/styles.css` — styles prefixed `.blindfold-`; check board overlay geometry, touch targets, responsiveness, and stacking/pointer events.
4. `scripts/check-blindfold.mjs` — deterministic FEN tests. Confirm assertions genuinely fail if the helper regresses.
5. `package.json` — test-script integration only; do not remove or reorder existing release gates.
6. `README.md` and this file — claims must match code and recorded CI results.

## Concealment contract

- Level 1: hide rooks only.
- Level 2: hide rooks and knights.
- Level 3: hide every non-pawn piece; pawns remain visible.
- Level 4: hide all pieces.
- Concealment applies to both colors symmetrically.
- Hidden pieces must still be selectable by square and movable via both tap/click and drag; legal destination markers must be based on the canonical position.
- A move is accepted only if the canonical chess engine accepts it. Capture, promotion (all four promotion types), check, checkmate, stalemate and draw detection must use the canonical game.
- Bot moves must use an existing bot from `public/data/bots/index.json` / the existing bot API. Do not add a new bot system or engine.
- Last-move feedback and the move list must remain useful. Review handoff must use a normal, unmasked PGN/position. Returning to regular review must never leave the board masked.

## Existing bot choices to verify

The public manifest has included IDs such as `bobby` (100 Elo), `tal` (1000), `alex` (1700), and `entity` (2200). The app may load normalized bot objects from `/api/bots`, so verify IDs/slugs and runtime fields instead of assuming manifest shape. Use only existing bots; do not create or modify bot records to fit the feature.

## Tests to run

Run in a clean checkout from the feature commit:
1. `npm ci`
2. `npm run check`
3. `npm run build`
4. `npm run check:blindfold`
5. `npm run check:release`
6. Browser E2E at desktop and mobile sizes, if the existing CI/browser harness is available.

Manually or via browser automation verify:
- each of the four concealment levels for both player colors;
- hidden piece can be selected and moved by drag and by two taps;
- legal and illegal moves; legal move markers; last move and move list;
- capture, castling, en-passant, promotion to Q/R/B/N;
- bot move, bot turn, check, checkmate, stalemate, draw, restart;
- resize while playing, switch levels mid-game, back navigation;
- review handoff yields full unmasked PGN;
- normal review, archive, puzzles, bots and openings still load;
- no console errors, duplicate bot moves, stuck thinking state, or invisible click targets.

## Scoring rubric (must be evidence-backed)

Score each category 0–100, with brief evidence and links/line ranges:
- Requirements/behavior: 25%
- Chess-state correctness and rules edge cases: 25%
- UI input/accessibility/responsive behavior: 20%
- Regression safety / existing product flows: 15%
- Test quality and reproducibility: 15%

**Acceptance gate:** overall weighted score >=90/100, no category below 85/100, no P0/P1 defects, all mandatory automated tests pass, and browser checks are either passed with evidence or explicitly listed as unverified. Do not award points for tests that were not run. If any gate fails, identify the smallest safe patch and repeat the full required test sequence.

## What to change vs. what not to touch

Allowed if needed: the blindfold component and its prefixed CSS, the display-only FEN helper, focused tests, its npm script, and its documentation.

Do not change without a concrete, reproducible defect and explicit explanation:
- chess rules engine or its generated vendor bundle;
- `chooseBotMove`, bot difficulty logic, bot manifest contents, or bot API;
- auth, access gate, account sync, Supabase, Netlify functions, telemetry or privacy behavior;
- archive, puzzle, opening, clock, admin or review logic unrelated to a demonstrated regression;
- dependency versions or lockfiles merely to make the feature easier;
- existing release gates.

Prefer a small fix over a rewrite. Review first, report findings, then patch only what is necessary. Never claim a live deployment was tested unless it was actually opened and exercised.


## Follow-up hardening — 2026-10-21

A focused patch on `fix/blindfold-accessibility-and-bot-guard` addresses three code-review findings:

- The board overlay exposes grid/grid-cell semantics, a single roving tab stop, arrow-key navigation, Enter/Space selection and moves, Escape to cancel, and a visible keyboard focus indicator.
- A bot move is now checked after applying it to the canonical chess instance. If the chooser returns a move rejected by the rules engine, the bot turn fails visibly instead of being reported as successful.
- The display-only FEN helper requires all six fields and validates active color, castling-right syntax, en-passant-square syntax, and move counters before masking.

The automated blindfold script now covers malformed FEN metadata and source contracts for keyboard support and bot-move rejection. These edits have not been locally built in this environment; the branch CI and browser interaction scenarios must be checked before merge. Browser-level behavior remains unverified until exercised in a real browser.
