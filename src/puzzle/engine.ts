// Veyra puzzle engine — TS port (src/puzzle-engine.ts).
import { classifyMotif, seedRating } from './tactics.js';
import type { Motif } from './tactics.js';
import { hashPuzzleId, freshStats } from './repo.js';
import type { PuzzleRecord } from './repo.js';

export const DROP_THRESHOLD = 0.10;
export interface AnalyzedMove { ply:number; fenBefore:string; playedUci:string; bestUci:string; drop:number; clocksSec?:number|null }
export interface HarvestCtx { gameId:string; opponent:string; date:string }
export interface ImprovementProfile {
  version:1; puzzleElo:number;
  motifs:Record<Motif,{seen:number;solved:number}>;
  phases:{opening:{seen:number;solved:number};middlegame:{seen:number;solved:number};endgame:{seen:number;solved:number}};
  recentMistakes:{fen:string;motif:Motif;date:string}[];
  nextFocus:Motif; streak:{current:number;best:number;lastDate:string}; updatedAt:string;
}

export function harvestFromAnalysis(moves:AnalyzedMove[], ctx:HarvestCtx):PuzzleRecord[] {
  const out:PuzzleRecord[]=[];
  for(const m of moves||[]){
    const drop=Number(m.drop)||0;
    if(drop<DROP_THRESHOLD||!m.bestUci||!m.fenBefore) continue;
    const motif=classifyMotif({fen:m.fenBefore,bestUci:m.bestUci,severity:drop,ply:m.ply,clocksSec:m.clocksSec});
    const rec:PuzzleRecord={
      id:'',fen:m.fenBefore,solution:[m.bestUci],played:m.playedUci||'',
      source:{gameId:ctx.gameId,ply:m.ply||0,date:ctx.date,opponent:ctx.opponent,kind:'harvest'},
      motif,severity:drop,class:drop>=0.25?'blunder':'mistake',
      rating:seedRating(drop),stats:freshStats(),createdAt:new Date().toISOString(),
    };
    rec.id=hashPuzzleId(rec.fen,rec.solution);
    out.push(rec);
  }
  return out;
}

export function hintFor(rec:PuzzleRecord, level:number):string {
  const s=rec.solution[0];
  if(level<=1) return s.length===5?'promote:'+s[4].toUpperCase():'from:'+s.slice(0,2);
  if(level===2) return 'target:'+s.slice(2,4);
  return 'move:'+s;
}

export function updateElo(profile:ImprovementProfile, puzzle:{rating:number}, solved:boolean):void {
  const exp=1/(1+Math.pow(10,(puzzle.rating-profile.puzzleElo)/400));
  profile.puzzleElo=Math.round(profile.puzzleElo+32*((solved?1:0)-exp));
  puzzle.rating=Math.round(puzzle.rating+16*((solved?0:1)-(1-exp)));
}

export function freshProfile():ImprovementProfile {
  const z=()=>({seen:0,solved:0});
  return { version:1,puzzleElo:800,
    motifs:{missed_mate:z(),hanging_piece:z(),king_safety:z(),opening:z(),endgame:z(),time_pressure:z(),general:z()},
    phases:{opening:z(),middlegame:z(),endgame:z()},
    recentMistakes:[],nextFocus:'general',
    streak:{current:0,best:0,lastDate:''},updatedAt:new Date().toISOString() };
}

export function refreshProfile(profile:ImprovementProfile, attempts:{motif:Motif;phase:keyof ImprovementProfile['phases'];solved:boolean;date?:string;fen?:string}[]):ImprovementProfile {
  for(const a of attempts||[]){
    const m=profile.motifs[a.motif];
    if(m){m.seen++;if(a.solved)m.solved++;}
    const ph=profile.phases[a.phase];
    if(ph){ph.seen++;if(a.solved)ph.solved++;}
    if(!a.solved&&a.fen){
      profile.recentMistakes.push({fen:a.fen,motif:a.motif,date:a.date||new Date().toISOString().slice(0,10)});
    }
  }
  profile.recentMistakes=profile.recentMistakes.slice(-50);
  let worst:Motif='general',worstRate=2;
  for(const k of Object.keys(profile.motifs) as Motif[]){
    const s=profile.motifs[k];
    if(s.seen>=5){const r=s.solved/s.seen;if(r<worstRate){worstRate=r;worst=k;}}
  }
  profile.nextFocus=worst;
  const today=new Date().toISOString().slice(0,10);
  if(attempts?.length&&profile.streak.lastDate!==today){
    const y=new Date(Date.now()-864e5).toISOString().slice(0,10);
    profile.streak.current=profile.streak.lastDate===y?profile.streak.current+1:1;
    profile.streak.best=Math.max(profile.streak.best,profile.streak.current);
    profile.streak.lastDate=today;
  }
  profile.updatedAt=new Date().toISOString();
  return profile;
}
