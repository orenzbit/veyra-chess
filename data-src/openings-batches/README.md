# Opening batch files

Each batch adds one file here, named `<BATCH_ID>.txt` (for example `A2-spanish.txt`); only `.txt` files are read.
Format per line: `Family: Variation | e4 e5 Nf3 Nc6 ...` (SAN without move numbers, plain ASCII hyphens, no `!?`).
A sub-line is named `Family: Variation, Sub` and needs its parent line `Family: Variation` in some source file.
A line with the same moves as another name must end with `# alias`; comment headers start with `#`.
Names are copied exactly as lichess.org spells them; a line is only verified after its lichess page was read.
Validate with `npm run check:openings-source` (the batch file plus `data-src/veyra-openings.txt`).
Batches never touch generated files; `npm run build:openings` runs once, in the integration step.
