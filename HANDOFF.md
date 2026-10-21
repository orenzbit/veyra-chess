# HANDOFF — Veyra Chess (for any model that takes over)

Owner: Oren (Hebrew speaker, works from phone/PC, wants minimal manual work). Always answer in Hebrew, short.

## Iron rules
1. MIT-only for code AND data. Check licenses before adding anything. Credits page must list every component.
2. NEVER guess. If anything is unclear, even slightly, ask the owner (AskUserQuestion). 
3. Approval protocol: every assumption and every action is logged in the owner's spec doc (Claude Docs artifact
   "מפרט Veyra Chess", section "יומן החלטות ואישורים"). Wait for the owner to write "מאושר". If he writes "לא" / "לא מאושר":
   FIRST ask why; after he answers, offer exactly 4 options that solve the problem WITHOUT the rejected thing.
4. Use few agents (one Haiku for browser testing). Do not burn usage retrying. If blocked by a permission or by a
   missing secret, STOP and tell the owner what blocked, where, and how to fix it.
5. Do not invent wheels: use what the owner uploaded (board, PRMI pieces, daxaur openings, Chessy, cm-chessboard).
6. Never put secrets in chat, code or docs. Server secrets only in Netlify env (secret flag).

## Stack
Netlify (edge function `gate` on /*, functions under /api/*), Supabase (RLS, server secret key), Vite + React + TS,
Chessy WASM engine, cm-chessboard (board + arrows) + chess-art PRMI pieces, js-chess-engine (MIT rules core, replaces Veyra rules layer).

## Ids
- Supabase project: bwondddbpifqxadzzchq (eu-central-1). Schema applied (9 tables, RLS on, anon/authenticated revoked).
- Netlify site: veyra-chess id f49502cd-bfbe-42b6-8e60-b925211dfc06 (created, NOT deployed). Other two sites are not Veyra.
- Env set on veyra-chess: SUPABASE_URL, SUPABASE_ANON_KEY, SITE_URL, ADMIN_EMAIL, AUTH_SESSION_SECRET.
- Env STILL MISSING: SUPABASE_SECRET_KEY (owner copies from Supabase dashboard), ADMIN_SESSION_SECRET (write was blocked,
  needs owner's explicit approval), ADMIN_PASSWORD_HASH (owner picks password), SITE_GATE_PASSWORD (owner picks).
- Netlify visitor access has "SSO team login" on: turn off ONLY after SITE_GATE_PASSWORD is set (the gate fails closed with 503 if missing).

## Done
Openings 75 / 1,196 lines. Security audit run (3 hunters). Fixed in working copy: admin token dot bug (_lib.mjs),
escapeHtml missing (auth.mjs), RLS on signup_access_codes (schema), admin rate limit by trusted IP (admin-auth.mjs),
getIp prefers x-nf-client-connection-ip (auth.mjs). Files delivered to owner as veyra-fixes.tgz (not yet in his repo/deploy).

## Known open security items (not fixed yet)
- verify-access-code attempt counter is not atomic (auth.mjs ~316-328).
- request-access-code lets anyone revoke another email's approved code (auth.mjs ~259).
- ~~gate.ts fails open when SITE_GATE_PASSWORD is unset~~ (fixed: the gate now returns 503).
- logout does not revoke the Supabase refresh token; rolling 30-day cookie.
- no SRI on React from cdnjs; supabase function rls_auto_enable is executable by anon (not ours, owner decides).
- Current status: verify the complete runtime dependency inventory with the automated license check before sign-off.

## Spec (from owner interview, Oct 9-10)
Black UI, single Apple-blue accent, pill buttons, no shadows. One board (cm-chessboard + PRMI) everywhere.
Soft move sound + short piece spin. One coach avatar (coach-avatar.webp), direct+warm tone with light humor.
Desktop first. Dashboard = coach report + brilliant moves from last 30 chess.com games (only new ones analyzed, saved),
PGN uploads, master games. Brilliant = sacrifice that saves the game OR only-move; names: מהלך מאסטר, מדויק, חזק, יציב,
תאוריה, רפוי, החלקה, הזדמנות שהוחמצה, קריסה. Move card: board+arrow, one master sentence, "play from here", date/opponent/opening.
No brilliant => honest message. Collection + progress counter.
Bots: many more than 20, each with personality+comments, card = avatar, name, rating/level, one line, openings. NO resign.
Openings per bot by level (masters write the who-plays-what file; strongest plays all). Owner picks bot color -> sees its opening;
if owner leaves theory the bot keeps playing normally. Real chess clock with chosen time. Bot art: owner's images / ChatGPT-style / SVG, inspired by chess.com style but never copy their assets.
After any action: popup "your next opening is X" + map easy->hard + learn every line on the board, buttons: learn / play bot / review / X.
End of bot game: button "סקור את המשחק" -> Review, analysis starts, PGN saved.
Added features: spaced repetition on openings, mistake notebook, endgame trainer, per-opening stats.
Learn-by-heart list (openings, endgames, tactics, key strategic positions): masters round NOT done yet.
Account: same email = same progress on any device; save every PGN, classifications, learning events, game date.

## Order of work
1. Owner approves spec doc. 2. Owner supplies secrets/approvals above -> deploy veyra-chess. 3. Browser test loop
(one Haiku agent, playwright-cli): screenshot each screen, write worked/failed/fixable, fix, repeat; stop when usage ends.
4. Replace Veyra rules layer, remove non-MIT sprites. 5. Build dashboard + coach report. 6. Bots/openings file by masters. 7. Learning popup + map.
