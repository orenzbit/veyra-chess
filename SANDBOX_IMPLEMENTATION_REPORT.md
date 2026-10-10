# Veyra Chess — Sandbox Implementation Report

## Built in this pass
- Sequential Bot Campaign: one unlocked bot at a time, win unlocks the next.
- Separate Adaptive Bots page with explicit opt-in.
- Admin page for `orennzb@gmail.com`.
- Server-side admin session contract and password hash generator.
- Server-side bot override API and stats API.
- Telemetry/adaptive API contracts with rate limits and input validation.
- Supabase SQL schema with RLS enabled.
- Windows PWA wrapper and download/install page.
- Veyra Chess logo and manifest.
- Central Credits page and support email.
- HMAC-signed private beta gate replacing the previous static gate cookie.
- Server-authoritative Admin identity; the browser cannot submit an alternate admin email.
- Explicit pending → approved/rejected → code_verified → completed signup lifecycle; no account is created before operator approval. Approver identity is recorded server-side.

## Exact new files
- `netlify/functions/_lib.mjs`
- `netlify/functions/admin-auth.mjs`
- `netlify/functions/admin-bots.mjs`
- `netlify/functions/admin-stats.mjs`
- `netlify/functions/adaptive.mjs`
- `netlify/functions/bots.mjs`
- `netlify/functions/telemetry.mjs`
- `netlify/edge-functions/gate.ts` updated
- `public/data/supabase-schema.sql`
- `public/manifest.webmanifest`
- `public/sw.js`
- `public/icons/tabia-chess.svg`
- `public/download.html`
- `public/credits.html`
- `scripts/make-admin-hash.mjs`
- `scripts/check-product.mjs`
- `scripts/check-mit-only.mjs`
- `SANDBOX_IMPLEMENTATION_REPORT.md`

## Main app changes
`src/main.ts` now contains:
- Bot progression UI and unlock logic.
- Adaptive page.
- Admin page.
- Windows page.
- Support email links.
- Server API integration hooks.
- Adaptive signal hooks.

## Required server configuration before live use
```text
SITE_GATE_PASSWORD=...
ADMIN_EMAIL=orennzb@gmail.com
ADMIN_PASSWORD_HASH=...
ADMIN_SESSION_SECRET=...
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
```

Generate the Admin hash with:
```bash
npm run admin:hash -- "YOUR_ADMIN_PASSWORD"
```

Run `public/data/supabase-schema.sql` in the database before enabling persistence.

## Current blockers
1. MIT-only policy: existing `chess.js` is BSD-2-Clause and must be replaced before MIT-only release sign-off.
2. Backend secrets/database are not configured in this sandbox.
3. Real deployment/browser/security/performance verification is still required.
4. Full legal/privacy release audit is not yet signed off.
