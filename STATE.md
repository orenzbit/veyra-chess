# Veyra Puzzles — Project Status

## Project contents
- `src/` — JavaScript ES modules for board/FEN parsing, pseudo-legal moves, tactics, storage, and puzzle flow.
- `ts/` — TypeScript port of the core modules.
- `data/puzzle-seed.json` — 24 puzzle records: 12 authored positions and 12 color-flipped mirrors.
- `scripts/` — seed builders and validators, preview builder, TypeScript package exporter, and seed-backed session simulation.
- `part1.html`, `part2.html`, `part3.html` — preview source; `preview.html` is their generated interactive page.
- `.github/copilot-instructions.md` — project-specific editing and verification guidance.

## Verification
- `py scripts/check_seed.py` validates all 24 records, unique IDs, legal solution moves (no move may leave the mover's own king in check), that every `missed_mate` solution ends in checkmate, and seed/mirror pairs. `node scripts/check-seed.mjs` runs the same checks.
- `py scripts/simulate.py` runs a deterministic sample session using real seed records.
- `py scripts/build_preview.py` rebuilds the interactive preview from its source parts and seed.
- `py scripts/emit_ts.py <new-directory>` exports the TypeScript port and seed. It refuses to overwrite an existing destination.
- Both seed builders use the current UTC date for generated records.
- Browser runtime checks covered checkmate vs. non-mating check, invalid UCI rejection, king-capture rejection, correct classification across all 24 seed records, engine harvesting, storage fallback, the 50-entry recent-mistake cap, and escaping seed text in the preview.
- Seed validation passes in regular and optimized Python modes (`py -O`); the builder and TypeScript exporter were also exercised against temporary destinations.

## Integration boundary
The TypeScript modules and seed are packaged for integration, but are not connected to the separate `veyra-chess` application. The files are pushed to GitHub (`orenzbit/veyra-chess`, `main`). Integration and application-level UI/i18n/CSS work remain separate tasks.

## Validation limitations
Node.js and `tsc` are available now. `node scripts/check-seed.mjs`, `node scripts/build-seed.mjs` and a strict `tsc --noEmit` over `ts/*.ts` all pass.
