# Project Instructions

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
