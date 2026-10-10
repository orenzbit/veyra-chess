# Veyra Chess — Production Browser Error Fix Verification

Date: 2026-09-27

## Root causes fixed

1. The shipped React UMD runtime was React 16.0.0 while the application uses React Hooks (`useState`, `useEffect`, `useRef`).
2. `index.html` contained inline scripts that were blocked by the production Content-Security-Policy.
3. `manifest.webmanifest` and other required static assets could be intercepted by the private-beta Edge Gate and return 401 before the app loaded.

## Fixes

- Updated the runtime to React 18.2.0 via pinned cdnjs URLs.
- Removed inline language initialization from `index.html` and moved it into `public/bootstrap.js`.
- Removed inline service-worker registration from `index.html` and moved it into `public/bootstrap.js`.
- Updated CSP `script-src` to allow only `self` and `https://cdnjs.cloudflare.com`.
- Updated the Edge Gate to allow required public static assets (including the manifest, bootstrap, app modules, data, assets, vendor files and legal/download/credits pages) while still protecting the application entry point.
- Removed the unused old React runtime files from the shipped public tree.
- Updated `THIRD_PARTY_NOTICES.md` for React 18.2.0.
- Removed the inline error script from the Edge Gate; wrong-password messages are now rendered server-side.

## Automated verification

PASS — `npm run check`
PASS — `npm run check:bots`
PASS — `npm run check:product`
PASS — `npm run check:access`
PASS — `npm run check:release`
PASS — `npm run build`

## Not verified here

- Live Netlify browser execution after redeploy.
- Actual React CDN delivery from the user's browser.
- Live Supabase connectivity.

These must be tested after uploading this fixed package to Netlify.
