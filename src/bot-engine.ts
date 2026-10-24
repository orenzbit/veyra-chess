export function chooseBotMove(c,bot,ChessCtor){
  const moves=c.moves({verbose:true}); if(!moves.length)return null;
  const repertoire=preferredOpeningMove(c,bot,ChessCtor);
  if(repertoire && moves.some(m=>m.from===repertoire.from&&m.to===repertoire.to&&m.promotion===repertoire.promotion)) return repertoire;
  const elo=bot.elo||300;
  const botSide=c.turn();
  if(elo<=300 && Math.random()<0.22) return moves[Math.floor(Math.random()*moves.length)];
  const configuredDepth=Number(bot.searchDepth)||(elo>=2400?4:elo>=1700?3:elo>=700?2:1);
  const depth=Math.max(1,Math.min(5,configuredDepth,Number(bot.searchDepthCap)||5));
  const historicalProfile=Boolean(bot?.sourceFile); const quiescenceDepth=historicalProfile&&Number.isInteger(Number(bot.quiescenceDepthCap))?Math.max(0,Math.min(2,Number(bot.quiescenceDepthCap))):historicalProfile?2:0;
  const noiseScale=bot.searchDepth ? 0 : (elo>=2200?0.5:elo>=1600?2:elo>=700?12:28);
  orderMoves(moves);
  let best=moves[0], bestScore=-Infinity; const transpositionTable=historicalProfile ? new Map() : null;
  for(const mv of moves){
    const cc=new ChessCtor(c.fen()); const applied=cc.move(mv); if(!applied)continue;
    if(cc.isCheckmate()) return mv;
    const styleBonus=evaluateBotStyleBonus(c,cc,applied,bot);
    const noise=(Math.random()*2-1)*noiseScale;
    const searchAlpha=botSide==='w'?bestScore-styleBonus-noise:-Infinity;
    const searchBeta=botSide==='b'?styleBonus+noise-bestScore:Infinity;
    const whiteScore=minimax(cc,depth-1,searchAlpha,searchBeta,cc.turn()==='w',ChessCtor,transpositionTable,quiescenceDepth,historicalProfile);
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
function evaluateBotStyleBonus(before, after, move, bot) {
  const style = bot?.style || 'universal';
  const piece = before.get(move.from);
  const to = move.to || '';
  const center = ['c4', 'd4', 'e4', 'f4', 'c5', 'd5', 'e5', 'f5'].includes(to);
  const metrics = bot?.styleMetrics;
  const styleScale = metrics
    ? Math.max(0.85, Math.min(1.15, 0.9 + (Number(metrics.capturesPer100Moves) || 0) * 0.003 + (Number(metrics.checksPer100Moves) || 0) * 0.006))
    : 1;
  let bonus = 0;
  if (after.isCheckmate()) return 10000;
  if (after.isCheck()) bonus += (style === 'attacking' ? 24 : style === 'tactical' ? 18 : 6) * styleScale;
  if (move.captured) bonus += (style === 'tactical' ? 20 : style === 'attacking' ? 14 : style === 'positional' ? 4 : 8) * styleScale;
  if (center && style === 'positional') bonus += 12;
  if (piece && ['n', 'b'].includes(piece.type) && style === 'positional' && ['1', '2', '7', '8'].includes(move.from[1])) bonus += 8;
  if (move.san && move.san.includes('O-O')) bonus += style === 'defensive' ? 18 : style === 'positional' ? 12 : 4;
  if (style === 'endgame' && piece?.type === 'k' && center) bonus += 10;

  // Anand-only, deliberately small style preferences. Minimax still determines
  // chess quality; these weights only break close choices toward active
  // development, central options, king safety, and useful king activity.
  const profile = bot?.styleProfile;
  if (profile?.id === 'anand-dynamic-universal-v1') {
    const plyCount = before.history().length;
    const isOpening = plyCount < 20;
    const activeMinorTargets = ['c3', 'd3', 'e3', 'f3', 'c4', 'd4', 'e4', 'f4', 'c5', 'd5', 'e5', 'f5', 'c6', 'd6', 'e6', 'f6'];
    if (isOpening && piece && ['n', 'b'].includes(piece.type) && ['1', '2', '7', '8'].includes(move.from[1]) && activeMinorTargets.includes(to)) {
      bonus += Number(profile.openingDevelopmentBonus) || 0;
    }
    if (isOpening && piece?.type === 'p' && ['c4', 'd4', 'e4', 'f4'].includes(to)) {
      bonus += Number(profile.centralPawnBonus) || 0;
    }
    if (move.san && move.san.includes('O-O')) bonus += Number(profile.castlingSafetyBonus) || 0;
    const pieceCount = before.board().flat().filter(Boolean).length;
    if (piece?.type === 'k' && pieceCount <= 12 && center) {
      bonus += Number(profile.endgameKingActivityBonus) || 0;
    }
  }
  return bonus;
}
function evaluateMaterial(c,side,historicalProfile=true){
  const val={p:100,n:320,b:330,r:500,q:900,k:20000};
  const files='abcdefgh',squares=[];
  for(let rank=8;rank>=1;rank--)for(const file of files)squares.push(file+rank);
  if(!historicalProfile){let score=0;for(const square of squares){const piece=c.get(square);if(piece)score+=(piece.color===side?1:-1)*(val[piece.type]||0);}return score;}
  const pieces={w:[],b:[]},pawnFiles={w:Array(8).fill(0),b:Array(8).fill(0)};
  let score=0,nonPawnMaterial=0,bishops={w:0,b:0};
  const sign=color=>color===side?1:-1;
  const centerDistance=(file,rank)=>Math.abs(file-3.5)+Math.abs(rank-3.5);
  for(const square of squares){
    const p=c.get(square);if(!p)continue;
    const file=files.indexOf(square[0]),rank=Number(square[1])-1;
    const forward=p.color==='w'?rank:7-rank;
    const item={square,file,rank,forward,center:centerDistance(file,rank),type:p.type,color:p.color};
    pieces[p.color].push(item);
    score+=sign(p.color)*(val[p.type]||0);
    if(!['p','k'].includes(p.type))nonPawnMaterial+=val[p.type]||0;
    if(p.type==='p')pawnFiles[p.color][file]+=1;
    if(p.type==='b')bishops[p.color]+=1;
  }
  for(const color of ['w','b']){
    const enemy=color==='w'?'b':'w';
    for(const p of pieces[color]){
      let positional=0;
      if(p.type==='p'){
        positional+=p.forward*6+(3.5-Math.abs(p.file-3.5))*3;
        const blocked=pieces[enemy].some(x=>x.type==='p'&&Math.abs(x.file-p.file)<=1&&(color==='w'?x.rank>p.rank:x.rank<p.rank));
        if(!blocked)positional+=p.forward*p.forward*1.5+8;
      }else if(p.type==='n')positional+=28-p.center*7;
      else if(p.type==='b')positional+=16-p.center*3;
      else if(p.type==='r'){
        if(p.rank===(color==='w'?6:1))positional+=14;
        const ownPawns=pawnFiles[color][p.file];
        const enemyPawnsOnFile=pawnFiles[enemy][p.file];
        if(!ownPawns&&!enemyPawnsOnFile)positional+=12;
        else if(!ownPawns)positional+=6;
      }else if(p.type==='q')positional+=8-p.center*1.5;
      score+=sign(color)*positional;
    }
    for(let file=0;file<8;file++){
      const count=pawnFiles[color][file];
      if(count>1)score+=sign(color)*(-12*(count-1));
      const leftPawns=file>0?pawnFiles[color][file-1]:0;
      const rightPawns=file<7?pawnFiles[color][file+1]:0;
      if(count>0&&leftPawns===0&&rightPawns===0)score+=sign(color)*(-10*count);
    }
    if(bishops[color]>=2)score+=sign(color)*24;
    const king=pieces[color].find(p=>p.type==='k');
    if(king){
      if(nonPawnMaterial>2600){
        const direction=color==='w'?1:-1;
        const shield=pieces[color].filter(p=>p.type==='p'&&Math.abs(p.file-king.file)<=1&&p.rank===king.rank+direction).length;
        score+=sign(color)*(shield*9-Math.max(0,king.center-2)*5);
      }else{
        score+=sign(color)*(16-king.center)*3;
      }
    }
  }
  if(c.turn()===side)score+=8;
  return score;
}
export function preferredOpeningMove(c,bot,ChessCtor){
  const sideLines=c.turn()==='w'?(bot?.openingsAsWhite||[]):(bot?.openingsAsBlack||[]);
  const lines=[...sideLines,...(bot?.gambits||[])];
  if(!lines.length) return null;
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
function minimax(c,depth,alpha,beta,maximizingWhite,ChessCtor,table,quiescenceDepth=2,historicalProfile=true){
  if(c.isCheckmate())return c.turn()==='w'?-100000-depth:100000+depth;
  if(c.isDraw())return 0;
  if(depth<=0)return historicalProfile?quiescence(c,alpha,beta,maximizingWhite,ChessCtor,quiescenceDepth):evaluateMaterial(c,'w',false);
  const alphaOriginal=alpha,betaOriginal=beta;
  const key=c.fen().split(' ').slice(0,5).join(' ')+'|'+depth+'|'+(maximizingWhite?'max':'min');
  const cached=table?.get(key);
  if(cached){
    if(cached.bound==='exact')return cached.score;
    if(cached.bound==='lower')alpha=Math.max(alpha,cached.score);
    else if(cached.bound==='upper')beta=Math.min(beta,cached.score);
    if(alpha>=beta)return cached.score;
  }
  const moves=orderMoves(c.moves({verbose:true}));
  let value;
  if(maximizingWhite){
    value=-Infinity;
    for(const m of moves){
      const cc=new ChessCtor(c.fen());cc.move(m);
      value=Math.max(value,minimax(cc,depth-1,alpha,beta,false,ChessCtor,table,quiescenceDepth,historicalProfile));
      alpha=Math.max(alpha,value);
      if(beta<=alpha)break;
    }
  }else{
    value=Infinity;
    for(const m of moves){
      const cc=new ChessCtor(c.fen());cc.move(m);
      value=Math.min(value,minimax(cc,depth-1,alpha,beta,true,ChessCtor,table,quiescenceDepth,historicalProfile));
      beta=Math.min(beta,value);
      if(beta<=alpha)break;
    }
  }
  const bound=value<=alphaOriginal?'upper':value>=betaOriginal?'lower':'exact';
  if(table)table.set(key,{score:value,bound});
  return value;
}
function quiescence(c,alpha,beta,maximizingWhite,ChessCtor,remaining){
  if(c.isCheckmate())return c.turn()==='w'?-100000:100000;
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
