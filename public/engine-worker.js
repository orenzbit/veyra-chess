importScripts('/vendor/wasm-engine.js');
let engine=null;
(async()=>{try{const buf=await fetch('/vendor/chessy-ai-fast.wasm').then(r=>r.arrayBuffer());engine=await WasmEngine.load(buf);postMessage('ready');}catch(e){postMessage({type:'boot-error',error:String(e)});}})();
function sqName(i){return 'abcdefgh'[i%8]+(8-Math.floor(i/8));}
function toUci(m){return m?sqName(m.from)+sqName(m.to)+(m.promotion?m.promotion.toLowerCase():''):null;}
function mateChance(m){ if(m==null)return null; return m>0?1:0; }
function cpToWin(cp){return 50+50*(2/(1+Math.exp(-0.00368208*cp))-1)}
self.onmessage=async(e)=>{const {id,fen,afterFen,mover}=e.data||{}; if(!engine){postMessage({id,error:'Engine not ready'});return;} try{
  const best=engine.search(fen,{maxDepth:14,nodeLimit:100000,timeMs:0,quiesce:true});
  if(!afterFen) throw new Error('Missing legal after-position');
  const after=engine.search(afterFen,{maxDepth:14,nodeLimit:100000,timeMs:0,quiesce:true});
  // search() returns scores with scorePov='white' in the WASM adapter; use the
  // same explicit score contract on both positions rather than an unverified evaluate() perspective.
  const beforeScore=best.score;
  const afterScore=after.score;
  const bestUci=toUci(best.move); const afterBestUci=toUci(after.move); const playedUci=mover.from+mover.to+(mover.promotion||'');
  const bestWin=cpToWin(best.score); const beforeWin=cpToWin(beforeScore); const afterWin=cpToWin(afterScore);
  const moverPovBest=(fen.split(' ')[1]==='w')?bestWin:100-bestWin;
  const moverPovBefore=(fen.split(' ')[1]==='w')?beforeWin:100-beforeWin;
  const moverPovAfter=(fen.split(' ')[1]==='w')?afterWin:100-afterWin;
  const drop=Math.max(0,(moverPovBest-moverPovAfter)/100);
  const classification=bestUci===playedUci?'best':drop<.02?'excellent':drop<.05?'good':drop<.10?'inaccuracy':drop<.25?'mistake':'blunder';
  postMessage({id,result:{bestUci,whiteChanceBefore:beforeWin,whiteChanceAfter:afterWin,whiteChanceBest:bestWin,afterBestUci,drop,classification,depth:best.depth,explanation:classification==='best'?'מהלך מדויק מאוד.':classification==='blunder'?'המהלך איבד יתרון משמעותי.':classification==='mistake'?'המהלך החליש את העמדה.':'המהלך סביר, אבל יש אפשרות טובה יותר.'}});
 }catch(err){postMessage({id,error:String(err)});}};
