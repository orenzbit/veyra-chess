export function chooseBotMove(c,bot,ChessCtor){
  const moves=c.moves({verbose:true}); if(!moves.length)return null;
  const repertoire=preferredOpeningMove(c,bot,ChessCtor);
  if(repertoire && moves.some(m=>m.from===repertoire.from&&m.to===repertoire.to&&m.promotion===repertoire.promotion)) return repertoire;
  const elo=bot.elo||300;
  const botSide=c.turn();
  if(elo<=300 && Math.random()<0.22) return moves[Math.floor(Math.random()*moves.length)];
  const depth=Math.max(1,Math.min(5,Number(bot.searchDepth)|| (elo>=2400?4:elo>=1700?3:elo>=700?2:1)));
  const noiseScale=bot.searchDepth ? 0 : (elo>=2200?0.5:elo>=1600?2:elo>=700?12:28);
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
function evaluateBotStyleBonus(before,after,move,bot){const style=bot?.style||'universal';const piece=before.get(move.from);const to=move.to||'';const center=['c4','d4','e4','f4','c5','d5','e5','f5'].includes(to);const metrics=bot?.styleMetrics;const styleScale=metrics?Math.max(0.85,Math.min(1.15,0.9+(Number(metrics.capturesPer100Moves)||0)*0.003+(Number(metrics.checksPer100Moves)||0)*0.006)):1;let bonus=0;if(after.isCheckmate())return 10000;if(after.isCheck())bonus+=(style==='attacking'?24:style==='tactical'?18:6)*styleScale;if(move.captured)bonus+=(style==='tactical'?20:style==='attacking'?14:style==='positional'?4:8)*styleScale;if(center&&style==='positional')bonus+=12;if(piece&&['n','b'].includes(piece.type)&&style==='positional'&&['1','2','7','8'].includes(move.from[1]))bonus+=8;if(move.san&&move.san.includes('O-O'))bonus+=style==='defensive'?18:style==='positional'?12:4;if(style==='endgame'&&piece?.type==='k'&&center)bonus+=10;return bonus;}
function evaluateMaterial(c,side){const val={p:100,n:320,b:330,r:500,q:900,k:20000}; const squares=['a8','b8','c8','d8','e8','f8','g8','h8','a7','b7','c7','d7','e7','f7','g7','h7','a6','b6','c6','d6','e6','f6','g6','h6','a5','b5','c5','d5','e5','f5','g5','h5','a4','b4','c4','d4','e4','f4','g4','h4','a3','b3','c3','d3','e3','f3','g3','h3','a2','b2','c2','d2','e2','f2','g2','h2','a1','b1','c1','d1','e1','f1','g1','h1']; let score=0; for(const s of squares){const p=c.get(s); if(!p)continue; score += (p.color===side?1:-1)*(val[p.type]||0);} return score;}
function preferredOpeningMove(c,bot,ChessCtor){
  const sideLines=c.turn()==='w'?(bot?.openingsAsWhite||[]):(bot?.openingsAsBlack||[]);
  const lines=[...sideLines,...(bot?.gambits||[])];
  if(!lines.length) return null;
  const targetFen=c.fen();
  for(const line of lines){
    try{
      const text=String(line.moves||'').replace(/\d+\.(\.\.\.)?/g,' ').replace(/\s+/g,' ').trim();
      if(!text) continue;
      const tokens=text.split(' ').filter(Boolean);
      const probe=new ChessCtor();
      for(let i=0;i<tokens.length;i++){
        if(probe.fen()===targetFen){
          const legal=probe.moves({verbose:true});
          const match=legal.find(m=>m.san===tokens[i]);
          if(match) return match;
          break;
        }
        const move=tokens[i];
        const applied=probe.move(move,{sloppy:true});
        if(!applied) break;
      }
    }catch{}
  }
  return null;
}
function minimax(c,depth,alpha,beta,maximizingWhite,ChessCtor){
  if(c.isCheckmate())return c.turn()==='w'?-100000-depth:100000+depth;
  if(c.isDraw())return 0;
  if(depth<=0)return quiescence(c,alpha,beta,maximizingWhite,ChessCtor,2);
  const moves=orderMoves(c.moves({verbose:true}));
  if(maximizingWhite){
    let v=-Infinity;
    for(const m of moves){const cc=new ChessCtor(c.fen());cc.move(m);v=Math.max(v,minimax(cc,depth-1,alpha,beta,false,ChessCtor));alpha=Math.max(alpha,v);if(beta<=alpha)break;}
    return v;
  }
  let v=Infinity;
  for(const m of moves){const cc=new ChessCtor(c.fen());cc.move(m);v=Math.min(v,minimax(cc,depth-1,alpha,beta,true,ChessCtor));beta=Math.min(beta,v);if(beta<=alpha)break;}
  return v;
}
function quiescence(c,alpha,beta,maximizingWhite,ChessCtor,remaining){
  const standPat=evaluateMaterial(c,'w');
  if(c.isDraw()||remaining<=0)return standPat;
  if(!c.isCheck()){
    if(maximizingWhite){if(standPat>=beta)return standPat;alpha=Math.max(alpha,standPat);}
    else{if(standPat<=alpha)return standPat;beta=Math.min(beta,standPat);}
  }
  const allMoves=orderMoves(c.moves({verbose:true}));
  const tactical= c.isCheck() ? allMoves : allMoves.filter(m=>m.captured||m.promotion||String(m.san||'').includes('+')||String(m.san||'').includes('#'));
  if(!tactical.length)return standPat;
  let value=maximizingWhite?-Infinity:Infinity;
  for(const m of tactical){
    const next=new ChessCtor(c.fen());
    if(!next.move(m))continue;
    const score=quiescence(next,alpha,beta,!maximizingWhite,ChessCtor,remaining-1);
    if(maximizingWhite){value=Math.max(value,score);alpha=Math.max(alpha,value);}
    else{value=Math.min(value,score);beta=Math.min(beta,value);}
    if(beta<=alpha)break;
  }
  return value===-Infinity||value===Infinity?standPat:value;
}
