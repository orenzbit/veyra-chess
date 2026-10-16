/**
 * Veyra Chess review calculators.
 * Product-specific game ratings are estimates, not official chess federation ratings.
 */
export interface MoveEvaluation {
  index: number;
  whiteChanceBefore?: number;
  whiteChanceAfter?: number;
  classification?: string;
  drop?: number;
  playedUci?: string;
  bestUci?: string;
}
export interface GameRatingOptions {
  accuracy: number;
  opponentRating?: number;
  playerRating?: number;
  result?: 'win' | 'loss' | 'draw' | string;
  moveCounts?: Record<string, number>;
}
export interface GameRatingResult {
  gameRating: number;
  moveQualityRating: number;
  performanceRating?: number;
  tier: string;
}
export interface PlayerReviewMetrics {
  accuracy: number;
  gameRating: number;
  moveQualityRating: number;
  performanceRating?: number;
  tier: string;
  counts: Record<string, number>;
}
export interface FullReviewMetrics {
  white: PlayerReviewMetrics;
  black: PlayerReviewMetrics;
  counts: { white: Record<string, number>; black: Record<string, number> };
}
export interface ReviewMetaOptions {
  whiteRating?: number;
  blackRating?: number;
  result?: string;
}
export const GAME_RATING_ANCHORS: [number, number][] = [
  [40,500],[50,650],[60,800],[70,1200],[75,1400],[80,1600],[85,1800],
  [88,2000],[90,2200],[93,2400],[95,2600],[97,2800],[99,3000]
];
const VOLATILITY_WINDOW=4;
const VOLATILITY_NORMALIZER=25;
export function clamp(v:number,min:number,max:number):number { return Math.max(min,Math.min(max,v)); }
export function stddev(values:number[]):number {
  if(values.length<2) return 0;
  const mean=values.reduce((a,b)=>a+b,0)/values.length;
  return Math.sqrt(values.reduce((a,b)=>a+(b-mean)**2,0)/values.length);
}
export function harmonicMean(values:number[]):number {
  if(!values.length) return 0;
  const safe=values.map(v=>Math.max(0.001,v));
  return values.length/safe.reduce((a,v)=>a+1/v,0);
}
export function calculateAccuracyForSide(moves:MoveEvaluation[],side:'white'|'black'):number {
  const sideMoves=moves.filter(m=>side==='white'?m.index%2===0:m.index%2===1);
  if(!sideMoves.length) return 0;
  const perMove=sideMoves.map(m=>{
    const before=side==='white'?(m.whiteChanceBefore??50):(100-(m.whiteChanceBefore??50));
    const after=side==='white'?(m.whiteChanceAfter??50):(100-(m.whiteChanceAfter??50));
    return clamp(103.1668*Math.exp(-0.04354*Math.max(0,before-after))-3.1669,0,100);
  });
  const winAfter=sideMoves.map(m=>side==='white'?(m.whiteChanceAfter??50):(100-(m.whiteChanceAfter??50)));
  const windowStds:number[]=[];
  for(let i=0;i<winAfter.length;i++) windowStds.push(stddev(winAfter.slice(Math.max(0,i-(VOLATILITY_WINDOW-1)),i+1)));
  const avgStd=windowStds.reduce((a,b)=>a+b,0)/Math.max(1,windowStds.length);
  const weight=clamp(avgStd/VOLATILITY_NORMALIZER,0,1);
  const mean=perMove.reduce((a,b)=>a+b,0)/perMove.length;
  return Math.round((weight*harmonicMean(perMove)+(1-weight)*mean)*10)/10;
}
export function calculateMoveQualityRating(accuracy:number,moveCounts?:Record<string,number>):number {
  const acc=clamp(accuracy,0,100);
  let baseRating:number;
  if(acc<=GAME_RATING_ANCHORS[0][0]) baseRating=GAME_RATING_ANCHORS[0][1];
  else {
    let interpolated=false;
    baseRating=GAME_RATING_ANCHORS[GAME_RATING_ANCHORS.length-1][1];
    for(let i=1;i<GAME_RATING_ANCHORS.length;i++){
      const [x1,y1]=GAME_RATING_ANCHORS[i-1], [x2,y2]=GAME_RATING_ANCHORS[i];
      if(acc<=x2){baseRating=Math.round(y1+((acc-x1)/(x2-x1))*(y2-y1));interpolated=true;break;}
    }
    if(!interpolated){
      const n=GAME_RATING_ANCHORS.length, [x1,y1]=GAME_RATING_ANCHORS[n-2], [x2,y2]=GAME_RATING_ANCHORS[n-1];
      baseRating=Math.round(y2+((acc-x2)/(x2-x1))*(y2-y1));
    }
  }
  if(moveCounts){
    const sigma=(moveCounts.sigma||0)+(moveCounts.brilliant||0);
    const best=moveCounts.best||0;
    const clown=(moveCounts.clown||0)+(moveCounts.blunder||0);
    const miss=moveCounts.miss||0;
    baseRating+=Math.min(60,sigma*25+Math.floor(best/5)*10)-Math.min(100,clown*25+miss*15);
  }
  return clamp(Math.round(baseRating),400,3200);
}
/**
 * Single-game estimate using FIDE's score-difference table: 100%=+800, 50%=0, 0%=-800.
 * This is not an official FIDE performance rating. Official performance ratings use
 * average opponent rating plus a score-percentage difference across an event/norm.
 * Source: https://handbook.fide.com/chapter/B022024, section 7.1.1.
 */
export function calculateSingleGamePerformanceEstimate(opponentRating:number,result:'win'|'loss'|'draw'|string):number {
  if(!Number.isFinite(opponentRating)||opponentRating<0||opponentRating>4000)
    throw new RangeError('opponentRating must be a finite number between 0 and 4000');
  const r=String(result).trim().toLowerCase();
  let delta:number;
  if(r==='win'||r==='1-0'||r==='1') delta=800;
  else if(r==='loss'||r==='0-1'||r==='0') delta=-800;
  else if(r==='draw'||r==='1/2-1/2'||r==='0.5'||r==='½') delta=0;
  else throw new RangeError('Unsupported game result: '+result);
  return Math.round(opponentRating+delta);
}
/** @deprecated Use calculateSingleGamePerformanceEstimate; this is not an official FIDE performance rating. */
export const calculateFidePerformance=calculateSingleGamePerformanceEstimate;
export function getPerformanceTier(elo:number):{tier:string;badge:string} {
  if(elo>=2700)return {tier:'Super Grandmaster',badge:'👑'};
  if(elo>=2400)return {tier:'Grandmaster',badge:'💎'};
  if(elo>=2000)return {tier:'Master',badge:'🥇'};
  if(elo>=1700)return {tier:'Expert',badge:'🥈'};
  if(elo>=1400)return {tier:'Club Player',badge:'🥉'};
  if(elo>=1100)return {tier:'Intermediate',badge:'♟️'};
  return {tier:'Novice',badge:'🌱'};
}
export function calculateGameRating(options:GameRatingOptions):GameRatingResult {
  const moveQuality=calculateMoveQualityRating(options.accuracy,options.moveCounts);
  let performanceRating:number|undefined;
  let finalRating=moveQuality;
  if(typeof options.opponentRating==='number'&&Number.isFinite(options.opponentRating)&&options.result){
    performanceRating=calculateSingleGamePerformanceEstimate(options.opponentRating,options.result);
    finalRating=Math.round(0.65*moveQuality+0.35*performanceRating);
  }
  finalRating=clamp(finalRating,400,3200);
  return {gameRating:finalRating,moveQualityRating:moveQuality,performanceRating,tier:getPerformanceTier(finalRating).tier};
}
export function calculateClassificationsBreakdown(moves:MoveEvaluation[]):{white:Record<string,number>;black:Record<string,number>} {
  const counts={white:{} as Record<string,number>,black:{} as Record<string,number>};
  for(const m of moves){
    const side=m.index%2===0?'white':'black';
    const raw=(m.classification||'good').toLowerCase();
    let norm=raw;
    if(raw==='brilliant')norm='sigma';
    if(raw==='great')norm='awesome';
    if(raw==='inaccuracy')norm='strange';
    if(raw==='mistake')norm='bad';
    if(raw==='blunder')norm='clown';
    counts[side][norm]=(counts[side][norm]||0)+1;
    if(norm!==raw)counts[side][raw]=(counts[side][raw]||0)+1;
  }
  return counts;
}
export function computeFullReviewMetrics(moves:MoveEvaluation[],meta?:ReviewMetaOptions):FullReviewMetrics {
  const counts=calculateClassificationsBreakdown(moves);
  const whiteAcc=calculateAccuracyForSide(moves,'white'), blackAcc=calculateAccuracyForSide(moves,'black');
  let whiteResult:'win'|'loss'|'draw'|undefined, blackResult:'win'|'loss'|'draw'|undefined;
  if(meta?.result){
    const r=meta.result.trim().toLowerCase();
    if(r==='1-0'||r==='white'||r==='win'){whiteResult='win';blackResult='loss';}
    else if(r==='0-1'||r==='black'||r==='loss'){whiteResult='loss';blackResult='win';}
    else if(r==='1/2-1/2'||r==='draw'){whiteResult='draw';blackResult='draw';}
  }
  const w=calculateGameRating({accuracy:whiteAcc,opponentRating:meta?.blackRating,playerRating:meta?.whiteRating,result:whiteResult,moveCounts:counts.white});
  const b=calculateGameRating({accuracy:blackAcc,opponentRating:meta?.whiteRating,playerRating:meta?.blackRating,result:blackResult,moveCounts:counts.black});
  return {
    white:{accuracy:whiteAcc,gameRating:w.gameRating,moveQualityRating:w.moveQualityRating,performanceRating:w.performanceRating,tier:w.tier,counts:counts.white},
    black:{accuracy:blackAcc,gameRating:b.gameRating,moveQualityRating:b.moveQualityRating,performanceRating:b.performanceRating,tier:b.tier,counts:counts.black},
    counts
  };
}
