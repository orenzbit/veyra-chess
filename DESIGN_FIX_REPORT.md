# Design fix report — 2026-10-03

Scope: public/styles.css, public/legal.css (rebuilt into dist/), docs.

## Fixed (per apple-web-design rules)
- Radii: 18px (21x) and 11px replaced with scale tokens (--radius-lg 14, --radius-xl 20 for hero/auth/board, --radius-md 10, pill).
- 8px ring border replaced with 1px hairline.
- Font sizes moved onto the scale (11/13/15/17/20/28/40) via --fs-* tokens.
- Removed unused second hue (--status-pink). Tokens aligned to spec (hairline, divider, muted inks, warning).
- Hardcoded #fff/#000 in rules replaced with tokens.
- Mobile gutter 16px -> 24px.
- Added corner-shape: squircle (progressive enhancement) and prefers-reduced-motion.
- Physical -> logical properties for RTL (text-align:start, border-inline-end, inset-inline).
- Removed Chessground mentions from THIRD_PARTY_NOTICES.md and FINAL_AUDIT_STATUS.md.

## Not fixed (needs decision / browser QA)
- 28 uses of !important in styles.css (removal needs visual QA of the authenticated app screens).
- Inline style= usages in src/main.ts (8) not individually reviewed.
- Authenticated screens (Review, Coach, Bots, Admin) were NOT rendered; only the setup screen and legal pages were checked in Chromium.

## MIT status — still BLOCKED
- Current status: Veyra's rules layer is implemented over the MIT-licensed js-chess-engine; release checks and browser QA must pass before sign-off.
- Unknown provenance: public/data/openings.json, public/coach-avatar.webp.
- GrokChess appears in credits.html but not in THIRD_PARTY_NOTICES.md.
