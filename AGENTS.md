# AGENTS.md - Veyra Chess Development & Review Guidelines

## Ponytail Lazy Senior Developer Protocol
> "The best code is the code you never wrote. Solve the whole problem with the least new code."

When building features, fixing bugs, or reviewing PRs in Veyra Chess:

### 1. The Decision Ladder (Stop at the first rung that works)
1. **Does it need to exist?** Skip unnecessary options, abstractions, wrappers, and boilerplate.
2. **Already in this codebase?** Reuse existing utilities (rules engine, chess-dna, review-metrics, game-archive).
3. **Standard library / native feature?** Use built-in JS/Browser/Web platform APIs.
4. **An installed dependency?** Use existing strictly MIT-licensed libraries (`js-chess-engine`, `altcha-lib`). Never add dependencies for a few lines.
5. **Can it be simple and direct?** The shortest, cleanest working diff wins.
6. **Otherwise:** The absolute minimum code that works.

### 2. What Must Never Be Cut
- Validation at trust boundaries and security gates.
- Error handling that prevents data loss or crashes.
- Accurate chess legality and determinism.
- Clean responsive UI without horizontal overflows.

### 3. Verification & Safety
Every non-trivial logic change leaves at least one deterministic automated test or assertion.
Run `npm run check:release` and `node scripts/code-guardian.mjs` before submitting changes.
