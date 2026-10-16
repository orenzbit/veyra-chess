# Openings provenance — Veyra Chess

- **Format:** the repertoire module format from daxaur/tabia (MIT): `{ id, name, color, eco?, oneLiner, trunk, groups, lines:[{ id, name, group, star, idea, moves:[[SAN, comment?]] }] }`. Every opening in Veyra Chess uses it.
- **Sources (all MIT):**
  1. daxaur/tabia, © 2026 dax — 14 hand-written repertoires (Blackmar-Diemer, Jobava London, Budapest, Alien, Benoni Gambit, Benoni, Queen's Gambit, Ruy Lopez, Italian, Sicilian, French, Caro-Kann, Scotch Gambit, Vienna Gambit). Included unchanged in content; see `data-src/daxaur/LICENSE`. Only these data files were taken. The vendor files of that repository (Stockfish and piece sets) were NOT taken.
  2. Veyra Openings — written for Veyra Chess (`data-src/veyra-openings.txt`), with one-liners and ideas by the chess-masters panel (`data-src/masters-notes.json`). No third-party opening table was copied.
- **Removed:** the earlier 3,803-line `openings.json`, whose structure matched the lichess-org/chess-openings table (CC0). No lichess opening data remains in the project. (The optional "import my games from Lichess" feature calls Lichess's public API at runtime and ships no Lichess data.)
- **Validation:** `npm run build:openings` replays every line move-by-move on the rules engine (js-chess-engine, MIT) and fails on any illegal move. All 1,144 lines also pass daxaur/tabia's own validator and an independent engine (test-only, not shipped).
- **Tiers:** Veyra lines carry `tier` in `public/data/openings.json`: `1` = core set, `2` = extension approved on 2026-10-04. Tier-2 names are traditional where well known, otherwise descriptive, and have not been reviewed by a second person.
- **ECO codes:** Veyra lines have none (third-party classification). The `eco` fields of the 14 daxaur repertoires are kept as authored.
- **Outputs:** `data/repertoire/*.js` (module format), `public/data/repertoire.json` (bundle), `public/data/openings.json` (flat book used by Review).
