export function chooseBotMove(c,bot,ChessCtor){
  const moves=c.moves({verbose:true}); if(!moves.length)return null;
  const repertoire=preferredOpeningMove(c,bot,ChessCtor);
  if(repertoire && moves.some(m=>m.from===repertoire.from&&m.to===repertoire.to&&m.promotion===repertoire.promotion)) return repertoire;
  const elo=bot.elo||300;
  const botSide=c.turn();
  if(elo<=300 && Math.random()<0.22) return moves[Math.floor(Math.random()*moves.length)];
  const configuredDepth=elo>=2400?4:elo>=1700?3:elo>=700?2:1;
  const depth=Math.max(1,Math.min(configuredDepth,Number(bot.searchDepthCap)||5));
  const noiseScale=elo>=2200?0.5:elo>=1600?2:elo>=700?12:28;
  orderMoves(moves);
  let best=moves[0], bestScore=-Infinity;
  for(const mv of moves){
    const cc=new ChessCtor(c.fen()); const applied=cc.move(mv); if(!applied)continue;
    if(cc.isCheckmate()) return mv;
    const styleBonus=evaluateBotStyleBonus(c,cc,applied,bot);
    const noise=(Math.random()*2-1)*noiseScale;
    const searchAlpha=botSide==='w'?bestScore-styleBonus-noise:-Infinity;
    const searchBeta=botSide==='b'?styleBonus+noise-bestScore:Infinity;
    const whiteScore=minimax(cc,depth-1,searchAlpha,searchBeta,cc.turn()==='w',ChessCtor);
    const perspectiveScore=botSide==='w'?whiteScore:-whiteScore;
    const total=perspectiveScore+styleBonus+noise;
    if(total>bestScore){bestScore=total;best=mv;}
  }
  return best;
}
const MOVE_ORDER_VALUE={p:100,n:320,b:330,r:500,q:900,k:20000};
function orderMoves(moves){
  return moves.sort((a,b)=>{
    const score=move=>(move.promotion?800:0)+(move.captured?(MOVE_ORDER_VALUE[move.captured]||0):0)+(String(move.san||'').includes('#')?100000:String(move.san||'').includes('+')?40:0);
    return score(b)-score(a);
  });
}
function evaluateBotStyleBonus(before,after,move,bot){const style=bot?.style||'universal';const piece=before.get(move.from);const to=move.to||'';const center=['c4','d4','e4','f4','c5','d5','e5','f5'].includes(to);let bonus=0;if(after.isCheckmate())return 10000;if(after.isCheck())bonus+=style==='attacking'?24:style==='tactical'?18:6;if(move.captured)bonus+=style==='tactical'?20:style==='attacking'?14:style==='positional'?4:8;if(center&&style==='positional')bonus+=12;if(piece&&['n','b'].includes(piece.type)&&style==='positional'&&['1','2','7','8'].includes(move.from[1]))bonus+=8;if(move.san&&move.san.includes('O-O'))bonus+=style==='defensive'?18:style==='positional'?12:4;if(style==='endgame'&&piece?.type==='k'&&center)bonus+=10;return bonus;}
function evaluateMaterial(c,side){const val={p:100,n:320,b:330,r:500,q:900,k:20000}; const squares=['a8','b8','c8','d8','e8','f8','g8','h8','a7','b7','c7','d7','e7','f7','g7','h7','a6','b6','c6','d6','e6','f6','g6','h6','a5','b5','c5','d5','e5','f5','g5','h5','a4','b4','c4','d4','e4','f4','g4','h4','a3','b3','c3','d3','e3','f3','g3','h3','a2','b2','c2','d2','e2','f2','g2','h2','a1','b1','c1','d1','e1','f1','g1','h1']; let score=0; for(const s of squares){const p=c.get(s); if(!p)continue; score += (p.color===side?1:-1)*(val[p.type]||0);} return score;}
export function preferredOpeningMove(c,bot,ChessCtor,rng=Math.random){
  return pickBookCandidate(bookCandidates(c,bot,ChessCtor),rng);
}
export function pickBookCandidate(candidates,rng=Math.random){
  if(!candidates.length) return null;
  if(candidates.length===1||!candidates.every(item=>Number.isFinite(item.weight)&&item.weight>0)) return candidates[0].move;
  const total=candidates.reduce((sum,item)=>sum+item.weight,0);
  let pick=rng()*total;
  for(const item of candidates){pick-=item.weight;if(pick<0) return item.move;}
  return candidates[candidates.length-1].move;
}
function bookPositionMatches(candidateFen,targetFen,bot){
  if(bot?.openingMatchMode!=='position') return candidateFen===targetFen;
  const positionKey=fen=>String(fen||'').trim().split(/\s+/).slice(0,4).join(' ');
  return positionKey(candidateFen)===positionKey(targetFen);
}
export function bookCandidates(c,bot,ChessCtor){
  const sideLines=c.turn()==='w'?(bot?.openingsAsWhite||[]):(bot?.openingsAsBlack||[]);
  const lines=[...sideLines,...(bot?.gambits||[])];
  const candidates=[];
  if(!lines.length) return candidates;
  const targetFen=c.fen();
  for(const line of lines){
    try{
      const text=String(line.moves||'').replace(/\d+\.(\.\.\.)?/g,' ').replace(/\s+/g,' ').trim();
      if(!text) continue;
      const tokens=text.split(' ').filter(Boolean);
      const probe=new ChessCtor();
      for(let i=0;i<tokens.length;i++){
        if(bookPositionMatches(probe.fen(),targetFen,bot)){
          const legal=probe.moves({verbose:true});
          const match=legal.find(m=>m.san===tokens[i]);
          if(match) candidates.push({move:match,weight:Number(line.games)});
          break;
        }
        const move=tokens[i];
        const applied=probe.move(move,{sloppy:true});
        if(!applied) break;
      }
    }catch{}
  }
  return candidates;
}
function minimax(c,depth,alpha,beta,maximizingWhite,ChessCtor){if(c.isCheckmate())return c.turn()==='w'?-100000-depth:100000+depth;if(c.isDraw())return 0;if(depth<=0)return evaluateMaterial(c,'w');const moves=orderMoves(c.moves({verbose:true}));if(maximizingWhite){let v=-Infinity;for(const m of moves){const cc=new ChessCtor(c.fen());cc.move(m);v=Math.max(v,minimax(cc,depth-1,alpha,beta,false,ChessCtor));alpha=Math.max(alpha,v);if(beta<=alpha)break;}return v;}let v=Infinity;for(const m of moves){const cc=new ChessCtor(c.fen());cc.move(m);v=Math.min(v,minimax(cc,depth-1,alpha,beta,true,ChessCtor));beta=Math.min(beta,v);if(beta<=alpha)break;}return v;}

// Time-pressure search (bot games with a clock). chooseBotMove above stays the untimed path.
// Without a deadline it runs the search with no clock but with a node budget: pass 1 (which draws the noise),
// then straight to the final depth, exactly chooseBotMove's work, so untimed play gives chooseBotMove's move,
// RNG use and cost (checked in scripts/check-bot-worker.mjs and scripts/check-bot-memory-guard.mjs).
// With a deadline it deepens 1..maxDepth and returns the best move of the last completed depth;
// depth 1 is never aborted. Pass 1 draws the root noise in chooseBotMove's order and later passes
// reuse it. Intermediate passes search the roots best-first (by the previous pass) to cut their
// cost; the final pass uses chooseBotMove's order, windows and tie-breaks, so a final depth that
// completes gives exactly chooseBotMove's move and RNG consumption.
import { botNow } from './bot-time.js';
const BOT_SEARCH_ABORT={aborted:true};
// Resource limits (per move, counted in search nodes below the root moves). When a limit is hit the
// current depth is abandoned exactly like a passed deadline and the last completed depth's move is
// played (depth 1 always completes). BOT_BOOK_LINE_CACHE_MAX bounds the replayed-line cache (oldest
// line evicted first; only memory changes, never the result). A real depth-4 search uses about 6-16k
// nodes at 1-3 ms each, so MAX_UNTIMED_NODES (200000, over 10x that) only stops a runaway search within
// minutes; when it does, the move is the depth-1 move (the untimed path has no intermediate depths).
export const MAX_TIMED_NODES=400000;
export const MAX_UNTIMED_NODES=200000;
export const BOT_BOOK_LINE_CACHE_MAX=2000;
type BotSearchOptions={deadlineAt?:number|null,now?:()=>number,maxNodes?:number};
export function chooseBotMoveTimed(c,bot,ChessCtor,options?:BotSearchOptions){
  const deadlineAt=options?.deadlineAt;
  if(typeof deadlineAt!=='number'||!Number.isFinite(deadlineAt)){
    const r=searchWithLimits(c,bot,ChessCtor,Infinity,()=>0,options?.maxNodes??MAX_UNTIMED_NODES);
    return r.nodeCapped?r:{move:r.move,depth:null,complete:true,nodes:r.nodes,nodeCapped:false};
  }
  return searchWithLimits(c,bot,ChessCtor,deadlineAt,options?.now||botNow,options?.maxNodes??MAX_TIMED_NODES);
}
function searchWithLimits(c,bot,ChessCtor,deadlineAt:number,now:()=>number,maxNodes:number){
  const moves=c.moves({verbose:true}); if(!moves.length)return {move:null,depth:0,complete:true,nodes:0,nodeCapped:false};
  const repertoire=preferredOpeningMoveTimed(c,bot,ChessCtor);
  if(repertoire && moves.some(m=>m.from===repertoire.from&&m.to===repertoire.to&&m.promotion===repertoire.promotion)) return {move:repertoire,depth:0,complete:true,nodes:0,nodeCapped:false};
  const elo=bot.elo||300;
  const botSide=c.turn();
  if(elo<=300 && Math.random()<0.22) return {move:moves[Math.floor(Math.random()*moves.length)],depth:0,complete:true,nodes:0,nodeCapped:false};
  const configuredDepth=elo>=2400?4:elo>=1700?3:elo>=700?2:1;
  const maxDepth=Math.max(1,Math.min(configuredDepth,Number(bot.searchDepthCap)||5));
  const noiseScale=elo>=2200?0.5:elo>=1600?2:elo>=700?12:28;
  orderMoves(moves);
  const roots=[];
  let best=moves[0], bestScore=-Infinity;
  for(const mv of moves){
    const cc=new ChessCtor(c.fen()); const applied=cc.move(mv); if(!applied)continue;
    if(cc.isCheckmate()) return {move:mv,depth:1,complete:true,nodes:0,nodeCapped:false};
    const styleBonus=evaluateBotStyleBonus(c,cc,applied,bot);
    const noise=(Math.random()*2-1)*noiseScale;
    const root={mv,cc,styleBonus,noise,total:-Infinity};
    roots.push(root);
    root.total=scoreRoot(root,0,bestScore,botSide,(cc,depth,alpha,beta)=>minimax(cc,depth,alpha,beta,cc.turn()==='w',ChessCtor));
    if(root.total>bestScore){bestScore=root.total;best=mv;}
  }
  let completedMove=best, completedDepth=1;
  const ctx={deadlineAt,now,maxNodes,nodes:0,capped:false};
  const search=(cc,depth,alpha,beta)=>minimaxTimed(cc,depth,alpha,beta,cc.turn()==='w',ChessCtor,ctx);
  const originalOrder=roots.map((_,i)=>i);
  const untimed=deadlineAt===Infinity; // no intermediate depths without a deadline: nothing to fall back on in time, and they cost 10-16% extra
  for(let depth=untimed?Math.max(2,maxDepth):2;depth<=maxDepth;depth++){
    if(now()>=deadlineAt) break;
    if(ctx.nodes>=maxNodes){ctx.capped=true;break;}
    const order=depth===maxDepth?originalOrder:[...originalOrder].sort((a,b)=>(roots[b].total-roots[a].total)||(a-b));
    try{
      best=moves[0]; bestScore=-Infinity;
      for(const i of order){
        if(now()>=deadlineAt) throw BOT_SEARCH_ABORT;
        const root=roots[i];
        root.total=scoreRoot(root,depth-1,bestScore,botSide,search);
        if(root.total>bestScore){bestScore=root.total;best=root.mv;}
      }
    }catch(error){
      if(error===BOT_SEARCH_ABORT) break;
      throw error;
    }
    completedMove=best; completedDepth=depth;
  }
  return {move:completedMove,depth:completedDepth,complete:completedDepth===maxDepth,nodes:ctx.nodes,nodeCapped:ctx.capped};
}
// One root move scored exactly as in chooseBotMove's loop.
function scoreRoot(root,depth,bestScore,botSide,search){
  const {cc,styleBonus,noise}=root;
  const searchAlpha=botSide==='w'?bestScore-styleBonus-noise:-Infinity;
  const searchBeta=botSide==='b'?styleBonus+noise-bestScore:Infinity;
  const whiteScore=search(cc,depth,searchAlpha,searchBeta);
  const perspectiveScore=botSide==='w'?whiteScore:-whiteScore;
  return perspectiveScore+styleBonus+noise;
}
// Same as minimax, plus a node cap and a deadline check every 32 nodes.
function minimaxTimed(c,depth,alpha,beta,maximizingWhite,ChessCtor,ctx){if(++ctx.nodes>ctx.maxNodes){ctx.capped=true;throw BOT_SEARCH_ABORT;}if((ctx.nodes&31)===0&&ctx.now()>=ctx.deadlineAt)throw BOT_SEARCH_ABORT;if(c.isCheckmate())return c.turn()==='w'?-100000-depth:100000+depth;if(c.isDraw())return 0;if(depth<=0)return evaluateMaterial(c,'w');const moves=orderMoves(c.moves({verbose:true}));if(maximizingWhite){let v=-Infinity;for(const m of moves){const cc=new ChessCtor(c.fen());cc.move(m);v=Math.max(v,minimaxTimed(cc,depth-1,alpha,beta,false,ChessCtor,ctx));alpha=Math.max(alpha,v);if(beta<=alpha)break;}return v;}let v=Infinity;for(const m of moves){const cc=new ChessCtor(c.fen());cc.move(m);v=Math.min(v,minimaxTimed(cc,depth-1,alpha,beta,true,ChessCtor,ctx));beta=Math.min(beta,v);if(beta<=alpha)break;}return v;}

// Same result as preferredOpeningMove, without replaying whole lines on every call (the replay costs
// hundreds of ms for large repertoires, which would not fit a small time budget). The probe position
// before token i always has ply i, so only index ply(target) can equal the target FEN; replayed FENs
// are cached per line text.
const BOOK_LINE_CACHE=new Map();
export function bookLineCacheSize(){return BOOK_LINE_CACHE.size;}
function bookLineState(line,ChessCtor){
  const key=String(line?.moves||'');
  let state=BOOK_LINE_CACHE.get(key);
  if(state) BOOK_LINE_CACHE.delete(key); // re-inserted below, so Map order is least recently used first
  if(!state||state.ChessCtor!==ChessCtor){
    const text=key.replace(/\d+\.(\.\.\.)?/g,' ').replace(/\s+/g,' ').trim();
    state={ChessCtor,tokens:text?text.split(' ').filter(Boolean):[],fens:[],probe:null,stopped:!text};
  }
  BOOK_LINE_CACHE.set(key,state);
  while(BOOK_LINE_CACHE.size>BOT_BOOK_LINE_CACHE_MAX) BOOK_LINE_CACHE.delete(BOOK_LINE_CACHE.keys().next().value);
  return state;
}
function bookLineFenAt(state,ply){
  while(state.fens.length<=ply&&!state.stopped){
    try{
      if(!state.probe) state.probe=new state.ChessCtor();
      const i=state.fens.length;
      if(i>0&&!state.probe.move(state.tokens[i-1],{sloppy:true})){state.stopped=true;break;}
      state.fens.push(state.probe.fen());
    }catch{state.stopped=true;}
  }
  return state.fens.length>ply?state.fens[ply]:null;
}
function bookLineMatchingPly(state,targetFen,bot,preferredPly){
  if(bot?.openingMatchMode!=='position'){
    if(!Number.isInteger(preferredPly)||preferredPly<0||preferredPly>=state.tokens.length) return -1;
    return bookLineFenAt(state,preferredPly)===targetFen?preferredPly:-1;
  }
  if(Number.isInteger(preferredPly)&&preferredPly>=0&&preferredPly<state.tokens.length){
    const preferredFen=bookLineFenAt(state,preferredPly);
    if(preferredFen&&bookPositionMatches(preferredFen,targetFen,bot)) return preferredPly;
  }
  // Pieces never come back along a line, and a pawn that left its start square (rank 2 / rank 7) never
  // returns, so once either rule rules a line out it cannot reach the target later.
  const pieceCount=fen=>(String(fen||'').split(' ')[0].match(/[a-zA-Z]/g)||[]).length;
  const homePawns=fen=>{const rows=String(fen||'').split(' ')[0].split('/');const expand=r=>String(r||'').replace(/\d/g,d=>'.'.repeat(Number(d)));return [expand(rows[6]).replace(/[^P]/g,'.'),expand(rows[1]).replace(/[^p]/g,'.')];};
  const targetPieces=pieceCount(targetFen);
  const [targetWhiteHome,targetBlackHome]=homePawns(targetFen);
  const lostHomePawn=(fen)=>{const [w,b]=homePawns(fen);for(let f=0;f<8;f++){if(targetWhiteHome[f]==='P'&&w[f]!=='P')return true;if(targetBlackHome[f]==='p'&&b[f]!=='p')return true;}return false;};
  for(let ply=0;ply<state.tokens.length;ply++){
    const fen=bookLineFenAt(state,ply);
    if(!fen) break;
    if(pieceCount(fen)<targetPieces||lostHomePawn(fen)) break;
    if(bookPositionMatches(fen,targetFen,bot)) return ply;
  }
  return -1;
}
function preferredOpeningMoveTimed(c,bot,ChessCtor){
  const sideLines=c.turn()==='w'?(bot?.openingsAsWhite||[]):(bot?.openingsAsBlack||[]);
  const lines=[...sideLines,...(bot?.gambits||[])];
  if(!lines.length) return null;
  const targetFen=c.fen();
  const fields=targetFen.split(' ');
  const preferredPly=(Number(fields[5])-1)*2+(fields[1]==='b'?1:0);
  if(!Number.isInteger(preferredPly)||preferredPly<0) return preferredOpeningMove(c,bot,ChessCtor);
  const candidates=[];
  for(const line of lines){
    try{
      const state=bookLineState(line,ChessCtor);
      const ply=bookLineMatchingPly(state,targetFen,bot,preferredPly);
      if(ply<0) continue;
      const probe=new ChessCtor();
      for(let i=0;i<ply;i++) probe.move(state.tokens[i],{sloppy:true});
      const match=probe.moves({verbose:true}).find(m=>m.san===state.tokens[ply]);
      if(match) candidates.push({move:match,weight:Number(line.games)});
    }catch{}
  }
  return pickBookCandidate(candidates);
}
