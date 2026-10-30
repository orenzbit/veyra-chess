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
export function bookCandidates(c,bot,ChessCtor){
  const sideLines=c.turn()==='w'?(bot?.openingsAsWhite||[]):(bot?.openingsAsBlack||[]);
  const lines=[...sideLines,...(bot?.gambits||[])];
  const candidates=[];
  if(!lines.length) return candidates;
  const targetFen=c.fen();
  const targetPosition=targetFen.split(' ').slice(0,4).join(' ');
  for(const line of lines){
    try{
      const text=String(line.moves||'').replace(/\d+\.(\.\.\.)?/g,' ').replace(/\s+/g,' ').trim();
      if(!text) continue;
      const tokens=text.split(' ').filter(Boolean);
      const probe=new ChessCtor();
      for(let i=0;i<tokens.length;i++){
        const probeFen=probe.fen();
        const samePosition=bot?.openingMatchMode==='position'
          ? probeFen.split(' ').slice(0,4).join(' ')===targetPosition
          : probeFen===targetFen;
        if(samePosition){
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
// Without a deadline this delegates to chooseBotMove, so untimed play is unchanged.
// With a deadline it deepens 1..maxDepth and returns the best move of the last completed depth;
// depth 1 is never aborted. Pass 1 draws the root noise in chooseBotMove's order and later passes
// reuse it. Intermediate passes search the roots best-first (by the previous pass) to cut their
// cost; the final pass uses chooseBotMove's order, windows and tie-breaks, so a final depth that
// completes gives exactly chooseBotMove's move and RNG consumption.
import { botNow } from './bot-time.js';
const BOT_SEARCH_ABORT={aborted:true};
export function chooseBotMoveTimed(c,bot,ChessCtor,options?:{deadlineAt?:number|null,now?:()=>number}){
  const deadlineAt=options?.deadlineAt;
  if(typeof deadlineAt!=='number'||!Number.isFinite(deadlineAt)) return {move:chooseBotMove(c,bot,ChessCtor),depth:null,complete:true};
  const now=options?.now||botNow;
  const moves=c.moves({verbose:true}); if(!moves.length)return {move:null,depth:0,complete:true};
  const repertoire=preferredOpeningMoveTimed(c,bot,ChessCtor);
  if(repertoire && moves.some(m=>m.from===repertoire.from&&m.to===repertoire.to&&m.promotion===repertoire.promotion)) return {move:repertoire,depth:0,complete:true};
  const elo=bot.elo||300;
  const botSide=c.turn();
  if(elo<=300 && Math.random()<0.22) return {move:moves[Math.floor(Math.random()*moves.length)],depth:0,complete:true};
  const configuredDepth=elo>=2400?4:elo>=1700?3:elo>=700?2:1;
  const maxDepth=Math.max(1,Math.min(configuredDepth,Number(bot.searchDepthCap)||5));
  const noiseScale=elo>=2200?0.5:elo>=1600?2:elo>=700?12:28;
  orderMoves(moves);
  const roots=[];
  let best=moves[0], bestScore=-Infinity;
  for(const mv of moves){
    const cc=new ChessCtor(c.fen()); const applied=cc.move(mv); if(!applied)continue;
    if(cc.isCheckmate()) return {move:mv,depth:1,complete:true};
    const styleBonus=evaluateBotStyleBonus(c,cc,applied,bot);
    const noise=(Math.random()*2-1)*noiseScale;
    const root={mv,cc,styleBonus,noise,total:-Infinity};
    roots.push(root);
    root.total=scoreRoot(root,0,bestScore,botSide,(cc,depth,alpha,beta)=>minimax(cc,depth,alpha,beta,cc.turn()==='w',ChessCtor));
    if(root.total>bestScore){bestScore=root.total;best=mv;}
  }
  let completedMove=best, completedDepth=1;
  const ctx={deadlineAt,now,nodes:0};
  const search=(cc,depth,alpha,beta)=>minimaxTimed(cc,depth,alpha,beta,cc.turn()==='w',ChessCtor,ctx);
  const originalOrder=roots.map((_,i)=>i);
  for(let depth=2;depth<=maxDepth;depth++){
    if(now()>=deadlineAt) break;
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
  return {move:completedMove,depth:completedDepth,complete:completedDepth===maxDepth};
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
// Same as minimax, plus a deadline check every 32 nodes.
function minimaxTimed(c,depth,alpha,beta,maximizingWhite,ChessCtor,ctx){if((++ctx.nodes&31)===0&&ctx.now()>=ctx.deadlineAt)throw BOT_SEARCH_ABORT;if(c.isCheckmate())return c.turn()==='w'?-100000-depth:100000+depth;if(c.isDraw())return 0;if(depth<=0)return evaluateMaterial(c,'w');const moves=orderMoves(c.moves({verbose:true}));if(maximizingWhite){let v=-Infinity;for(const m of moves){const cc=new ChessCtor(c.fen());cc.move(m);v=Math.max(v,minimaxTimed(cc,depth-1,alpha,beta,false,ChessCtor,ctx));alpha=Math.max(alpha,v);if(beta<=alpha)break;}return v;}let v=Infinity;for(const m of moves){const cc=new ChessCtor(c.fen());cc.move(m);v=Math.min(v,minimaxTimed(cc,depth-1,alpha,beta,true,ChessCtor,ctx));beta=Math.min(beta,v);if(beta<=alpha)break;}return v;}

// Same result as preferredOpeningMove, without replaying whole lines on every call (the replay costs
// hundreds of ms for large repertoires, which would not fit a small time budget). The probe position
// before token i always has ply i, so only index ply(target) can equal the target FEN; replayed FENs
// are cached per line text.
const BOOK_LINE_CACHE=new Map();
function bookLineState(line,ChessCtor){
  const key=String(line?.moves||'');
  let state=BOOK_LINE_CACHE.get(key);
  if(!state||state.ChessCtor!==ChessCtor){
    const text=key.replace(/\d+\.(\.\.\.)?/g,' ').replace(/\s+/g,' ').trim();
    state={ChessCtor,tokens:text?text.split(' ').filter(Boolean):[],fens:[],probe:null,stopped:!text};
    BOOK_LINE_CACHE.set(key,state);
  }
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
function preferredOpeningMoveTimed(c,bot,ChessCtor){
  const sideLines=c.turn()==='w'?(bot?.openingsAsWhite||[]):(bot?.openingsAsBlack||[]);
  const lines=[...sideLines,...(bot?.gambits||[])];
  if(!lines.length) return null;
  const targetFen=c.fen();
  const fields=targetFen.split(' ');
  const ply=(Number(fields[5])-1)*2+(fields[1]==='b'?1:0);
  if(!Number.isInteger(ply)||ply<0||bot?.openingMatchMode==='position') return preferredOpeningMove(c,bot,ChessCtor); // position-matching bots ignore move counters, so the cached ply shortcut does not apply
  const candidates=[];
  for(const line of lines){
    try{
      const state=bookLineState(line,ChessCtor);
      if(ply>=state.tokens.length||bookLineFenAt(state,ply)!==targetFen) continue;
      const probe=new ChessCtor();
      for(let i=0;i<ply;i++) probe.move(state.tokens[i],{sloppy:true});
      const match=probe.moves({verbose:true}).find(m=>m.san===state.tokens[ply]);
      if(match) candidates.push({move:match,weight:Number(line.games)});
    }catch{}
  }
  return pickBookCandidate(candidates);
}
