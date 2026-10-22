# Capablanca vs Tal-inspired bot · simulation record

- Generation date: 2026-10-22
- These are generated Veyra bot-vs-bot simulations, not historical games between the two players.
- Move selection uses the repository bot engine with deterministic random sampling (Math.random = 0.99).
- PNGs show the final position; PGNs contain the full legal move sequence.

| Game | White | Black | Result | Half-moves | PGN | Final board PNG |
|---|---|---|---|---:|---|---|
| 1 | Capablanca-inspired bot | Tal-inspired bot | 1-0 (checkmate) | 91 | [capablanca-white.pgn](./capablanca-white.pgn) | [capablanca-white.png](./capablanca-white.png) |
| 2 | Tal-inspired bot | Capablanca-inspired bot | 1/2-1/2 (draw) | 66 | [capablanca-black.pgn](./capablanca-black.pgn) | [capablanca-black.png](./capablanca-black.png) |

## Reproduction

Run npm run build, install Playwright/Chromium, then run npm run build:capablanca-matches.
Validate committed artifacts with npm run check:capablanca-matches.
