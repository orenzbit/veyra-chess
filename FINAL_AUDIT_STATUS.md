# Veyra Chess - Final Audit Status

Date: 2026-09-26

## Verified in this environment
- TypeScript compile check: PASS (`tsc -p tsconfig.json`)
- Production build copy step: PASS (`node scripts/build.mjs`)
- JavaScript syntax sweep: PASS
- Production JSON validation: PASS (66 production JSON files; known vendored JSONC config files excluded)
- WASM magic/header validation: PASS
- SVG/XML parsing: PASS
- Public -> dist asset parity: PASS
- Static HTTP smoke test for `/`, legal pages, download page, credits, manifest, schema and opening data: PASS
- 20 bot definitions/runtime files: PASS
- Product checks: PASS
- Manual approval access-code checks: PASS
- Release structure checks: PASS

## Manual approval flow verified statically
- Operator approval email target defaults to `orennzb@gmail.com` and is configurable via `ADMIN_EMAIL`.
- One-time 6-digit access code.
- 12-minute server-side expiry.
- Code is invalid after use.
- Five failed attempts lock/revoke the code.
- Access code hash is stored, not the plaintext code.
- Signup is rejected without a valid approval token.

## Account flow verified statically
- Minimum age: 18.
- Required signup data: email, username, password, full name, birth date, country.
- Explicit Terms + Privacy acceptance required.
- Terms/Privacy version and acceptance timestamp are stored.
- Login rejects unverified email accounts.
- Account deletion requires explicit confirmation.
- Training data is associated with the account and described as retained while the account exists.
- Hebrew/English language toggle exists.

## Important limitation
A real Supabase project and real email provider are not connected in this environment, so live signup, live email delivery, live database writes, and live account deletion are NOT claimed as runtime-verified.

`npm install` was attempted but the environment's npm registry connection timed out twice. This did not block the local TypeScript/build checks because the repository's build step only copies `public` + `index.html`, and TypeScript 5.8.3 is installed globally in the environment.

## Known release blockers
- Current status: Veyra's rules layer is implemented over the MIT-licensed js-chess-engine; release checks and browser QA must pass before sign-off.
2. `data/openings.json` provenance/license still needs authoritative final verification.
3. Real deployment/browser QA remains required.
4. Real Supabase configuration is required before accounts can work.
5. Real email delivery configuration is required before operator approval codes can be emailed.
6. Legal/public-release review should be done before public exposure.
