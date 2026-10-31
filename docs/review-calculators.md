# Veyra Chess review calculators

## Status and intended use
This is a product-specific analysis engine. Accuracy and Move Quality Rating are heuristic estimates; the blended Game Rating is not an official FIDE rating.

## Performance estimate
`calculateSingleGamePerformanceEstimate(opponentRating, result)` applies the notional FIDE score-difference table values to a single result: win +800, draw 0, loss -800. FIDE describes the 0% and 100% values as notional because the difference is indeterminate at those endpoints. This one-game estimate must not be called an official FIDE performance rating.

Official reference: [FIDE Rating Regulations, section 7.1.1](https://handbook.fide.com/chapter/B022024).

## API
- `calculateAccuracyForSide(moves, side)`
- `calculateMoveQualityRating(accuracy, moveCounts?)`
- `calculateSingleGamePerformanceEstimate(opponentRating, result)`
- `calculateGameRating(options)`
- `calculateClassificationsBreakdown(moves)`
- `computeFullReviewMetrics(moves, meta?)`

The deprecated `calculateFidePerformance` export remains as a compatibility alias; it does not return an official FIDE performance rating.

## Tests
Run `npm run test:calculators`. The test command compiles TypeScript and runs 10 calculator test suites.
