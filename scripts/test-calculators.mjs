import assert from "node:assert/strict";
import {
  calculateAccuracyForSide, calculateMoveQualityRating, calculateFidePerformance,
  calculateSingleGamePerformanceEstimate, calculateGameRating, calculateClassificationsBreakdown,
  computeFullReviewMetrics, getPerformanceTier
} from "../dist/src/review-calculators.js";

const suites = [];
function suite(name, fn) { fn(); suites.push(name); console.log("PASS: " + name); }

suite("1 accuracy empty/perfect/blunder", () => {
  assert.equal(calculateAccuracyForSide([], "white"), 0);
  const perfect = [0,1,2,3].map(index=>({index,whiteChanceBefore:50,whiteChanceAfter:50}));
  assert.equal(calculateAccuracyForSide(perfect,"white"),100);
  assert.ok(calculateAccuracyForSide([{index:0,whiteChanceBefore:50,whiteChanceAfter:10},{index:2,whiteChanceBefore:10,whiteChanceAfter:0}],"white")<50);
});
suite("2 move-quality anchors and bounds", () => {
  assert.equal(calculateMoveQualityRating(85),1800);
  assert.equal(calculateMoveQualityRating(60),800);
  assert.ok(calculateMoveQualityRating(10)>=400);
  assert.equal(calculateMoveQualityRating(1000),3100);
});
suite("3 single-game estimate uses FIDE score table values", () => {
  assert.equal(calculateSingleGamePerformanceEstimate(1500,"win"),2300);
  assert.equal(calculateSingleGamePerformanceEstimate(1500,"loss"),700);
  assert.equal(calculateSingleGamePerformanceEstimate(1500,"draw"),1500);
  assert.equal(calculateFidePerformance(1500,"win"),2300);
});
suite("4 result aliases and invalid input", () => {
  assert.equal(calculateSingleGamePerformanceEstimate(1500,"1/2-1/2"),1500);
  assert.equal(calculateSingleGamePerformanceEstimate(1500,"1"),2300);
  assert.equal(calculateSingleGamePerformanceEstimate(1500,"0"),700);
  assert.throws(()=>calculateSingleGamePerformanceEstimate(NaN,"win"),RangeError);
  assert.throws(()=>calculateSingleGamePerformanceEstimate(1500,"unknown"),RangeError);
});
suite("5 combined game rating", () => {
  const gm=calculateGameRating({accuracy:98});
  assert.ok(gm.gameRating>=2700);
  assert.equal(getPerformanceTier(gm.gameRating).badge,"👑");
  const draw=calculateGameRating({accuracy:75.9,opponentRating:1400,result:"draw"});
  assert.ok(draw.gameRating>=1350&&draw.gameRating<=1500);
});
suite("6 classification normalization", () => {
  const c=calculateClassificationsBreakdown([
    {index:0,classification:"brilliant"},{index:1,classification:"best"},
    {index:2,classification:"blunder"},{index:3,classification:"mistake"},
    {index:4,classification:"great"}
  ]);
  assert.equal(c.white.sigma,1); assert.equal(c.white.clown,1); assert.equal(c.white.awesome,1);
  assert.equal(c.black.best,1); assert.equal(c.black.bad,1);
});
suite("7 full-review integration", () => {
  const full=computeFullReviewMetrics([
    {index:0,whiteChanceBefore:50,whiteChanceAfter:52,classification:"best"},
    {index:1,whiteChanceBefore:48,whiteChanceAfter:45,classification:"inaccuracy"},
    {index:2,whiteChanceBefore:55,whiteChanceAfter:60,classification:"good"},
    {index:3,whiteChanceBefore:40,whiteChanceAfter:35,classification:"good"}
  ],{whiteRating:1500,blackRating:1520,result:"1-0"});
  assert.equal(typeof full.white.accuracy,"number"); assert.ok(full.white.gameRating>0);
  assert.ok(full.black.gameRating>0); assert.ok(full.counts.white&&full.counts.black);
});
suite("8 rating input validation", () => {
  assert.throws(()=>calculateSingleGamePerformanceEstimate(-1,"win"),RangeError);
  assert.throws(()=>calculateSingleGamePerformanceEstimate(4001,"win"),RangeError);
  assert.equal(calculateSingleGamePerformanceEstimate(0,"draw"),0);
});
suite("9 extreme accuracy remains bounded", () => {
  const acc=calculateAccuracyForSide([
    {index:0,whiteChanceBefore:100,whiteChanceAfter:0},
    {index:2,whiteChanceBefore:0,whiteChanceAfter:100}
  ],"white");
  assert.ok(acc>=0&&acc<=100);
});
suite("10 tiers and unknown game result handling", () => {
  assert.equal(getPerformanceTier(2399).tier,"Master");
  assert.equal(getPerformanceTier(2400).tier,"Grandmaster");
  const noResult=computeFullReviewMetrics([],{result:"invalid"});
  assert.equal(noResult.white.performanceRating,undefined);
  assert.equal(noResult.black.performanceRating,undefined);
});
suite("11 brilliant and blunder are counted once in move quality", () => {
  const brilliant=computeFullReviewMetrics([
    {index:0,whiteChanceBefore:50,whiteChanceAfter:50,classification:"brilliant"}
  ]);
  assert.equal(brilliant.white.counts.sigma,1); assert.equal(brilliant.white.counts.brilliant,1);
  assert.equal(brilliant.white.moveQualityRating,calculateMoveQualityRating(brilliant.white.accuracy,{sigma:1}));
  const blunder=computeFullReviewMetrics([
    {index:0,whiteChanceBefore:50,whiteChanceAfter:50,classification:"blunder"}
  ]);
  assert.equal(blunder.white.counts.clown,1); assert.equal(blunder.white.counts.blunder,1);
  assert.equal(blunder.white.moveQualityRating,calculateMoveQualityRating(blunder.white.accuracy,{clown:1}));
});
console.log("ALL " + suites.length + "/11 TEST SUITES PASSED");
