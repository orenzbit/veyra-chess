# Chess DNA implementation plan

Status: implementation plan for review; not a claim that the feature is complete.

> Note (2026-11-04): All Chessigma reference / product-research mentions were removed per project decision. The feature continues to be defined and implemented solely against Veyra Chess requirements and the current repository state. Full prior revision history remains in git.

## Product contract
- Build a real Chess DNA report from the latest eligible games, capped at 25 per time control: Bullet, Blitz, and Rapid (up to 75 total).
- Report actual counts at each stage: fetched, valid, eligible, reused, analyzed, excluded, and failed. Never pad with demo data or label a partial report complete.
- Keep time controls separate. Prefer trustworthy source metadata; classify from time-control data only under an explicit, tested rule. Keep unknown/ambiguous games out of the three target groups and disclose them.
- Persist per-game analysis and versioned report snapshots server-side, scoped to the authenticated account.
- Reuse analysis only when normalized PGN fingerprint, engine/version, analysis settings, and required schema are compatible. Accuracy-only historical records are not full analysis.
- Do not push, merge to main, or deploy until the user has inspected the preview and later explicitly replies “מאושר”.

## Ordered work stages and gates
1. **Baseline audit (read-only)**
2. **Metrics contract and fixtures**
3. **Persistence design**
4. **Game selection and identity**
5. **Analysis queue and cache reuse**
6. **Metric aggregation and insights**
7. **UI and report states**
8. **Security and adversarial integration**
9. **Per-file and release review** (each file ≥ 95/100)
10. **Preview and explicit release authorization** (“מאושר”)

## Review rules
- Simulated adversarial reviews only; not real endorsements.
- Critical security/correctness/data-loss issues always block regardless of score.
- Do not claim tests or builds succeeded unless actually executed and verified.

For the full technical baseline audit, metric contracts, and implementation progress notes that existed before the reference cleanup, see the git history of this file prior to the 2026-11-04 cleanup commits.
