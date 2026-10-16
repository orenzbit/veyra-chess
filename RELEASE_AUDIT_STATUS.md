# Veyra Chess — Release Audit Status

Date: 2026-09-26

## This pass
- Added a real account onboarding flow.
- Added 18+ registration enforcement on the server and client.
- Added explicit Terms + Privacy acceptance at signup.
- Added email verification flow using Supabase Auth.
- Added email-verification resend flow.
- Added authenticated account page and explicit account deletion confirmation.
- Added server-side storage for profile, consent and training-event data.
- Added bilingual Hebrew/English legal pages and a project language switch.
- Added a pre-entry product explanation page before signup/sign-in.
- Added the Windows Connector ZIP to the Windows download page.
- Added a beginner-friendly setup guide.

## Verified in this environment
- `npm run check`
- `npm run check:bots`
- `npm run check:product`
- `npm run check:release`
- `npm run build`
- `node --check netlify/functions/auth.mjs`
- `node --check netlify/functions/_lib.mjs`
- `node scripts/check-account-bilingual.mjs` twice

## Still blocked / needs real deployment verification
- Supabase project URL/keys are not configured in this source package.
- Supabase Email Confirmations must be enabled in the dashboard.
- Supabase Site URL / redirect configuration must be set to the real Netlify URL.
- The built-in Supabase email provider is intended only for the private beta because of its low sending rate limit.
- Full browser QA on a live deployment is still required.
- The current MIT-only release check must pass against the complete runtime dependency and asset inventory.
- Opening-data provenance/license must be fully verified before a public release gate can be marked complete.
- Final legal review is still required; the operator is not a lawyer.

## 2026-09-26 — Private-beta manual approval gate

Added and re-verified a server-enforced account-creation approval step:

- New signup requests send a one-time 6-digit code to `ADMIN_EMAIL` through the configured email provider.
- Code lifetime is exactly 12 minutes.
- Code is single-use.
- Five failed code attempts lock/revoke the code.
- The backend never returns the access code to the applicant.
- Successful verification issues a short-lived signed invite token bound to the applicant email.
- Account creation requires that invite token.
- Bilingual Terms and Privacy pages describe the manual approval and 12-minute expiration.

Required environment variables for this feature:

```text
RESEND_API_KEY=...
ACCESS_CODE_FROM=onboarding@resend.dev
ADMIN_EMAIL=orennzb@gmail.com
```

Static verification: PASS.
Flow simulation with mocked Supabase/Resend endpoints: PASS.
Live email delivery and live Netlify/Supabase execution: NEEDS VERIFICATION after deployment.
