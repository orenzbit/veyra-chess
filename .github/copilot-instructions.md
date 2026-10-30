# Project Instructions

## HARD RULE — Never force-push

**NEVER run any form of force push on any branch of this repository.**

Forbidden commands (non-exhaustive):
- `git push --force`
- `git push -f`
- `git push --force-with-lease`
- `git push --force-with-lease=...`
- any equivalent that rewrites remote history

This applies to `main`, feature branches, and every other branch.

**Why:**
- Force-push rewrites shared history and can permanently delete commits others already pulled.
- It breaks open PRs, CI runs, and review links.
- On `main` it can wipe production-relevant history and documentation (this already happened once with a truncated README).
- Recovery is hard; prevention is mandatory.

**If history needs fixing:**
1. Prefer `git revert` (creates a new commit that undoes the bad one).
2. Or add a new fixing commit on top.
3. Open a normal PR. Never rewrite remote history.

If the user asks for a force-push: **refuse**, explain this rule, and offer revert / new commit / PR instead.

## Before editing

- Inspect the relevant files and nearby conventions before changing code.
- Before each edit batch, briefly tell the user which files will change, why, and how the change will be verified.
- If scope, expected behavior, or a risky/destructive action is unclear, ask before proceeding.
- Before running a command that overwrites generated or user data, inspect the target and explain the effect; do not overwrite existing data without authorization.
- Make the smallest complete change. Do not rewrite unrelated code, suppress errors, or add dependencies without need.

## Quality and verification

- Review every changed line and its surrounding logic for correctness, consistency, and unintended behavior.
- Preserve existing interfaces and data formats unless the user asks otherwise.
- Run the narrowest relevant checks; for puzzle seed changes run `py scripts/check_seed.py`. If Node.js is available, also run `node scripts/build-seed.mjs` followed by `node scripts/check-seed.mjs`.
- If a check cannot run, say why and do not imply that it passed. Report the checks actually run and their results.
- Update directly related instructions or documentation when behavior or workflow changes.
