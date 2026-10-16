# Third-Party Notices

## cm-chessboard
Repository: https://github.com/shaack/cm-chessboard
License: MIT
Usage: Chessboard rendering and interaction.


## Chess Art
Repository: https://github.com/maurimo/chess-art
License: MIT
Usage: PRMI chess piece artwork.

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
- Use: rules/move generation core, bundled with Veyra's own MIT compatibility layer (`rules-src/chess-compat.mjs`) into `public/vendor/veyra-rules/`. chess.js (BSD-2) has been removed.

## daxaur/tabia — opening repertoires and module format
- Source: https://github.com/daxaur/tabia (data files `src/data/*.js` only)
- License: MIT
- Copyright (c) 2026 dax
- Notes: 14 repertoires and the repertoire module format. The vendor files of that repository (chess.js, Stockfish, piece sets) are not used here.

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
