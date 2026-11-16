# Review engine boot failure — Work handoff

## Verified cause and scope

`src/main.ts` calls `analyzeGameMoves` in `src/review-metrics.ts`. Its engine callback calls `getEngineWorker`. The worker loads Chessy using `WebAssembly.instantiate` in `public/vendor/wasm-engine.js`.

The production `_headers` policy contains `script-src 'self' https://cdnjs.cloudflare.com`, which blocks WASM compilation in the worker. Chromium returns a `boot-error` containing a `CompileError` describing the CSP violation. `getEngineWorker` rejects, and `analyzeGameMoves` wraps it in `ReviewAnalysisError` with `reason: "engine"` and the boot error as `cause`. The UI hides this cause behind the generic move-1 failure message.

Add only `'wasm-unsafe-eval'` to `script-src`. This permits the bundled WASM engine; it does not enable JavaScript `eval` (`'unsafe-eval'` remains absent). Evaluation formulas, search limits, classification thresholds and review code are unchanged.

The old browser parity test serves Vite preview without Netlify `_headers`; it could pass while the deployed engine failed. The new browser test applies the built CSP to both the document and worker responses, runs the actual worker and then exercises the real Review UI with a local test account. It is wired into `verify.yml` after browser tooling installation.

## Reproduction and verification

- New browser test before the header fix: FAIL, worker boot `CompileError` / CSP violation.
- With the header fix: PASS, worker ready, short supplied opening analyzed, numeric Accuracy, evaluation and classification on all six plies.
- Opening used: `1. e4 Nf6 2. e5 Nd5 3. Nf3 Nc6 *`.
- The full saved 2026-11-16 game ending `22.Re8#` was unavailable. No full-game or live acceptance claim is made. Direct live access from the execution environment returned HTTP 403.

Commands after `npm ci` and installing Playwright/Chromium as in CI:

```sh
npm run build
node scripts/check-review-csp-browser.mjs
npm run check:review-determinism
node scripts/check-browser-review.mjs
npm run check
```

For system Chromium use `node scripts/check-review-csp-browser.mjs --chrome` (`CHROME_PATH` overrides its path). `REACT_UMD_DIR` can point to an installed `node_modules` containing React/React DOM 18.2.0 UMD builds for offline CDN fixtures. `REVIEW_PGN_FILE` optionally selects a full PGN instead of the short opening (per-move assertions cover its first six plies).

## Work: approval and live acceptance

Keep this change in its PR until owner approval. Do not merge or deploy as part of this task.

After an approved deploy:

1. Verify the document and `/engine-worker.js` responses include `script-src 'self' 'wasm-unsafe-eval'` in CSP. Reload to avoid stale cached resources.
2. Sign in normally, open Review and load the saved 2026-11-16 game beginning `e4 Nf6 e5 Nd5 Nf3 Nc6` and ending `22.Re8#`.
3. Click Analyze Game. Confirm completion and numeric Accuracy; step through early/middle/final moves and confirm evaluation and classification update. Confirm no WASM/CSP boot error appears in the browser console.
4. Repeat with the short PGN above. Record any failure with `ReviewAnalysisError.reason` and the underlying cause when available.

Supabase: no action required, no SQL migration, Auth setting or Storage setting change. No prerequisite before merge. The fix takes effect when its static response headers are deployed through the normal approved release process.
