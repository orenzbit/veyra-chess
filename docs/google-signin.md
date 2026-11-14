# Google sign-in: what changes and what is still needed

Status: **off by default**. This is behind `GOOGLE_SIGNIN_ENABLED=true` and also needs `SITE_URL`. With the flag off, the app behaves exactly as before: `status` says `googleSignIn:false`, the Google actions answer 404, and no button is shown.

## What this PR changes
| Where | Change |
|---|---|
| `netlify/functions/auth.mjs` | `GET ?action=google-start` sends the browser to Supabase Auth (`/auth/v1/authorize?provider=google`) with PKCE (S256) and a random state. Both are kept in a 10-minute HttpOnly/Secure/SameSite=Lax cookie. |
| | `GET ?action=google-callback` checks the state, exchanges the code (`grant_type=pkce`) and applies the rules below. |
| | `signup` accepts `google:true`. It runs the same operator-approval, 18+ and terms checks, uses no password, and mints the first session server-side (`admin/generate_link` + `verify`). |
| `public/data/supabase-schema.sql` + migration `20261110010000_auth_unlink_identity.sql` | `public.auth_unlink_identity(user, provider)`: security definer, service_role only. It removes a just-linked identity, and only when the user has another one. |
| `src/main.ts` | "Continue with Google" button, shown only when the server says `googleSignIn:true`. Return messages. The signup form in Google mode has no password field. |
| `scripts/check-google-signin.mjs` | 28 checks against a fake Supabase (run from `check:human`). |

## Rules (his conditions)
1. **No linking by email alone.** Supabase Auth links a Google login to an existing user with the same verified email automatically (Supabase docs, "Identity linking → automatic linking"). The callback refuses any user that has a non-Google identity. It ends that Supabase session (`logout?scope=local`), removes the just-linked Google identity with the RPC, and sends the person back with "sign in with your password". No Veyra session is created.
2. **18+, terms, private beta.** A Google user with no Veyra profile gets **no session**, only a 30-minute pending marker. To create the account they still need the operator's 6-digit approval code, a birth date showing 18+, and terms acceptance. These are the same server checks as password signup.
3. **Additive.** Password login and signup are unchanged (checked).

## What is needed before turning it on (needs אורן)
1. Google Cloud Console: create an OAuth client (Web).
   - Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`.
   - OAuth consent screen: app name and support email. Scopes: `email`, `profile`.
2. Supabase dashboard → Authentication → Providers → Google: paste the client ID and secret, and enable it.
3. Supabase → Authentication → URL configuration: add `https://<site>/api/auth?action=google-callback*` to the redirect allow-list.
4. Run the migration `20261110010000_auth_unlink_identity.sql`.
5. Netlify env: `GOOGLE_SIGNIN_ENABLED=true` (and `SITE_URL` already set). Try it on a deploy preview with a test Google account first.

## Not verified (honest list)
- A real Google round-trip. Tab has no Google Cloud account (creating one needs phone verification), so this was **simulated**. Unit tests use a fake Supabase.
- Checked against a real GoTrue v2.197 locally:
  - `/authorize?provider=google` with PKCE redirects to `accounts.google.com`.
  - `admin/generate_link` + `POST /verify` with `token_hash` returns a session.
  - The unlink RPC removes only the Google identity, only for service_role (anon gets 401).
- Whether hosted Supabase lets the `postgres` role delete from `auth.identities` was not tested on his project. It works on local Supabase CLI.
- Orphans: a Google user who never finishes signup stays in `auth.users` without a profile and without any Veyra session. A cleanup job is not part of this PR.
