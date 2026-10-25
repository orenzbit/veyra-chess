importScripts('/vendor/wasm-engine.js');
let engine=null;
(async()=>{try{const buf=await fetch('/vendor/chessy-ai-fast.wasm').then(r=>r.arrayBuffer());engine=await WasmEngine.load(buf);postMessage('ready');}catch(e){postMessage({type:'boot-error',error:String(e)});}})();
function sqName(i){return 'abcdefgh'[i%8]+(8-Math.floor(i/8));}
function toUci(m){return m?sqName(m.from)+sqName(m.to)+(m.promotion?m.promotion.toLowerCase():''):null;}
function mateChance(m){ if(m==null)return null; return m>0?1:0; }
function cpToWin(cp){
  if(cp>=90000) return 100;
  if(cp<=-90000) return 0;
  return 50+50*(2/(1+Math.exp(-0.00368208*cp))-1);
}
self.onmessage=async(e)=>{const {id,fen,afterFen,mover,cachedBefore}=e.data||{}; if(!engine){postMessage({id,error:'Engine not ready'});return;} try{
  // cachedBefore is this exact position's search from the previous move's after-search (same FEN and limits), so it is reused instead of searched again.
  const best=(cachedBefore&&cachedBefore.fen===fen&&Number.isFinite(cachedBefore.score))?{score:cachedBefore.score,depth:cachedBefore.depth,cachedUci:cachedBefore.bestUci}:engine.search(fen,{maxDepth:16,nodeLimit:250000,timeMs:0,quiesce:true});
  if(!afterFen) throw new Error('Missing legal after-position');
  const after=engine.search(afterFen,{maxDepth:16,nodeLimit:250000,timeMs:0,quiesce:true});
  const beforeScore=best.score;
  const afterScore=after.score;
  const bestUci=best.cachedUci!==undefined?best.cachedUci:toUci(best.move); const afterBestUci=toUci(after.move); const playedUci=mover.from+mover.to+(mover.promotion||'');
  const bestWin=cpToWin(best.score); const beforeWin=cpToWin(beforeScore); const afterWin=cpToWin(afterScore);
  const moverTurn=fen.split(' ')[1]==='w'?'w':'b';
  const moverPovBest=(moverTurn==='w')?bestWin:100-bestWin;
  const moverPovBefore=(moverTurn==='w')?beforeWin:100-beforeWin;
  const moverPovAfter=(moverTurn==='w')?afterWin:100-afterWin;
  const isMateMove=(afterScore>=90000 && moverTurn==='w') || (afterScore<=-90000 && moverTurn==='b');
  const drop=(bestUci===playedUci || isMateMove || moverPovAfter>=99.9)?0:Math.max(0,(moverPovBest-moverPovAfter)/100);
  const classification=bestUci===playedUci?'best':drop<.02?'excellent':drop<.05?'good':drop<.10?'inaccuracy':drop<.25?'mistake':'blunder';
  postMessage({id,result:{bestUci,whiteChanceBefore:beforeWin,whiteChanceAfter:afterWin,whiteChanceBest:bestWin,afterBestUci,afterScore,afterDepth:after.depth,drop,classification,depth:best.depth,isMateMove,explanation:classification==='best'?'מהלך מדויק מאוד.':classification==='blunder'?'המהלך איבד יתרון משמעותי.':classification==='mistake'?'המהלך החליש את העמדה.':'המהלך סביר, אבל יש אפשרות טובה יותר.'}});
 }catch(err){postMessage({id,error:String(err)});}};
