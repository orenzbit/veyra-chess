# Third-Party Notices

## cm-chessboard
Repository: https://github.com/shaack/cm-chessboard
License: MIT
Usage: Chessboard rendering and interaction.

## cm-chessboard standard piece artwork
Repository: https://github.com/shaack/cm-chessboard
License: CC BY-SA 3.0
Usage: Unmodified standard SVG artwork only; approved exception to the MIT-only code policy.
File: `public/vendor/cm-chessboard/pieces/standard.svg`
Source: https://github.com/shaack/cm-chessboard/blob/2069b9ef3c10f1e2f005dad9eb9a2c35ee60a865/assets/pieces/standard.svg
Authors: Cburnett and Rfc1394 (Wikimedia Commons); adapted for cm-chessboard by Stefan Haack.
License terms: https://creativecommons.org/licenses/by-sa/3.0/
SHA256: `b85bba95342a9483420999cedeb1c503e6db16cdd7a0da1f3a228549a13134c5`
The upstream attribution and license are retained in the SVG. This exception does not cover other assets or the noncommercial Staunty set.

## Chess Art
Repository: https://github.com/maurimo/chess-art
License: MIT
Usage: Legacy PRMI artwork retained on disk; no longer selected by the application's boards.

## React 18.2.0
Repository: https://github.com/facebook/react
License: MIT
Usage: UI runtime via cdnjs CDN.
Runtime URLs:
- https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js
- https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js

## Chessy engine
Repository: https://github.com/den-run-ai/chessy
License: MIT
Usage: browser/WASM analysis engine.

## Veyra Openings dataset
- Source: authored for Veyra Chess (`data-src/tabia-openings.txt` → `public/data/openings.json`)
- License: MIT
- Notes: no third-party opening tables used; every line validated move-by-move.

## js-chess-engine
- Source: https://github.com/josefjadrny/js-chess-engine (npm `js-chess-engine`)
- License: MIT
- Copyright (c) Josef Jadrny
- Use: rules and move-generation core, bundled with Veyra's own MIT rules API (`rules-src/chess-compat.mjs`) into `public/vendor/veyra-rules/`.

## daxaur/tabia — opening repertoires and module format
- Source: https://github.com/daxaur/tabia (data files `src/data/*.js` only)
- License: MIT
- Copyright (c) 2026 dax
- Notes: 14 repertoires and the repertoire module format. The vendor files of that repository (Stockfish and piece sets) are not used here.

## Anthropic claude-code-security-review
- Source: https://github.com/anthropics/claude-code-security-review
- License: MIT
- Use: development tooling only (security-review criteria); not shipped to users.


## ALTCHA
Repository: https://github.com/altcha-org/altcha
License: MIT
Version: altcha@3.3.0 (npm). The vendored file `public/vendor/altcha/altcha.i18n.min.js` is byte-identical to `dist/main/altcha.i18n.min.js` of that package (sha256 `6274613eb63f019f256327a371155710f17b1ff7d2b5cfcc8b8fa50e8dc056bc`); `npm run check:human` verifies this.
Usage: Self-hosted proof-of-work human check. PBKDF2 runs on browser WebCrypto; the bundle contains no WebAssembly, so the optional `hash-wasm` dependency is not shipped.

## altcha-lib
Repository: https://github.com/altcha-org/altcha-lib
License: MIT
Usage: Server-side creation and verification of human-check challenges in `netlify/functions/human.mjs`.
