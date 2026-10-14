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
- After Review analysis, the selected archive game's accuracy (the authenticated player's color) is stored under localStorage key veyra_archive_reviews_v1 and shown on its archive card. Signed-in accounts sync this state through /api/sync to the private user_app_state table; the local copy remains a fallback.

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


## Brand and human-readable documentation
- The main README contains a Hebrew, user-facing explanation of the archive workflow, the reason for each feature, all changed/new files, preserved subsystems, and current verification limits.
- The shared top-bar wordmark is text-only: OREN AND CLAUDE, followed by the current screen/product label. It does not rely on generated images or a remote logo.
- The code snapshot immediately before the archive commits did not contain the exact literal OREN AND CLAUDE. The omission in the new archive was that its custom header showed Veyra Chess only and did not preserve the intended brand. This has been addressed with a shared header component.


## Repository audit follow-up (2026-10-14)
- Fixed the Admin access-request rejection UI: it now calls the existing POST decision='reject' API and only removes the request from local UI after server confirmation. Previously it called DELETE, which the endpoint did not implement.
- Added scripts/check-archive.mjs and a GitHub Actions workflow at .github/workflows/verify.yml to run the product checks and production build on pushes and pull requests.
- Local build could not run in the shell because DNS/network access to GitHub was unavailable. The Actions result must be checked before claiming build success.


## CI-discovered syntax error
- The first GitHub Actions run failed in TypeScript parsing at src/main.ts around line 704: an unbalanced parenthesis in the saved-games archive list renderer. The expression has been expanded to a readable multi-line form.
- The workflow now uses Node 24 because js-chess-engine@2.4.6 declares Node >=24. Check the new workflow run before claiming success.


## CI result after syntax fix
- GitHub Actions run 38604643130 completed successfully for commit e56fc02bad0909815dad111d0ee840a4fc9b419e.
- Passed: npm ci, check:archive, check:product, check:release (including TypeScript noEmit, bot data and access checks), and npm run build.
- Run details: https://github.com/orenzbit/veyra-chess/actions/runs/38604643130
- This does not constitute browser E2E or live Supabase/Chess.com/Lichess account testing. The MIT-only check remains intentionally separate due to the known chess.js BSD-2-Clause license entry.


## Account-wide cross-device sync — 2026-10-14
- `src/account-sync.ts`: validates review records and merges archive reviews by `reviewedAt`, retaining the newest valid record per game and bounding history to 500 records.
- `netlify/functions/sync.mjs`: GET now returns `appState`; PUT accepts `appState` independently of opening `progress`. The owner is always derived from the encrypted server session cookie. App-state payloads are validated and size-limited.
- `public/data/supabase-schema.sql`: documents private `user_app_state` with RLS and no browser-role grants. A migration was applied to the connected Supabase project.
- Synced fields: archive review Accuracy summaries, Chess.com/Lichess usernames, language, and Adaptive opt-in. Existing opening progress and saved-game sync remain separate and intact.
- `scripts/check-account-sync.mjs` and `npm run check:account-sync`: regression tests cover invalid values, timestamp merge, remote-only/local-only reviews, bounded history, server-side owner boundary, and RLS setup.
- UI exposes a small sync status indicator in the archive header.
- Not yet proven by code-only tests: a manual two-browser round-trip on the published site and behavior during a live network interruption. Confirm the Netlify deployment of the current main commit before relying on it in production.


## תיקוני סנכרון חוצי־מכשירים — 14.10.2026

- נבדקו טבלאות Supabase החיות. `user_progress` ו־`user_games` הפעילו RLS אך ל־`service_role` לא היו הרשאות SQL מפורשות; ניתנו SELECT/INSERT/UPDATE/DELETE ונבדקו לאחר מכן. הרשאות anon/authenticated לא נפתחו.
- `netlify/functions/sync.mjs`: הוספו `mergeProgressData` ו־`mergeAppStateData`. עדכוני פתיחות/בוטים ממזגים התקדמות במקום להחליף נתונים; סקירות הארכיון ממוזגות לפי `reviewedAt` ונשמרות עד מגבלת 500.
- `src/main.ts`: Accuracy נשלח מיד לשרת; נוסף `veyra_sync_owner_v1` כדי למנוע ערבוב נתונים מקומיים בין חשבונות שונים; התקדמות בוטים מתאפסת לחשבון החדש בעת החלפת בעל החשבון; כשל בקריאת השרת לא אמור להחליף התקדמות קיימת בנתון חלקי.
- `public/data/supabase-schema.sql`: הרשאות שרת מפורשות ל־`user_progress` ו־`user_games` כדי שסביבת Supabase חדשה לא תחזור לאותו כשל.
- `scripts/check-account-sync.mjs`: בדיקות למיזוג התקדמות, מיזוג סקירות, שמירת סקירה חדשה יותר, גבולות בעלות והרשאות.
- ניתנה גישה חיה ל־Supabase לפרויקט `bwondddbpifqxadzzchq`; נבדקו הרשאות `service_role` אחרי התיקון. בנוסף נשללה הרשאת EXECUTE לפונקציית `public.rls_auto_enable()` מתפקידי `public`, `anon` ו־`authenticated`; בדיקת Supabase Security Advisor לאחר מכן לא הציגה עוד אזהרות SECURITY DEFINER, ונשארו רק הערות מידע על RLS ללא policies — מכוון לטבלאות שרת בלבד.
- CI מלא עבר בריצה [38608305134](https://github.com/orenzbit/veyra-chess/actions/runs/38608305134): התקנת תלויות, בדיקת הארכיון, בדיקות סנכרון, בדיקת מוצר, release/typecheck ובניית production — כולן Success. הריצה נבדקה על PR זמני שנסגר ללא מיזוג; קובץ probe לא נכנס ל־main.
- עדיין לא בוצעה בדיקת browser end-to-end בשני מכשירים עם משתמש אמיתי. לכן הקוד וההגדרות עברו CI ואימות הרשאות DB, אך אין לטעון שבוצעה הוכחת סנכרון מלאה דרך ממשק חי עד שבודקים התחברות, ניתוח משחק במכשיר א׳, ואז הופעת התוצאה במכשיר ב׳.
