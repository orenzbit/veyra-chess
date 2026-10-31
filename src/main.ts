import { chooseBotMoveAsync as chooseBotMove, cancelBotMove, botMoveOnPage } from './bot-worker-client.js';
import { botBudgetMs, botThinkingDelayMs, botNow } from './bot-time.js';
import { getLang, setLang, toggleLang, installDomTranslator, TERMS_VERSION, PRIVACY_VERSION, EFFECTIVE_DATE } from './i18n.js';
import { fetchArchiveGames, DEMO_ARCHIVE_GAME } from './game-archive.js';
import { analyzeGameMoves, ReviewAnalysisError, computeReviewSummary } from './review-metrics.js';
import { mergeAccountState } from './account-sync.js';
import { buildDnaReport, DNA_ENGINE_VERSION, DNA_ANALYSIS_SCHEMA_VERSION, normalizePgnForDnaFingerprint, selectLatestDnaGames } from './chess-dna.js';
import { buildDnaStatisticsOverview } from './dna-statistics.js';
import { ChessClockPage } from './chess-clock.js';
import { PuzzlesPage } from './puzzle-page.js';
import { BlindfoldTrainingPage } from './blindfold-page.js';
import { LegendsPage } from './legends-page.js';
import { quizMoveMatches } from './opening-quiz.js';
import { coreLines } from './opening-core.mjs';
import { createOpeningStreakClient, type OpeningStreakUpdate } from './opening-streak.js';
import { DailyStreakPage } from './daily-streak-page.js';
import { HomePage, type HomeBoardFactory, type HomeDestination } from './home-page.js';
import { timelineMark } from './timeline-marks.js';
const Chess = (window as any).ChessLib.Chess;
const Chessboard = (window as any).ChessBoardLib.Chessboard;
const COLOR = (window as any).ChessBoardLib.COLOR;
const BORDER_TYPE = (window as any).ChessBoardLib.BORDER_TYPE;

const h = React.createElement;
const {useEffect,useRef,useState} = React;

const CLASS_VIS = {
  brilliant:{label:'Brilliant',symbol:'!!',bg:'#00D4AA',icon:'/classification-icons/brilliant.svg'},
  great:{label:'Great Move',symbol:'!',bg:'#4CACEB',icon:'/classification-icons/great_find.svg'},
  book:{label:'Book',symbol:'▥',bg:'#B8956E',icon:'/classification-icons/book.svg'},
  best:{label:'Best Move',symbol:'✓',bg:'#3AAA55',icon:'/classification-icons/best_v2.svg'},
  excellent:{label:'Excellent',symbol:'★',bg:'#6BBF3E',icon:'/classification-icons/excellent.svg'},
  good:{label:'Good',symbol:'👍',bg:'#57A055',icon:'/classification-icons/good.svg'},
  inaccuracy:{label:'Inaccuracy',symbol:'?!',bg:'#F1C40F',icon:'/classification-icons/inaccuracy.svg'},
  mistake:{label:'Mistake',symbol:'?',bg:'#E67E22',icon:'/classification-icons/mistake.svg'},
  blunder:{label:'Blunder',symbol:'??',bg:'#D02030',icon:'/classification-icons/blunder.svg'},
  miss:{label:'Miss',symbol:'X',bg:'#FF5252',icon:'/classification-icons/missed_win.svg'},
  forced:{label:'Forced',symbol:'→',bg:'transparent',icon:null}
};

const BOT_MANIFEST_URL = '/data/bots/index.json';
const SUPPORT_EMAIL = 'orennzb@gmail.com';
const BOT_PROGRESS_KEY = 'tabia_bot_unlocked_index';
const ADAPTIVE_OPT_IN_KEY = 'tabia_adaptive_opt_in';
const ACCOUNT_SYNC_OWNER_KEY = 'veyra_sync_owner_v1';

async function postJson(url, body) {
  try { const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify(body)}); const data=await r.json().catch(()=>({})); return {ok:r.ok,status:r.status,data}; }
  catch(error){ return {ok:false,status:0,data:{error:String(error?.message||error)}}; }
}
async function getJson(url) {
  try { const r=await fetch(url,{credentials:'same-origin',cache:'no-store'}); const data=await r.json().catch(()=>({})); return {ok:r.ok,status:r.status,data}; }
  catch(error){ return {ok:false,status:0,data:{error:String(error?.message||error)}}; }
}
async function dnaRequest(url: string,options: {method?: string; timeoutMs?: number; body?: unknown} = {}){
  const controller=new AbortController();
  const timeoutMs=Math.max(1000,Math.min(60000,Number(options.timeoutMs)||20000));
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const method=options.method||'GET';
    const response=await fetch(url,{
      method,credentials:'same-origin',cache:'no-store',signal:controller.signal,
      headers:method==='GET'?undefined:{'content-type':'application/json'},
      body:method==='GET'?undefined:JSON.stringify(options.body||{}),
    });
    const data=await response.json().catch(()=>({}));
    return {ok:response.ok,status:response.status,data};
  }catch(error){
    return {ok:false,status:0,data:{error:controller.signal.aborted?'בקשת DNA חרגה ממגבלת הזמן. אפשר לנסות שוב.':String(error?.message||error)}};
  }finally{clearTimeout(timer);}
}
function getBotUnlockedIndex(){const raw=Number(localStorage.getItem(BOT_PROGRESS_KEY));return Number.isFinite(raw)?Math.max(0,Math.min(49,Math.floor(raw))):0;}
function setBotUnlockedIndex(v){const n=Math.max(0,Math.min(49,Math.floor(v)));localStorage.setItem(BOT_PROGRESS_KEY,String(n));try{const p=JSON.parse(localStorage.getItem('veyra_progress_v1')||'{}');p.bot=Math.max(Number(p.bot)||0,n);localStorage.setItem('veyra_progress_v1',JSON.stringify(p));}catch{}}
function isAdaptiveOptedIn(){return localStorage.getItem(ADAPTIVE_OPT_IN_KEY)==='1';}
function setAdaptiveOptIn(v){localStorage.setItem(ADAPTIVE_OPT_IN_KEY,v?'1':'0');}
async function telemetry(type,payload={}){if(!isAdaptiveOptedIn())return;await postJson('/api/telemetry',{type,payload});}
async function adaptiveSignal(signal){if(!isAdaptiveOptedIn())return;await postJson('/api/adaptive',signal);}

function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function sideName(c){return c==='w'?'לבן':'שחור';}
function normalizeBotList(list){return list.map(bot=>({...bot,id:bot.id||bot.slug,slug:bot.slug||bot.id,quips:Array.isArray(bot.quips)?bot.quips:[]}));}
function botStageLabel(tier){return ['מתחיל','מתקדם','מומחה','רב־אמן'][Math.max(0,Math.min(3,Number(tier)||0))];}
function chooseBotQuip(bot,game,move){const archive=bot?.phraseArchive||{};const board=typeof game?.board==='function'?game.board():[];const pieces=Array.isArray(board)?board.flat().filter(Boolean).length:32;const category=game.isCheckmate()||game.isCheck()?'threat':move?.captured?'tactics':game.history().length<16?'opening':pieces<=12?'endgame':'general';const archived=Array.isArray(archive[category])?archive[category]:[];const lines=archived.length?archived:(Array.isArray(bot?.quips)?bot.quips:[]);if(!lines.length)return bot?.flavor||'';const index=game.isCheckmate()?2:game.isCheck()?1:move?.captured?0:game.history().length%lines.length;const selected=lines[index%lines.length];return typeof selected==='string'?selected:(selected?.text||bot?.flavor||'');}


function gameFromPgn(pgn){ const c=new Chess(); const ok=c.loadPgn(pgn,{sloppy:true}); if(!ok && !c.history().length) throw new Error('PGN לא נטען'); return c; }
function makeBoardState(pgn){ const c=new Chess(); c.loadPgn(pgn,{sloppy:true}); const hist=c.history({verbose:true}); return {hist,c}; }
function extractClockTags(pgn){return Array.from(String(pgn||'').matchAll(/\[%clk\s+([^\]]+)\]/g),m=>String(m[1]||'').trim());}
function dnaClockSeconds(value){
 const text=String(value||'').trim();if(!text)return null;
 const parts=text.split(':');if(parts.length<2||parts.length>3||parts.some(part=>!/^\d+(?:\.\d+)?$/.test(part)))return null;
 const numbers=parts.map(Number);if(numbers.some(number=>!Number.isFinite(number)||number<0)||numbers.slice(1).some(number=>number>=60))return null;
 return parts.length===3?numbers[0]*3600+numbers[1]*60+numbers[2]:numbers[0]*60+numbers[1];
}
function positionAfterPly(history,index){ const c=new Chess(); const end=Math.min(history.length,index+1); for(let i=0;i<end;i++) c.move({from:history[i].from,to:history[i].to,promotion:history[i].promotion||undefined}); return c; }


function ProductBrand({section='Veyra Chess'}){
  return h('div',{className:'brand product-brand'},
    h('span',{className:'product-brand-name'},'OREN AND CLAUDE'),
    h('span',{className:'product-brand-divider','aria-hidden':true},'·'),
    h('span',{className:'product-brand-section'},section)
  );
}

const createHomeBoard: HomeBoardFactory = (element, position) => new Chessboard(element, {
  position, orientation: COLOR.white, responsive: true, assetsUrl: '/vendor/cm-chessboard/',
  style: { borderType: BORDER_TYPE.none, cssClass: 'default', pieces: { file: 'pieces/standard.svg' }, animationDuration: 0 },
});

function BotGame({bot,botIndex,sideChoice,minutes,onReview,onBack,onGameFinished}){
  const [game,setGame]=useState(()=>new Chess());
  const [playerSide]=useState(()=>sideChoice==='random'?(Math.random()<0.5?'white':'black'):sideChoice);
  const [selected,setSelected]=useState(null);
  const [result,setResult]=useState(null);
  const [thinking,setThinking]=useState(false);
  const [quip,setQuip]=useState(()=>bot?.quips?.[0]||bot?.flavor||'');
  const [whiteMs,setWhiteMs]=useState(minutes*60000);
  const [blackMs,setBlackMs]=useState(minutes*60000);
  const boardRef=useRef(null); const boardObj=useRef(null); const timer=useRef(null); const botTimer=useRef(null);
  const gameRef=useRef(game); const resultRef=useRef(result); const thinkingRef=useRef(thinking);
  useEffect(()=>{gameRef.current=game;},[game]);
  resultRef.current=result;
  useEffect(()=>{thinkingRef.current=thinking;},[thinking]);
  const botColor=playerSide==='white'?'b':'w';

  useEffect(()=>{
    const b=new Chessboard(boardRef.current,{position:game.fen(),orientation:playerSide==='white'?COLOR.white:COLOR.black,responsive:true,assetsUrl:'/vendor/cm-chessboard/',style:{borderType:BORDER_TYPE.none,cssClass:'default',pieces:{file:'pieces/standard.svg'},animationDuration:280}});
    boardObj.current=b;
    const input=(ev)=>{
      const currentGame=gameRef.current;
      if(resultRef.current||thinkingRef.current)return false;
      if(ev.type==='moveInputStarted') return currentGame.turn()===(playerSide==='white'?'w':'b');
      if(ev.type==='validateMoveInput'){
        try{const c=new Chess(currentGame.fen()); const mv=c.move({from:ev.squareFrom,to:ev.squareTo,promotion:ev.promotion||undefined}); if(!mv)return false; setGame(c); return true;}catch{return false;}
      }
      return true;
    };
    b.enableMoveInput(input,playerSide==='white'?COLOR.white:COLOR.black);
    return ()=>{clearInterval(timer.current); clearTimeout(botTimer.current); try{b.destroy()}catch{}};
  },[]);

  useEffect(()=>{ if(boardObj.current) boardObj.current.setPosition(game.fen(),true); if(result)return; const status=game.isCheckmate()? (game.turn()==='w'?'שחור ניצח במט':'לבן ניצח במט') : (game.isDraw()||game.isStalemate()||game.isThreefoldRepetition()||game.isInsufficientMaterial()) ? 'תיקו' : null; if(status){setResult(status);clearTimeout(botTimer.current);return;} if(game.turn()===botColor){setThinking(true); clearTimeout(botTimer.current); const budget=botBudgetMs(botColor==='w'?whiteMs:blackMs); const deadlineAt=botNow()+budget; const delay=botThinkingDelayMs(bot.elo,budget); const fen=game.fen(); let live=true; botTimer.current=setTimeout(()=>{chooseBotMove(fen,bot,{deadlineAt,ChessCtor:Chess}).then(reply=>{if(!live||resultRef.current||gameRef.current.fen()!==fen)return; const c=new Chess(fen); const play=m=>{try{return m?c.move({from:m.from,to:m.to,promotion:m.promotion||undefined}):null;}catch{return null;}}; const applied=play(reply.move)||play(botMoveOnPage(fen,bot,Chess)); setThinking(false); if(!applied)return; setQuip(chooseBotQuip(bot,c,applied)); setGame(c);},()=>{});},delay); return ()=>{live=false; clearTimeout(botTimer.current); cancelBotMove(); setThinking(false);}; } else setThinking(false); },[game,result]);

  useEffect(()=>{ if(result){clearInterval(timer.current);return;} clearInterval(timer.current); timer.current=setInterval(()=>{if(game.turn()==='w')setWhiteMs(v=>{const n=v-100;if(n<=0){setResult('שחור ניצח על הזמן');return 0;}return n;}); else setBlackMs(v=>{const n=v-100;if(n<=0){setResult('לבן ניצח על הזמן');return 0;}return n;});},100); return ()=>clearInterval(timer.current); },[game,result]);

  function finishText(){const pgn=game.pgn(); const playerWon=(playerSide==='white'&&/^לבן ניצח/.test(result||''))||(playerSide==='black'&&/^שחור ניצח/.test(result||'')); onGameFinished?.({won:playerWon,result,botIndex}); telemetry('bot_game_finished',{botIndex,won:playerWon,result}); onReview(pgn);}
  function resign(){setResult(playerSide==='white'?'שחור ניצח בהתפטרות':'לבן ניצח בהתפטרות');}
  function offerDraw(){setResult('תיקו');}
  return h('div',{className:'app-shell'},
    h('header',{className:'topbar'},h(ProductBrand,{section:`משחק מול ${bot.name}`}),h('div',{className:'top-actions'},h(GlobalLanguageButton),h('button',{onClick:onBack},'חזרה לבוטים'))),
    h('main',{className:'main botgame-page'},
      h('div',{className:'botgame-top'},h('div',null,h('b',null,`${bot.name} • ${bot.elo} Elo`),h('span',{className:'muted'},` ${bot.flavor||''}`),h('small',{className:'bot-origin'},`${bot.era||''} · ${bot.region||''}`),h('p',{className:'bot-quip','aria-live':'polite'},quip)),h('span',{className:'muted'},thinking?'הבוט חושב...':'תורך')),
      h('div',{className:'botgame-layout'},
        h('div',{className:'board-wrap bot-board-wrap'},h('div',{ref:boardRef,className:'board'})),
        h('aside',{className:'coach-card bot-side-panel'},h('div',{className:'clocks'},h('div',{className:'clock-box '+(game.turn()==='w'?'active':'')},formatClock(whiteMs)),h('div',{className:'clock-box '+(game.turn()==='b'?'active':'')},formatClock(blackMs))),h('div',{className:'bot-side-actions'},h('button',{onClick:resign},'פרוש'),h('button',{onClick:offerDraw},'הצע תיקו')),result&&h('div',{className:'result-card'},h('h2',null,result),h('button',{className:'primary',onClick:finishText},'העבר לסקירה'),h('button',{onClick:onBack},'בוט אחר')))
      )
    )
  );
}

function formatClock(ms){const s=Math.max(0,Math.ceil(ms/1000)); return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;}






function GlobalLanguageButton(){
  const [lang,setCurrentLang]=useState(getLang());
  useEffect(()=>{
    const onChange=()=>setCurrentLang(getLang());
    window.addEventListener('tabia-language-change',onChange);
    const cleanup=installDomTranslator();
    return ()=>{window.removeEventListener('tabia-language-change',onChange);cleanup?.();};
  },[]);
  return h('button',{className:'language-toggle',title:lang==='he'?'Switch to English':'החלפה לעברית',onClick:()=>{toggleLang();setCurrentLang(getLang());}},lang==='he'?'EN':'עברית');
}

function GlobalAccountButton({user,onOpen}){
  return user ? h('button',{className:'account-toggle',onClick:onOpen},getLang()==='he'?'👤 חשבון':'👤 Account') : null;
}

function AuthPage({mode,onModeChange,onAuthed,onVerify}){
  const en=getLang()==='en';
  const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [username,setUsername]=useState(''); const [fullName,setFullName]=useState(''); const [birthDate,setBirthDate]=useState(''); const [country,setCountry]=useState('Israel'); const [acceptTerms,setAcceptTerms]=useState(false); const [busy,setBusy]=useState(false); const [msg,setMsg]=useState('');
  const [accessStage,setAccessStage]=useState('request'); const [accessCode,setAccessCode]=useState(''); const [accessToken,setAccessToken]=useState(''); const [expiresAt,setExpiresAt]=useState(0); const [secondsLeft,setSecondsLeft]=useState(0);
  useEffect(()=>{
    if(mode!=='signup'){setAccessStage('request');setAccessCode('');setAccessToken('');setExpiresAt(0);setSecondsLeft(0);setMsg('');}
  },[mode]);
  useEffect(()=>{
    if(accessStage!=='code'||!expiresAt) return;
    const tick=()=>{
      const left=Math.max(0,Math.ceil((expiresAt-Date.now())/1000)); setSecondsLeft(left);
      if(left<=0){setAccessStage('request');setAccessCode('');setAccessToken('');setExpiresAt(0);setMsg(en?'The 12-minute code expired. Request a new code.':'קוד הגישה של 12 הדקות פג. צריך לבקש קוד חדש.');}
    };
    tick(); const timer=setInterval(tick,1000); return()=>clearInterval(timer);
  },[accessStage,expiresAt,en]);

  const requestCode=async()=>{
    if(!validEmailClient(email)){setMsg(en?'Enter a valid email first.':'הכנס קודם אימייל תקין.');return;}
    setBusy(true);setMsg('');
    const r=await postJson('/api/auth',{action:'request-access-code',email,language:getLang()});
    setBusy(false);
    if(r.ok&&r.data?.ok&&r.data.pending){setAccessStage('request');setExpiresAt(0);setAccessCode('');setSecondsLeft(0);setMsg(en?'Your signup request is waiting for operator approval. After approval, the operator will give you a six-digit code.':'בקשת ההרשמה שלך ממתינה לאישור המפעיל. אחרי האישור המפעיל ימסור לך קוד בן 6 ספרות.');return;}
    const map={ACCESS_RATE_LIMIT:en?'Too many access requests. Try again later.':'נשלחו יותר מדי בקשות גישה. נסה שוב מאוחר יותר.',ACCESS_EMAIL_FAILED:en?'The operator email could not be sent.':'לא הצלחנו לשלוח את בקשת הגישה למייל של המפעיל.',AUTH_NOT_CONFIGURED:en?'Account system is not connected yet. Follow the setup guide.':'מערכת החשבונות עדיין לא מחוברת. פעל לפי מדריך ההתקנה.'};
    setMsg(map[r.data?.error]||r.data?.error||(en?'Could not request access.':'לא הצלחתי לבקש גישה.'));
  };
  const verifyCode=async()=>{
    setBusy(true); setMsg('');
    const r=await postJson('/api/auth',{action:'verify-access-code',email,code:accessCode}); setBusy(false);
    if(r.ok&&r.data?.inviteToken){setAccessToken(r.data.inviteToken);setExpiresAt(Date.parse(r.data.expiresAt));setSecondsLeft(Math.max(0,Math.ceil((Date.parse(r.data.expiresAt)-Date.now())/1000)));setAccessStage('verified');setMsg(en?'Access approved. Finish creating your account.':'הגישה אושרה. עכשיו אפשר להשלים את יצירת החשבון.');return;}
    const map={ACCESS_CODE_EXPIRED:en?'The code expired after 12 minutes. Request a new code.':'הקוד פג אחרי 12 דקות. צריך לבקש קוד חדש.',ACCESS_CODE_LOCKED:en?'This code is locked after too many wrong attempts. Request a new code.':'הקוד ננעל אחרי יותר מדי ניסיונות שגויים. צריך לבקש קוד חדש.',ACCESS_CODE_INVALID:en?'The code is not correct.':'הקוד אינו נכון.'};
    setMsg(map[r.data?.error]||r.data?.error||(en?'Could not verify the code.':'לא הצלחתי לאמת את הקוד.'));
  };
  const submit=async()=>{
    setBusy(true);setMsg('');
    const action=mode==='signup'?'signup':'login';
    if(mode==='signup'&&!accessToken){setBusy(false);setMsg(en?'You must receive and enter an approved access code first.':'צריך לקבל ולהכניס קודם קוד גישה מאושר.');return;}
    const body=mode==='signup'?{action,email,password,username,fullName,birthDate,country,acceptTerms,language:getLang(),accessToken}:{action,email,password};
    const r=await postJson('/api/auth',body);
    setBusy(false);
    if(r.ok&&r.data?.emailVerificationRequired){onVerify?.(email);return;}
    if(r.ok&&r.data?.user){onAuthed(r.data.user);return;}
    const map={AGE_RESTRICTED:en?'You must be 18 or older to use Veyra Chess.':'כדי להשתמש ב־Veyra Chess צריך להיות בן/בת 18 ומעלה.',TERMS_REQUIRED:en?'You must accept the Terms of Use and Privacy Policy.':'צריך לאשר את תנאי השימוש ומדיניות הפרטיות.',USERNAME_TAKEN:en?'That username is already taken.':'שם המשתמש כבר תפוס.',EMAIL_NOT_VERIFIED:en?'Your email is not verified yet. Check your inbox first.':'האימייל עדיין לא מאומת. בדוק את תיבת הדואר קודם.',ACCESS_CODE_EXPIRED:en?'Your approval window expired. Request a new code.':'חלון האישור שלך פג. בקש קוד חדש.',ACCESS_CHECK_FAILED:en?'The access approval could not be checked.':'לא הצלחנו לבדוק את אישור הגישה.',AUTH_NOT_CONFIGURED:en?'Account system is not connected yet. Follow the setup guide.':'מערכת החשבונות עדיין לא מחוברת. פעל לפי מדריך ההתקנה.'};
    setMsg(map[r.data?.error]||r.data?.error|| (en?'Something went wrong.':'משהו השתבש.'));
  };
  const clock=()=>`${Math.floor(secondsLeft/60).toString().padStart(2,'0')}:${(secondsLeft%60).toString().padStart(2,'0')}`;
  return h('div',{className:'app-shell auth-shell'},h('div',{className:'auth-top-controls'},h(GlobalLanguageButton)),h('main',{className:'content auth-page'},
    h('section',{className:'auth-card'},h('div',{className:'auth-card-head'},h('button',{onClick:()=>onModeChange(mode==='signup'?'login':'signup')},mode==='signup'?(en?'I already have an account':'יש לי כבר חשבון'):(en?'Create an account':'יצירת חשבון')),h('span',{className:'auth-mode'},mode==='signup'?(en?'Create account':'יצירת חשבון'):(en?'Sign in':'כניסה'))),
    mode==='signup'&&accessStage!=='verified'&&h('div',{className:'access-approval-box'},
      h('div',{className:'eyebrow'},en?'PRIVATE ACCESS APPROVAL':'אישור גישה פרטי'),
      h('h2',null,en?'You need the operator’s code first':'צריך קודם קוד מהמפעיל'),
      h('p',{className:'small-muted'},en?'Before an account can be created, Veyra sends a request to the operator. The operator decides whether to give you the one-time six-digit code.':'לפני שאפשר לפתוח חשבון, Veyra שולח בקשת גישה למפעיל. המפעיל מחליט אם למסור לך את קוד הגישה החד־פעמי בן 6 הספרות.'),
      h('label',null,'Email',h('input',{type:'email',value:email,onChange:e=>setEmail(e.target.value),autoComplete:'email',disabled:accessStage==='code'})),
      accessStage==='request'&&h('div',{className:'access-request-actions'},h('button',{className:'primary',disabled:busy,onClick:requestCode},busy?(en?'Sending request...':'שולח בקשה...'):(en?'Request access approval':'בקש אישור גישה')),h('button',{disabled:busy,onClick:()=>{setAccessStage('code');setExpiresAt(0);setMsg('');}},en?'I already have an approved code':'יש לי כבר קוד שאושר')),
      accessStage==='code'&&h('div',{className:'access-code-step'},h('p',{className:'small-muted'},expiresAt?(en?'The code expires in 12 minutes.':'הקוד פג אחרי 12 דקות.'): (en?'Enter the six-digit code the operator gave you. The timer starts when the server approves and issues the code.':'הכנס את קוד 6 הספרות שהמפעיל נתן לך. הספירה מתחילה כשהשרת מאשר ומנפיק את הקוד.')),expiresAt&&h('div',{className:'access-countdown'},clock()),h('input',{className:'access-code-input',inputMode:'numeric',pattern:'[0-9]*',maxLength:6,value:accessCode,onChange:e=>setAccessCode(e.target.value.replace(/\D/g,'').slice(0,6)),placeholder:'123456',autoComplete:'one-time-code'}),h('button',{className:'primary',disabled:busy||accessCode.length!==6,onClick:verifyCode},busy?(en?'Checking...':'בודק...'):(en?'Enter approved code':'אמת קוד')),h('button',{disabled:busy,onClick:requestCode},en?'Request another code':'בקש קוד חדש')),
      msg&&h('div',{className:'auth-message error'},msg)
    ),
    mode==='signup'&&accessStage==='verified'&&h('div',{className:'access-approved-box'},h('div',{className:'eyebrow'},'ACCESS APPROVED'),h('p',null,en?'The operator approved this signup. Finish the account form before the 12-minute approval window expires.':'המפעיל אישר את ההרשמה. השלם את הטופס לפני שחלון האישור של 12 הדקות יפוג.'),h('div',{className:'access-countdown'},clock())),
    mode==='signup'&&accessStage==='verified'&&h('div',{className:'form-grid'},h('label',null,en?'Full name':'שם מלא',h('input',{value:fullName,onChange:e=>setFullName(e.target.value),autoComplete:'name'})),h('label',null,en?'Username':'שם משתמש',h('input',{value:username,onChange:e=>setUsername(e.target.value),autoComplete:'username'})),h('label',null,en?'Birth date':'תאריך לידה',h('input',{type:'date',value:birthDate,onChange:e=>setBirthDate(e.target.value)})),h('label',null,en?'Country':'מדינה',h('input',{value:country,onChange:e=>setCountry(e.target.value),autoComplete:'country-name'}))),
    mode==='login'&&h('label',null,'Email',h('input',{type:'email',value:email,onChange:e=>setEmail(e.target.value),autoComplete:'email'})),
    (mode==='signup'&&accessStage==='verified'||mode==='login')&&h('label',null,en?'Password (10+ characters)':'סיסמה (10 תווים לפחות)',h('input',{type:'password',value:password,onChange:e=>setPassword(e.target.value),autoComplete:mode==='signup'?'new-password':'current-password'})),
    mode==='signup'&&accessStage==='verified'&&h('label',{className:'consent-row'},h('input',{type:'checkbox',checked:acceptTerms,onChange:e=>setAcceptTerms(e.target.checked)}),h('span',null,en?'I explicitly accept the Terms of Use and Privacy Policy.':'אני מאשר/ת במפורש את תנאי השימוש ואת מדיניות הפרטיות.')),
    mode==='signup'&&accessStage==='verified'&&h('p',{className:'small-muted'},en?'By creating an account you agree to the current Terms and Privacy Policy. The operator is not a lawyer.':'בעת יצירת חשבון אתה מסכים לגרסאות הנוכחיות של תנאי השימוש ומדיניות הפרטיות. המפעיל אינו עורך דין.'),
    mode==='login'&&h('p',{className:'small-muted'},en?'Existing accounts do not need a new approval code. Your email must already be verified.':'חשבונות קיימים לא צריכים קוד אישור חדש. האימייל שלהם חייב להיות מאומת.'),
    msg&&accessStage!=='code'&&h('div',{className:'auth-message error'},msg),
    ((mode==='signup'&&accessStage==='verified')||mode==='login')&&h('button',{className:'primary',disabled:busy,onClick:submit},busy?(en?'Working...':'מעבד...'):(mode==='signup'?(en?'Create account':'צור חשבון'):(en?'Sign in':'היכנס')))
  )));
}

function validEmailClient(email){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email||''));}

function VerifyPage({email,onBack}){
  const en=getLang()==='en'; const [busy,setBusy]=useState(false); const [msg,setMsg]=useState('');
  const resend=async()=>{setBusy(true);const r=await postJson('/api/auth',{action:'resend',email});setBusy(false);setMsg(r.ok?(en?'A new verification email was requested.':'נשלחה בקשת אימות חדשה.'):(en?'Could not resend the email.':'לא הצלחתי לשלוח שוב את האימייל.'));};
  return h('div',{className:'app-shell auth-shell'},h('div',{className:'auth-top-controls'},h(GlobalLanguageButton)),h('main',{className:'content auth-page'},h('section',{className:'auth-card center'},h('div',{className:'eyebrow'},'EMAIL VERIFICATION'),h('h1',null,en?'Check your email':'בדוק את האימייל שלך'),h('p',null,en?`We sent a verification email to ${email}. You cannot enter Veyra until the email is verified.`:`שלחנו אימייל אימות ל־${email}. אי אפשר להיכנס ל־Veyra לפני שהאימייל מאומת.`),h('p',{className:'small-muted'},en?'The free built-in email service is intended for the private beta and has rate limits.':'שירות האימייל החינמי המובנה מיועד לבטא הפרטית ויש לו מגבלות קצב.'),h('button',{className:'primary',disabled:busy,onClick:resend},busy?(en?'Sending...':'שולח...'):(en?'Resend verification email':'שלח אימייל אימות שוב')),msg&&h('div',{className:'auth-message'},msg),h('button',{onClick:onBack},en?'Back':'חזרה'))));
}

// ===== Openings trainer: per-line practice, completion badge, recommendation, account sync =====
const OPEN_PROG_KEY='veyra_progress_v1';
function readLocalProgress(){try{const p=JSON.parse(localStorage.getItem(OPEN_PROG_KEY)||'{}');return p&&typeof p==='object'?p:{};}catch{return {};}}
function writeLocalProgress(p){try{localStorage.setItem(OPEN_PROG_KEY,JSON.stringify(p));}catch{}}
function mergeProgress(a,b){
  const done={...(a?.done||{})}; for(const k of Object.keys(b?.done||{})) done[k]=Math.max(done[k]||0,b.done[k]||0);
  const completed={...(a?.completed||{})}; for(const k of Object.keys(b?.completed||{})) completed[k]=Math.max(completed[k]||0,b.completed[k]||0);
  return {done,completed,bot:Math.max(Number(a?.bot)||0,Number(b?.bot)||0)};
}
function OpeningsPage({user,onBack}){
  const en=getLang()==='en';
  const [data,setData]=useState([]); const [recs,setRecs]=useState({});
  const [prog,setProg]=useState(()=>mergeProgress(readLocalProgress(),{}));
  const [sync,setSync]=useState(user?'loading':'local');
  const [oi,setOi]=useState(-1); const [li,setLi]=useState(0); const [ply,setPly]=useState(0);
  const [quiz,setQuiz]=useState(false); const [input,setInput]=useState(''); const [msg,setMsg]=useState('');
  const [mist,setMist]=useState(0); const [cheated,setCheated]=useState(false); const [celebrate,setCelebrate]=useState(null);
  const boardRef=useRef(null); const boardObj=useRef(null); const saveTimer=useRef(null); const loaded=useRef(false);
  const [loadError,setLoadError]=useState(false); const [loadTry,setLoadTry]=useState(0);
  const [openingStreak,setOpeningStreak]=useState({status:'idle',pending:0} as OpeningStreakUpdate);
  const openingStreakClient=useRef(null);
  useEffect(()=>{
    setOpeningStreak({status:'idle',pending:0});
    if(!user?.id)return;
    let client;
    try{
      client=createOpeningStreakClient({userId:user.id,storage:localStorage,fetch:window.fetch.bind(window),
        uuid:()=>crypto.randomUUID(),timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC',onChange:setOpeningStreak});
    }catch(error){setOpeningStreak({status:'error',pending:0,error:String(error)});return;}
    openingStreakClient.current=client;
    const retry=()=>{void client.flush();};
    retry();window.addEventListener('online',retry);
    return()=>{client.dispose();openingStreakClient.current=null;window.removeEventListener('online',retry);};
  },[user?.id]);
  useEffect(()=>{setLoadError(false);(async()=>{try{const [a,b]=await Promise.all([fetch('/data/repertoire.json').then(r=>r.json()),fetch('/data/recommendations.json').then(r=>r.json()).catch(()=>({}))]);setData(a);setRecs(b);}catch{setLoadError(true);}})();},[loadTry]);
  useEffect(()=>{if(!user){loaded.current=true;return;}let off=false;(async()=>{const r=await getJson('/api/sync');if(off)return;if(r.ok&&r.data?.ok){const owner=localStorage.getItem(ACCOUNT_SYNC_OWNER_KEY);const local=(!owner||owner===user.id)?readLocalProgress():{};const m=mergeProgress(local,r.data.progress||{});setProg(m);writeLocalProgress(m);loaded.current=true;setSync('synced');fetch('/api/sync',{method:'PUT',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({progress:m})}).catch(()=>{});}else{loaded.current=true;setSync('error');}})();return()=>{off=true;};},[user?.id]);
  function persist(next){setProg(next);writeLocalProgress(next);if(!user)return;setSync('saving');clearTimeout(saveTimer.current);saveTimer.current=setTimeout(async()=>{try{const r=await fetch('/api/sync',{method:'PUT',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({progress:next})});setSync(r.ok?'synced':'error');}catch{setSync('error');}},600);}
  const op=data[oi]; const lines=op?op.lines:[]; const line=lines[li]; const moves=line?line.moves.map(m=>m[0]):[];
  const userIsWhite=op?op.color==='w':true;
  function fenAt(n){const c=new Chess();for(let i=0;i<n&&i<moves.length;i++){try{c.move(moves[i]);}catch{break;}}return c.fen();}
  useEffect(()=>{
    if(!boardRef.current||!op)return;
    if(!boardObj.current){boardObj.current=new Chessboard(boardRef.current,{position:fenAt(ply),orientation:userIsWhite?COLOR.white:COLOR.black,responsive:true,assetsUrl:'/vendor/cm-chessboard/',style:{borderType:BORDER_TYPE.none,cssClass:'default',pieces:{file:'pieces/standard.svg'},animationDuration:200}});}
    else{boardObj.current.setOrientation(userIsWhite?COLOR.white:COLOR.black);boardObj.current.setPosition(fenAt(ply),true);}
  },[oi,li,ply,op&&op.id]);
  useEffect(()=>{if(oi<0&&boardObj.current){try{boardObj.current.destroy();}catch{}boardObj.current=null;}},[oi]);
  // Opponent auto-plays in quiz mode
  useEffect(()=>{if(!quiz||!line)return;if(ply>=moves.length)return;const mineNow=(ply%2===0)===userIsWhite;if(mineNow)return;const t=setTimeout(()=>setPly(p=>p+1),450);return()=>clearTimeout(t);},[quiz,ply,li,oi]);
  function isLearned(o,l){return !!prog.done?.[o.id+'/'+l.id];}
  function progressOf(o){const core=coreLines(o);const n=core.filter(l=>isLearned(o,l)).length;return {n,total:core.length,done:n===core.length};}
  function startLine(i){setLi(i);setPly(0);setQuiz(false);setMsg('');setMist(0);setCheated(false);setInput('');}
  function startQuiz(){setPly(0);setQuiz(true);setMist(0);setCheated(false);setMsg('');}
  function markLearned(){
    const done={...(prog.done||{}),[op.id+'/'+line.id]:Date.now()}; const next={...prog,done};
    const was=progressOf(op).done; const core=coreLines(op); const now=core.every(l=>done[op.id+'/'+l.id]);
    if(now&&!was){
      next.completed={...(prog.completed||{}),[op.id]:Date.now()};persist(next);setCelebrate(op.id);
      void openingStreakClient.current?.record(op.id,core.map(l=>({lineId:l.id,moves:l.moves.map(m=>m[0])})));
    }else persist(next);
  }
  function finishQuiz(){
    if(mist<=2&&!cheated){markLearned();setMsg(en?'Line learned ✓':'הקו נלמד ✓');}
    else setMsg(en?'Finished, but with too many mistakes or hints. Try again to mark it learned.':'סיימת, אבל עם יותר מדי טעויות או רמזים. נסה שוב כדי לסמן כנלמד.');
    setQuiz(false);
  }
  useEffect(()=>{if(quiz&&line&&ply>=moves.length&&moves.length)finishQuiz();},[ply,quiz]);
  function submit(e){e&&e.preventDefault&&e.preventDefault();if(!quiz||ply>=moves.length)return;if(quizMoveMatches(Chess,fenAt(ply),input,moves[ply])){setInput('');setMsg('');setPly(ply+1);}else{setMist(mist+1);setMsg(en?'Not that move. Try again, or tap Hint.':'לא המהלך הזה. נסה שוב או לחץ על רמז.');}}
  function hint(){if(!quiz||ply>=moves.length)return;setCheated(true);setMsg((en?'Hint: ':'רמז: ')+moves[ply]);}
  const totalDone=data.filter(o=>progressOf(o).done).length;
  const rec=op?(recs[op.name]||null):null;
  const generic={best:{he:'פתח מרכז, פתח כלים והצרח מוקדם; למד קודם את קו הליבה.',en:'Fight for the centre, develop and castle early; learn the main line first.'},study:{he:'למד קודם את קו הליבה (⭐) של הפתיחה.',en:'Learn the main starred line first.'}};
  const R=rec||generic;
  const syncLabel={local:en?'Local only — sign in to sync':'מקומי בלבד — התחבר כדי לסנכרן',loading:en?'Syncing…':'מסנכרן…',saving:en?'Saving…':'שומר…',synced:en?'☁ Synced to your account':'☁ מסונכרן לחשבון שלך',error:en?'Sync problem — saved on this device':'בעיית סנכרון — נשמר במכשיר זה'}[sync];
  function ring(n,total,done){const r=18,c=2*Math.PI*r,f=total?n/total:0;return h('svg',{width:44,height:44,viewBox:'0 0 44 44','aria-hidden':'true'},h('circle',{cx:22,cy:22,r,fill:'none',stroke:'var(--hairline)','stroke-width':4}),h('circle',{cx:22,cy:22,r,fill:'none',stroke:done?'var(--status-success)':'var(--primary)','stroke-width':4,'stroke-dasharray':`${c*f} ${c}`,'stroke-linecap':'round',transform:'rotate(-90 22 22)'}),h('text',{x:22,y:26,'text-anchor':'middle','font-size':done?16:11,fill:done?'var(--status-success)':'var(--ink)'},done?'✓':`${n}/${total}`));}
  const list=h('div',{className:'open-list'},data.map((o,i)=>{const p=progressOf(o);return h('button',{key:o.id,className:'open-item'+(i===oi?' selected':'')+(p.done?' done':''),onClick:()=>{setOi(i);startLine(0);setCelebrate(null);}},ring(p.n,p.total,p.done),h('span',{className:'open-meta'},h('b',null,o.name),h('small',null,(o.color==='w'?(en?'You play White':'אתה משחק לבן'):(en?'You play Black':'אתה משחק שחור'))+(p.done?(en?' • Completed':' • הושלם'):''))));}));
  const detail=!op?h('div',{className:'panel'},h('p',{className:'muted'},en?'Pick an opening to study. Learn its core lines (⭐, topped up to at least 6) to complete it.':'בחר פתיחה ללימוד. למד את הקווים המסומנים בכוכב כדי להשלים אותה.')):h('div',{className:'open-detail'},
    celebrate===op.id||(progressOf(op).done)?h('section',{className:'panel open-done'},h('h2',null,'✅ '+(en?`You completed ${op.name}!`:`סיימת את ${op.name}!`)),h('p',null,h('b',null,en?'Best response against it: ':'מה הכי טוב נגדה: '),en?R.best.en:R.best.he),h('p',null,h('b',null,en?'Study next: ':'ללמוד עכשיו: '),en?R.study.en:R.study.he),!rec&&h('small',{className:'muted'},en?'(General advice — no specific entry yet.)':'(עצה כללית — אין עדיין המלצה ייעודית.)')):null,
    h('div',{className:'panel'},h('p',{className:'muted'},op.oneLiner||''),h('div',{className:'open-lines'},lines.map((l,i)=>h('button',{key:l.id,className:'open-line'+(i===li?' selected':''),onClick:()=>startLine(i)},(isLearned(op,l)?'✓ ':'')+(l.star?'⭐ ':'')+l.name)))),
    line&&h('div',{className:'panel'},h('h3',null,line.name),line.idea&&h('p',{className:'muted'},line.idea),h('div',{className:'board-wrap open-board-wrap'},h('div',{ref:boardRef,className:'board'})),
      h('div',{className:'row'},h('button',{disabled:quiz||ply<=0,onClick:()=>setPly(ply-1)},'◀'),h('span',{className:'muted'},`${ply}/${moves.length}`),h('button',{disabled:quiz||ply>=moves.length,onClick:()=>setPly(ply+1)},'▶'),!quiz?h('button',{className:'primary',onClick:startQuiz},en?'Practice this line':'תרגל את הקו'):h('button',{onClick:()=>{setQuiz(false);setPly(0);}},en?'Stop':'עצור')),
      ply>0&&h('p',{className:'muted'},moves.slice(0,ply).map((m,i)=>(i%2===0?`${i/2+1}. `:'')+m).join(' ')),
      ply>0&&line.moves[ply-1]?.[1]&&!quiz&&h('p',null,line.moves[ply-1][1]),
      quiz&&ply<moves.length&&(ply%2===0)===userIsWhite&&h('form',{onSubmit:submit,className:'row'},h('input',{value:input,onChange:e=>setInput(e.target.value),placeholder:en?'Your move (e.g. Nf3)':'המהלך שלך (למשל Nf3)',autoFocus:true}),h('button',{className:'primary',type:'submit'},en?'Play':'שחק'),h('button',{type:'button',onClick:hint},en?'Hint':'רמז')),
      msg&&h('p',{className:'open-msg'},msg),
      !isLearned(op,line)&&!quiz&&h('button',{onClick:startQuiz},en?'Test me on this line':'בחן אותי על הקו'))
  );
  return h('div',{className:'app-shell'},h('header',{className:'topbar'},h(ProductBrand,{section:en?'Openings':'פתיחות'}),h('div',{className:'top-actions'},h('span',{className:'stage-pill'},syncLabel),h('button',{onClick:onBack},en?'Back':'חזרה'))),
    h('main',{className:'content'},h('section',{className:'hero-row'},h('div',null,h('span',{className:'eyebrow'},'OPENINGS'),h('h1',null,en?'Opening trainer':'מאמן פתיחות'),h('p',{className:'muted'},en?`Completed ${totalDone} of ${data.length} openings. An opening is complete when all its core lines (⭐, at least 6 per opening) are learned.`:`הושלמו ${totalDone} מתוך ${data.length} פתיחות. פתיחה נחשבת גמורה כשכל קווי הליבה שלה (⭐, לפחות 6) נלמדו.`))),
      loadError&&h('div',{className:'panel',role:'alert'},h('p',null,en?'Could not load openings. Check your connection and try again.':'טעינת הפתיחות נכשלה. בדוק את החיבור ונסה שוב.'),h('button',{className:'primary',onClick:()=>setLoadTry(t=>t+1)},en?'Retry':'נסה שוב')),
      openingStreak.status!=='idle'&&h('section',{className:'panel','data-opening-streak':openingStreak.status,role:openingStreak.status==='error'?'alert':'status'},
        h('p',null,({
          saving:en?'Verifying opening completion for your daily streak...':'מאמת את השלמת הפתיחה לרצף היומי...',
          accepted:en?'Opening completion verified. Your daily streak is updated; your learning progress and personal best are preserved.':'השלמת הפתיחה אומתה. הרצף היומי עודכן; התקדמות הלימוד והשיא האישי נשמרו.',
          pending:en?'Opening completion is saved on this device and awaiting verification. It does not count as a day yet.':'השלמת הפתיחה נשמרה במכשיר וממתינה לאימות. היא עדיין לא נספרת כיום פעילות.',
          disabled:en?'Daily streak is not enabled on the server. Your learning progress is unchanged; the activity remains queued.':'הרצף היומי לא הופעל בשרת. התקדמות הלימוד לא השתנתה; הפעילות נשארת בתור.',
          error:en?'Could not verify or queue this activity. Your learning progress is preserved. No existing queued activity was deleted.':'לא ניתן לאמת או להוסיף את הפעילות לתור. התקדמות הלימוד נשמרה ולא נמחקה פעילות קיימת מהתור.',
        })[openingStreak.status]),
        openingStreak.pending>0&&h('p',{className:'muted'},en?`${openingStreak.pending} pending; the server receipt date is used, not the offline completion date.`:`${openingStreak.pending} בהמתנה; התאריך שייספר הוא יום הקבלה בשרת, לא יום ההשלמה ללא חיבור.`),
        openingStreak.error&&openingStreak.status==='error'&&h('p',{className:'muted'},openingStreak.error),
        ['pending','error','disabled'].includes(openingStreak.status)&&h('button',{onClick:()=>{void openingStreakClient.current?.flush();}},en?'Retry verification':'נסה אימות שוב')),
      h('div',{className:'open-grid'},list,detail)));
}

function AccountPage({user,onLogout,onDeleted}){
  const en=getLang()==='en'; const [confirm,setConfirm]=useState(false); const [busy,setBusy]=useState(false); const [msg,setMsg]=useState('');
  const del=async()=>{if(!confirm)return;setBusy(true);const r=await postJson('/api/auth',{action:'delete',confirm:true});setBusy(false);if(r.ok){onDeleted();}else setMsg(en?'Could not delete the account.':'לא הצלחתי למחוק את החשבון.');};
  return h('div',{className:'app-shell'},h('header',{className:'topbar'},h(ProductBrand,{section:'Veyra Chess'}),h('div',{className:'top-actions'},h(GlobalLanguageButton),h('button',{onClick:onLogout},en?'Sign out':'יציאה'))),h('main',{className:'content auth-page'},h('section',{className:'auth-card'},h('h1',null,en?'Your account':'החשבון שלך'),h('p',null,`${user?.email||''}`),h('p',{className:'small-muted'},en?'Your account profile and training data are kept while the account exists and are used by Veyra Coach, Adaptive Bots and training systems.':'פרופיל החשבון ונתוני האימון נשמרים כל עוד החשבון קיים ומשמשים את Coach, Adaptive Bots ומערכות האימון של Veyra.'),h('p',{className:'small-muted'},en?'You can request full account deletion below.':'אפשר לבקש מחיקה מלאה של החשבון והנתונים למטה.'),h('div',{className:'delete-box'},h('label',{className:'consent-row'},h('input',{type:'checkbox',checked:confirm,onChange:e=>setConfirm(e.target.checked)}),h('span',null,en?'I understand this permanently deletes my active Veyra account data.':'אני מבין/ה שהפעולה תמחק לצמיתות את נתוני חשבון Veyra הפעילים.')),h('button',{className:'danger',disabled:!confirm||busy,onClick:del},busy?(en?'Deleting...':'מוחק...'):(en?'Delete account':'מחק חשבון')),msg&&h('div',{className:'auth-message error'},msg)))));
}

function SetupRequiredPage(){const en=getLang()==='en';return h('div',{className:'app-shell auth-shell'},h('div',{className:'auth-top-controls'},h(GlobalLanguageButton)),h('main',{className:'content auth-page'},h('section',{className:'auth-card'},h('h1',null,en?'One last setup step':'נשאר שלב הגדרה אחד'),h('p',null,en?'The account system is not connected yet. Add the required Supabase variables in Netlify before users can register.':'מערכת החשבונות עדיין לא מחוברת. צריך להוסיף את משתני Supabase הדרושים ב־Netlify לפני שמשתמשים יכולים להירשם.'),h('pre',{className:'setup-code'},`SUPABASE_URL=...\nSUPABASE_ANON_KEY=...\nSUPABASE_SECRET_KEY=...\nADMIN_EMAIL=orennzb@gmail.com\nADMIN_PASSWORD_HASH=...\nADMIN_SESSION_SECRET=...\nSITE_URL=https://YOUR-SITE.netlify.app`),h('a',{href:'/SETUP_FOR_BEGINNERS.md',target:'_blank'},en?'Open the setup guide':'פתח את מדריך ההתקנה'))));}

function App(){
 const [authReady,setAuthReady]=useState(false);
 const [authConfigured,setAuthConfigured]=useState(false);
 const [authUser,setAuthUser]=useState(null);
 const [authStage,setAuthStage]=useState('welcome');
 const [authMode,setAuthMode]=useState('signup');
 const [verifyEmail,setVerifyEmail]=useState('');
 const [page,setPage]=useState('home');
  const [blindfoldBotId,setBlindfoldBotId]=useState(null);
 const [pgn,setPgn]=useState('');
 const [game,setGame]=useState(()=>new Chess());
 const [history,setHistory]=useState([]);
 const [moveClocks,setMoveClocks]=useState([]);
 const [selected,setSelected]=useState(-1);
 const [analysis,setAnalysis]=useState(null);
 const [analyzing,setAnalyzing]=useState(false);
 const [status,setStatus]=useState('מוכן. הדבק PGN או בחר משחק מ-Chess.com.');
 const [username,setUsername]=useState(localStorage.getItem('chesscom_username')||'');
 const [lichessUsername,setLichessUsername]=useState(localStorage.getItem('lichess_username')||'');
 const [archiveProvider,setArchiveProvider]=useState('chesscom');
 const [archiveGames,setArchiveGames]=useState([]);
 const [archiveLoading,setArchiveLoading]=useState(false);
 const [archiveError,setArchiveError]=useState('');
 const [archiveWarning,setArchiveWarning]=useState('');
 const [archiveLoadedProvider,setArchiveLoadedProvider]=useState('');
 const [activeArchiveGame,setActiveArchiveGame]=useState(null);
 const [archiveReviews,setArchiveReviews]=useState(()=>{try{const value=JSON.parse(localStorage.getItem('veyra_archive_reviews_v1')||'{}');return value&&typeof value==='object'?value:{};}catch{return {};}});
 const [dnaReport,setDnaReport]=useState(null);
 const [dnaStatus,setDnaStatus]=useState('עדיין לא נוצר דוח DNA בחשבון הזה.');
 const [dnaError,setDnaError]=useState('');
 const [statsLoading,setStatsLoading]=useState(false);
 const dnaLoadRequestRef=useRef(0);
 const [dnaRunning,setDnaRunning]=useState(false);
 const [dnaProgress,setDnaProgress]=useState({done:0,total:0});
 const dnaOwnerRef=useRef(authUser?.id||null);
 const dnaCancelRef=useRef(false);
 const dnaRunLockRef=useRef(false);
 const [accountLanguage,setAccountLanguage]=useState(()=>getLang());
 const [syncSettingsUserId,setSyncSettingsUserId]=useState(null);
 const [accountSyncStatus,setAccountSyncStatus]=useState('idle');
 const accountSyncTimer=useRef(null);
 const [savedGames,setSavedGames]=useState([]);
 const [summaryOpen,setSummaryOpen]=useState(false);
 const [explainMode,setExplainMode]=useState('normal');
 const [gateOpen,setGateOpen]=useState(true);
 const [bots,setBots]=useState([]);
 const [selectedBot,setSelectedBot]=useState(null);
 const [playerSide,setPlayerSide]=useState('white');
 const [clockMinutes,setClockMinutes]=useState(10);
 const [extra,setExtra]=useState({});
 const [isAdmin,setIsAdmin]=useState(false);
 const [adminEmail,setAdminEmail]=useState('');
 const [adminPassword,setAdminPassword]=useState('');
 const [adminBotSlug,setAdminBotSlug]=useState('');
 const [adminBotDraft,setAdminBotDraft]=useState(null);
 const [adminStats,setAdminStats]=useState(null);
 const [accessRequests,setAccessRequests]=useState([]);
 const [issuedCodes,setIssuedCodes]=useState({});
 const [botUnlockedIndex,setBotUnlockedIndexState]=useState(getBotUnlockedIndex());
 const [adaptiveOptIn,setAdaptiveOptInState]=useState(isAdaptiveOptedIn());
 const boardRef=useRef(null); const boardObj=useRef(null); const overlayRef=useRef(null); const arrowRef=useRef(null);
 const gameRef=useRef(game);
 useEffect(()=>{gameRef.current=game;},[game]);
 useEffect(()=>{dnaOwnerRef.current=authUser?.id||null;dnaCancelRef.current=true;dnaLoadRequestRef.current++;setStatsLoading(false);setDnaReport(null);setDnaError('');setDnaProgress({done:0,total:0});setDnaStatus('עדיין לא נוצר דוח DNA בחשבון הזה.');setDnaRunning(false);},[authUser?.id]);
 useEffect(()=>{
   let cancelled=false;
   (async()=>{
     const status=await getJson('/api/auth?action=status');
     if(cancelled)return;
     setAuthConfigured(status.ok&&status.data?.configured===true);
     if(!(status.ok&&status.data?.configured===true)){setAuthReady(true);return;}
     const session=await getJson('/api/auth?action=session');
     if(cancelled)return;
     if(session.ok&&session.data?.authenticated){setAuthUser(session.data.user);setAuthStage('app');} else setAuthStage('welcome');
     setAuthReady(true);
   })();
   return ()=>{cancelled=true;};
 },[]);


 useEffect(()=>{
   let cancelled=false;
   (async()=>{
    try{ const r=await fetch('/api/bots',{cache:'no-store',credentials:'same-origin'}); if(r.ok){ const data=await r.json(); const arr=Array.isArray(data?.bots)?data.bots:[]; if(arr.length){ if(!cancelled)setBots(normalizeBotList(arr)); return; } } const fallback=await fetch(BOT_MANIFEST_URL,{cache:'no-store'}); if(!fallback.ok) throw new Error('bot manifest unavailable'); const arr=await fallback.json(); if(!Array.isArray(arr)) throw new Error('invalid bot manifest'); if(!cancelled)setBots(normalizeBotList(arr)); }catch(e){ if(!cancelled)setStatus('טעינת הבוטים נכשלה.'); }
   })();
   getJson('/api/admin-auth').then(r=>{if(r.ok&&r.data?.authenticated){setIsAdmin(true);setAdminEmail(r.data.email||'');}});
   telemetry('app_open',{surface:'web'});
   return ()=>{cancelled=true};
 },[]);
 useEffect(()=>{setBotUnlockedIndexState(getBotUnlockedIndex());setAdaptiveOptInState(isAdaptiveOptedIn());},[page]);
 useEffect(()=>{if(page==='admin'&&isAdmin) loadAccessRequests();},[page,isAdmin]);

 useEffect(()=>{
   if(page!=='review'||!boardRef.current || boardObj.current) return;
   const b=new Chessboard(boardRef.current,{position:game.fen(),orientation:COLOR.white,responsive:true,assetsUrl:'/vendor/cm-chessboard/',style:{borderType:BORDER_TYPE.none,cssClass:'default',pieces:{file:'pieces/standard.svg'},animationDuration:280}});
   boardObj.current=b;
   b.enableMoveInput((ev)=>{
     const currentGame=gameRef.current;
     if(ev.type==='moveInputStarted'){
       return currentGame.get(ev.squareFrom)!=null;
     }
     if(ev.type==='validateMoveInput'){
       try{
         const copy=new Chess(currentGame.fen()); const mv=copy.move({from:ev.squareFrom,to:ev.squareTo,promotion:ev.promotion||undefined});
         if(!mv) return false;
         const nextHistory=copy.history({verbose:true});
         setGame(copy); setHistory(nextHistory); setSelected(nextHistory.length-1); setAnalysis(null); setStatus('מהלך בוצע.');
         setTimeout(()=>drawOverlays(copy,nextHistory.length-1),20); return true;
       }catch{return false;}
     }
     return true;
   }, COLOR.white);
   return ()=>{try{b.destroy()}catch{};if(boardObj.current===b)boardObj.current=null;};
 },[page]);

 useEffect(()=>{ if(boardObj.current){ const view=selected>=0&&history.length ? positionAfterPly(history,selected) : game; boardObj.current.setPosition(view.fen(), true); boardObj.current.setOrientation(playerSide==='white'?COLOR.white:COLOR.black,true); setTimeout(()=>drawOverlays(view,selected),40);} },[game,history,selected,playerSide,explainMode,analysis]);
 useEffect(()=>{ const fn=(e)=>{ if(e.key==='ArrowRight'){e.preventDefault();setSelected(v=>Math.min(history.length-1,v+1));} if(e.key==='ArrowLeft'){e.preventDefault();setSelected(v=>Math.max(0,v-1));} }; window.addEventListener('keydown',fn); return()=>window.removeEventListener('keydown',fn); },[history.length]);

 function drawOverlays(g,index){
   if(!overlayRef.current||!boardRef.current) return;
   const svg=overlayRef.current; while(svg.firstChild)svg.removeChild(svg.firstChild);
   const badgeLayer=svg.parentElement?.querySelector('.badge-layer'); if(badgeLayer) while(badgeLayer.firstChild) badgeLayer.removeChild(badgeLayer.firstChild);
   const a=analysis?.moves?.[index]; const mv=history[index];
   const rect=boardRef.current.getBoundingClientRect(); const size=Math.min(rect.width,rect.height); const sq=size/8;
   const orient=playerSide;
   const coord=(sqName)=>{ const file=sqName.charCodeAt(0)-97, rank=Number(sqName[1]); return orient==='white'?{x:(file+.5)*sq,y:(8-rank+.5)*sq}:{x:(7-file+.5)*sq,y:(rank-.5)*sq}; };
   if(!mv) return;
   if(a?.bestUci && (explainMode==='best' || explainMode==='normal')){ const from=coord(a.bestUci.slice(0,2)), to=coord(a.bestUci.slice(2,4)); addArrow(svg,from,to,'var(--primary-on-dark)'); }
   if(a?.afterBestUci && explainMode==='threat'){ const from=coord(a.afterBestUci.slice(0,2)),to=coord(a.afterBestUci.slice(2,4)); addArrow(svg,from,to,'var(--status-danger)'); }
   const p=coord(mv.to); const vis=CLASS_VIS[a?.classification||'good']||CLASS_VIS.good;
   const badge=document.createElement('div'); badge.className='piece-badge'; badge.style.background=vis.bg==='transparent'?'transparent':vis.bg; badge.style.color='var(--body-on-dark)'; badge.textContent=vis.symbol; badge.style.left=(p.x-16)+'px'; badge.style.top=(p.y-16)+'px'; svg.parentElement.querySelector('.badge-layer').appendChild(badge); setTimeout(()=>badge.style.opacity='1',10);
 }
 function addArrow(svg,from,to,color){ const NS='http://www.w3.org/2000/svg'; const line=document.createElementNS(NS,'line'); line.setAttribute('x1',from.x); line.setAttribute('y1',from.y); line.setAttribute('x2',to.x); line.setAttribute('y2',to.y); line.setAttribute('stroke',color); line.setAttribute('stroke-width','7'); line.setAttribute('stroke-linecap','round'); line.setAttribute('opacity','.92'); svg.appendChild(line); }

 async function refreshSavedGames(){ if(!authUser)return; const r=await getJson('/api/sync'); if(r.ok&&r.data?.ok) setSavedGames(r.data.games||[]); }
 function saveGameToAccount(text,n){ if(!authUser)return; const hd=(k)=>((String(text).match(new RegExp('\\['+k+' "([^"]*)"\\]'))||[])[1]||''); fetch('/api/sync',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({pgn:text,meta:{white:hd('White'),black:hd('Black'),result:hd('Result'),moves:n,source:'upload'}})}).then(()=>refreshSavedGames()).catch(()=>{}); }
 async function openSavedGame(id){ const r=await getJson('/api/sync?game='+encodeURIComponent(id)); if(r.ok&&r.data?.game?.pgn){ setPage('review'); try{ const {hist,c}=makeBoardState(r.data.game.pgn); setPgn(r.data.game.pgn); setMoveClocks(extractClockTags(r.data.game.pgn)); setActiveArchiveGame(null); setGame(c); setHistory(hist); setSelected(hist.length?0:-1); setAnalysis(null); setStatus('נטען משחק שמור.'); }catch{ setStatus('לא הצלחתי לטעון את המשחק השמור.'); } } }
 async function syncBotProgress(idx){ if(!authUser)return; const r=await getJson('/api/sync'); if(!r.ok||!r.data?.ok)return; const prog=r.data.progress&&typeof r.data.progress==='object'?r.data.progress:{}; prog.bot=Math.max(Number(prog.bot)||0,idx); await fetch('/api/sync',{method:'PUT',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({progress:prog})}).catch(()=>{}); }
 useEffect(()=>{
   const userId=authUser?.id;
   setSyncSettingsUserId(null);
   if(!userId)return;
   let cancelled=false;
   (async()=>{
     const r=await getJson('/api/sync');
     if(cancelled)return;
     if(!(r.ok&&r.data?.ok)){setAccountSyncStatus('error');return;}
     setSavedGames(r.data.games||[]);
     const previousOwner=localStorage.getItem(ACCOUNT_SYNC_OWNER_KEY);
     const mayImportLocal=!previousOwner||previousOwner===userId;
     const remoteProgress=r.data.progress||{};
     const localProgress=mayImportLocal?readLocalProgress():{};
     const mergedProgress=mergeProgress(localProgress,remoteProgress);
     writeLocalProgress(mergedProgress);
     const remoteBot=Math.max(0,Math.floor(Number(mergedProgress.bot)||0));
     if(!mayImportLocal){try{localStorage.setItem(BOT_PROGRESS_KEY,String(remoteBot));writeLocalProgress({...mergedProgress,bot:remoteBot});}catch{}setBotUnlockedIndexState(remoteBot);}
     if(remoteBot>getBotUnlockedIndex()){setBotUnlockedIndex(remoteBot);setBotUnlockedIndexState(remoteBot);}
     else if(getBotUnlockedIndex()>remoteBot&&mayImportLocal){mergedProgress.bot=getBotUnlockedIndex();fetch('/api/sync',{method:'PUT',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({progress:mergedProgress})}).catch(()=>{});}
     let localReviews={};try{localReviews=JSON.parse(localStorage.getItem('veyra_archive_reviews_v1')||'{}')||{};}catch{}
     const localState=mayImportLocal?{archiveReviews:localReviews,usernames:{chesscom:localStorage.getItem('chesscom_username')||'',lichess:localStorage.getItem('lichess_username')||''},language:getLang(),adaptiveOptIn:isAdaptiveOptedIn()}:{archiveReviews:{},usernames:{chesscom:'',lichess:''},language:r.data.appState?.language||getLang(),adaptiveOptIn:false};
     const merged=mergeAccountState(localState,r.data.appState||{});
     setArchiveReviews(merged.archiveReviews);
     try{localStorage.setItem('veyra_archive_reviews_v1',JSON.stringify(merged.archiveReviews));}catch{}
     setUsername(merged.usernames?.chesscom||'');
     setLichessUsername(merged.usernames?.lichess||'');
     try{localStorage.setItem('chesscom_username',merged.usernames?.chesscom||'');localStorage.setItem('lichess_username',merged.usernames?.lichess||'');}catch{}
     if(merged.language&&merged.language!==getLang())setLang(merged.language);
     if(typeof merged.adaptiveOptIn==='boolean'){setAdaptiveOptIn(merged.adaptiveOptIn);setAdaptiveOptInState(merged.adaptiveOptIn);}
     try{localStorage.setItem(ACCOUNT_SYNC_OWNER_KEY,userId);}catch{}
     setSyncSettingsUserId(userId);
     setAccountSyncStatus('synced');
     if(!r.data.appState||JSON.stringify(r.data.appState)!==JSON.stringify(merged)){
       const saved=await fetch('/api/sync',{method:'PUT',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({appState:merged})});
       if(!cancelled)setAccountSyncStatus(saved.ok?'synced':'error');
     }
   })().catch(()=>{if(!cancelled)setAccountSyncStatus('error');});
   return()=>{cancelled=true;clearTimeout(accountSyncTimer.current);};
 },[authUser?.id]);
 useEffect(()=>{
   const onLanguage=(event)=>setAccountLanguage(event.detail==='en'?'en':'he');
   window.addEventListener('tabia-language-change',onLanguage);
   return()=>window.removeEventListener('tabia-language-change',onLanguage);
 },[]);
 useEffect(()=>{
   try{localStorage.setItem('chesscom_username',username);localStorage.setItem('lichess_username',lichessUsername);localStorage.setItem('veyra_archive_reviews_v1',JSON.stringify(archiveReviews));}catch{}
   if(!authUser?.id||syncSettingsUserId!==authUser.id)return;
   setAccountSyncStatus('saving');
   clearTimeout(accountSyncTimer.current);
   accountSyncTimer.current=setTimeout(async()=>{
     const appState={version:1,archiveReviews,usernames:{chesscom:username.trim().slice(0,100),lichess:lichessUsername.trim().slice(0,100)},language:accountLanguage,adaptiveOptIn};
     try{const result=await fetch('/api/sync',{method:'PUT',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({appState})});setAccountSyncStatus(result.ok?'synced':'error');}catch{setAccountSyncStatus('error');}
   },700);
   return()=>clearTimeout(accountSyncTimer.current);
 },[authUser?.id,syncSettingsUserId,archiveReviews,username,lichessUsername,accountLanguage,adaptiveOptIn]);
 function loadPgnText(text){
   try{ const {hist,c}=makeBoardState(text); setPgn(text); setMoveClocks(extractClockTags(text)); setActiveArchiveGame(null); setGame(c); setHistory(hist); setSelected(hist.length?0:-1); setAnalysis(null); setStatus(`נטען ${hist.length} מהלכים.`); saveGameToAccount(text,hist.length); return true; }
   catch(e){ setStatus('לא הצלחתי לקרוא את ה-PGN הזה.'); return false; }
 }
 async function loadPgn(){ loadPgnText(pgn); }

 async function analyze(){
   if(!history.length){setStatus('טען משחק לפני ניתוח.');return;}
   setAnalyzing(true); setStatus('מנתח...');
   let openings=[]; try{const r=await fetch('/data/openings.json'); if(r.ok) openings=await r.json();}catch{}
   const openingSet=new Set<string>(openings.map(x=>String(x.m||'').trim()).filter(Boolean));
   let results;
   try{
     results=await analyzeGameMoves(history,{Chess,analyzePosition,openingLines:openingSet,onMoveAnalyzed:(i,total)=>setStatus(`מנתח ${i+1}/${total}`)});
   }catch(e){const ply=Number((e as any)?.moveIndex)||0;setAnalysis(null);setAnalyzing(false);setStatus(`הניתוח נעצר במהלך ${ply+1}: לא התקבלה תוצאת מנוע מלאה.`);return;}
   const summary=computeReviewSummary(results);
   setAnalysis({moves:results,summary});
   if(activeArchiveGame?.id){
     try {
       const accuracy=Number(activeArchiveGame.playerColor==='black'?summary.blackAcc:summary.whiteAcc);
       if(Number.isFinite(accuracy)){
         const next={...archiveReviews,[activeArchiveGame.id]:{accuracy,reviewedAt:new Date().toISOString()}};
         localStorage.setItem('veyra_archive_reviews_v1',JSON.stringify(next));
         setArchiveReviews(next);
         if(authUser?.id){
           setAccountSyncStatus('saving');
           fetch('/api/sync',{
             method:'PUT',
             credentials:'same-origin',
             headers:{'content-type':'application/json'},
             body:JSON.stringify({appState:{
               version:1,
               archiveReviews:next,
               usernames:{chesscom:username.trim().slice(0,100),lichess:lichessUsername.trim().slice(0,100)},
               language:accountLanguage,
               adaptiveOptIn
             }})
           }).then(r=>setAccountSyncStatus(r.ok?'synced':'error')).catch(()=>setAccountSyncStatus('error'));
         }
       }
     } catch {}
   }
   setAnalyzing(false); setStatus('הניתוח הסתיים.'); setSelected(0); postJson('/api/auth',{action:'training',eventType:'game_review',payload:{moveCount:results.length,summary,source:'review'}}).catch(()=>{});
   if(isAdaptiveOptedIn()){const counts={};for(const row of results){const key=row.classification||'unknown';counts[key]=(counts[key]||0)+1;}for(const [key,count] of Object.entries(counts)){adaptiveSignal({principle:key==='blunder'?'calculation':key==='inaccuracy'?'piece_activity':'unknown',phase:'review',severity:Math.min(1000,Number(count)*25)});}}
 }
 async function analyzePosition(fen,afterFen,mover,cachedBefore=undefined,alternatives=undefined){
   const worker=await getEngineWorker();
   return new Promise((resolve,reject)=>{ const id=Math.random().toString(36).slice(2); let done=false; const finish=(fn,value)=>{if(done)return;done=true;worker.removeEventListener('message',handler);clearTimeout(timer);fn(value);}; const handler=(e)=>{ if(e.data?.id!==id)return; if(e.data.error)finish(reject,new Error(e.data.error)); else finish(resolve,e.data.result); }; const timer=setTimeout(()=>finish(reject,new Error('analysis timeout')),9000); worker.addEventListener('message',handler); worker.postMessage({id,fen,afterFen,mover:{from:mover.from,to:mover.to,promotion:mover.promotion||null},cachedBefore,alternatives}); });
 }
 let workerPromise=null;
 function getEngineWorker(){
   if(workerPromise)return workerPromise;
   workerPromise=new Promise((resolve,reject)=>{
     const w=new Worker('/engine-worker.js');let settled=false;
     const cleanup=()=>{w.removeEventListener('message',onReady);w.removeEventListener('error',onError);clearTimeout(bootTimer);};
     const fail=error=>{if(settled)return;settled=true;cleanup();w.terminate();workerPromise=null;reject(error);};
     const onReady=e=>{if(e.data==='ready'){if(settled)return;settled=true;cleanup();resolve(w);}else if(e.data?.type==='boot-error')fail(new Error(e.data.error||'Engine boot failed'));};
     const onError=()=>fail(new Error('Engine worker failed during initialization.'));
     const bootTimer=setTimeout(()=>fail(new Error('Engine initialization timed out. Try again.')),10000);
     w.addEventListener('message',onReady);w.addEventListener('error',onError);
   });
   return workerPromise;
 }


 async function fetchArchive(){
   const currentUsername=archiveProvider==='chesscom'?username.trim():lichessUsername.trim();
   if(!currentUsername){setArchiveError('הכנס שם משתמש לפני טעינת המשחקים.');setArchiveWarning('');return;}
   setArchiveLoading(true);setArchiveError('');setArchiveWarning('');
   try{
     const result=await fetchArchiveGames(archiveProvider,currentUsername,100);
     setArchiveGames(result.games||[]);
     setArchiveWarning(result.warning||'');
     setArchiveLoadedProvider(archiveProvider);
     try{localStorage.setItem(archiveProvider==='chesscom'?'chesscom_username':'lichess_username',currentUsername);}catch{}
     if(!result.games?.length)setArchiveError('לא נמצאו משחקים ציבוריים בחשבון הזה.');
   }catch(error){
     setArchiveGames([]);
     setArchiveError(String(error?.message||'טעינת המשחקים נכשלה. אפשר לנסות שוב.'));
   }finally{setArchiveLoading(false);}
 }

 async function dnaFingerprint(pgnText){
   if(!window.crypto?.subtle)throw new Error('הדפדפן לא תומך בחישוב טביעת אצבע מאובטחת ל-PGN.');
   const normalized=normalizePgnForDnaFingerprint(pgnText);
   const digest=await window.crypto.subtle.digest('SHA-256',new TextEncoder().encode(normalized));
   return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
 }
 async function openStatsPage(){
   const requestId=++dnaLoadRequestRef.current;
   setPage('stats');setDnaReport(null);setDnaError('');setDnaStatus('');setStatsLoading(false);
   const ownerId=authUser?.id;
   if(!ownerId){setDnaError('צריך להתחבר לחשבון כדי לטעון סטטיסטיקות שמורות.');return;}
   setStatsLoading(true);setDnaStatus('טוען סטטיסטיקות שמורות מהחשבון...');
   const response=await dnaRequest('/api/chess-dna?action=latest',{timeoutMs:15000});
   if(dnaOwnerRef.current!==ownerId||dnaLoadRequestRef.current!==requestId)return;
   setStatsLoading(false);setDnaStatus('');
   if(response.ok&&response.data?.report?.report_json){
     setDnaReport(response.data.report.report_json);
     setDnaStatus('הסטטיסטיקות מחושבות מדוח DNA שמור. לא בוצע ניתוח מנוע נוסף.');
   }else if(response.status===401){
     setDnaReport(null);setDnaError('צריך להתחבר מחדש כדי לטעון סטטיסטיקות שמורות.');
   }else if(!response.ok){
     setDnaError('לא הצלחתי לטעון את הסטטיסטיקות השמורות. אפשר לנסות שוב.');
   }else{
     setDnaReport(null);setDnaStatus('עדיין אין דוח DNA שמור בחשבון. צרו דוח DNA כדי להתחיל.');
   }
 }
 async function openDnaPage(){
   const requestId=++dnaLoadRequestRef.current;
   setPage('dna');setDnaError('');setDnaStatus('');setStatsLoading(false);
   const ownerId=authUser?.id;
   if(!ownerId)return;
   const response=await dnaRequest('/api/chess-dna?action=latest',{timeoutMs:15000});
   if(dnaOwnerRef.current!==ownerId||dnaLoadRequestRef.current!==requestId)return;
   if(response.ok&&response.data?.report?.report_json){
     setDnaReport(response.data.report.report_json);
     setDnaStatus('נטען הדוח השמור האחרון מהשרת.');
   }else if(response.status===401){
     setDnaError('צריך להתחבר לחשבון כדי לטעון דוח DNA שמור.');
   }else if(!response.ok){
     setDnaError('לא הצלחתי לטעון את הדוח השמור. אפשר לנסות שוב.');
   }
 }
 async function runDnaReview(){
   if(!authUser?.id){setDnaError('צריך להתחבר לחשבון כדי לשמור ניתוחים ודוח DNA.');return;}
   if(dnaRunLockRef.current)return;
   dnaLoadRequestRef.current++;
   setStatsLoading(false);
   dnaRunLockRef.current=true;
   const runOwnerId=authUser.id;
   let totalGames=0;let completedGames=0;let reusedCount=0;let analyzedCount=0;
   dnaCancelRef.current=false;
   setDnaRunning(true);setDnaError('');setDnaProgress({done:0,total:0});setDnaStatus('טוען משחקים ומכין את בחירת המשחקים...');
   try{
     const assertSameDnaOwner=()=>{if(dnaCancelRef.current)throw new Error('הניתוח בוטל. משחקים שכבר נשמרו יישארו זמינים לניסיון הבא; דוח חלקי לא נשמר.');if(dnaOwnerRef.current!==runOwnerId)throw new Error('החשבון השתנה במהלך הניתוח. התהליך נעצר כדי למנוע ערבוב נתונים בין חשבונות.');};
     assertSameDnaOwner();
     const currentUsername=archiveProvider==='chesscom'?username.trim():lichessUsername.trim();
     if(!currentUsername)throw new Error('הכנס שם משתמש של Chess.com או Lichess לפני יצירת הדוח.');
     const fetched=await fetchArchiveGames(archiveProvider,currentUsername,1000);
     const sourceGames=fetched.games||[];
     if(fetched.warning)setDnaStatus(fetched.warning);
     const selection=selectLatestDnaGames((sourceGames||[]).filter(g=>g.source!=='demo'),25);
     const chosen=[...selection.selected.bullet,...selection.selected.blitz,...selection.selected.rapid];
     totalGames=chosen.length;
     setDnaProgress({done:0,total:chosen.length});
     if(!chosen.length)throw new Error('לא נמצאו משחקים עם סוג זמן אמין מסוג Bullet, Blitz או Rapid. בדוק ששם המשתמש נכון ושנתוני המשחקים כוללים סוג זמן.');
     const identified=[];
     for(const game of chosen)identified.push({...game,fingerprint:await dnaFingerprint(game.pgn)});
     const cached=new Map<string,any>();
     for(let start=0;start<identified.length;start+=5){
       assertSameDnaOwner();
       const batch=identified.slice(start,start+5);
       const fingerprintList=batch.map(game=>game.fingerprint).join(',');
       const cacheUrl='/api/chess-dna?action=games&fingerprints='+encodeURIComponent(fingerprintList)+'&engineVersion='+encodeURIComponent(DNA_ENGINE_VERSION)+'&analysisVersion='+DNA_ANALYSIS_SCHEMA_VERSION;
       const cacheResponse=await dnaRequest(cacheUrl,{timeoutMs:20000});
       if(!cacheResponse.ok)throw new Error(cacheResponse.status===401?'צריך להתחבר מחדש כדי לטעון ניתוחים שמורים.':'לא הצלחתי לבדוק ניתוחים שמורים בשרת; לא אסמן ניתוח מקומי כאילו נשמר.');
       for(const row of cacheResponse.data?.games||[])cached.set(row.fingerprint,row.game_json);
     }
     let openings=[];try{const response=await fetch('/data/openings.json');if(response.ok)openings=await response.json();}catch{}
     const openingSet=new Set((Array.isArray(openings)?openings:[]).map(row=>String(row.m||'').trim()).filter(Boolean));
     const analyzed=[];
     for(let index=0;index<identified.length;index++){
       assertSameDnaOwner();
       const archived=identified[index];
       const stored=cached.get(archived.fingerprint);
       const cachedAnalysisValid=Boolean(stored?.analysis&&Array.isArray(stored.analysis.moves)&&stored.analysis.summary);
       let gameAnalysis=cachedAnalysisValid?stored.analysis:null;
       if(cachedAnalysisValid)reusedCount++;else{
         setDnaStatus('מנתח משחק '+(index+1)+' מתוך '+identified.length+' ('+archived.timeClass+').');
         const parsed=makeBoardState(archived.pgn);
         const moves=parsed.hist||[];
         if(!moves.length)throw new Error('המשחק '+archived.id+' לא מכיל מהלכים שאפשר לנתח.');
         const clockTags=extractClockTags(archived.pgn);
         const parsedClockSeconds=clockTags.map(dnaClockSeconds);
         const clockSeconds=clockTags.length===moves.length&&parsedClockSeconds.every(value=>value!==null)?parsedClockSeconds:[];
         let analyzedMoves;
         try{
           analyzedMoves=await analyzeGameMoves(moves,{Chess,analyzePosition,openingLines:openingSet,beforeMove:()=>assertSameDnaOwner()});
         }catch(error){
           if(error instanceof ReviewAnalysisError&&error.reason==='illegal-move')throw new Error('נמצא מהלך לא חוקי במשחק '+archived.id+'.');
           throw error instanceof ReviewAnalysisError&&error.reason==='engine'?error.cause:error;
         }
         const results=analyzedMoves.map(row=>({...row,clockSeconds:clockSeconds.length?clockSeconds[row.index]:null}));
         gameAnalysis={moves:results,summary:computeReviewSummary(results)};
         assertSameDnaOwner();
         const saveGame=await dnaRequest('/api/chess-dna',{method:'POST',timeoutMs:30000,body:{action:'save-game',fingerprint:archived.fingerprint,pgn:archived.pgn,game:{date:archived.date,timeClass:archived.timeClass,playerColor:archived.playerColor,source:archived.source,analysis:gameAnalysis}}});
         if(!saveGame.ok)throw new Error('הניתוח של משחק '+(index+1)+' הושלם במחשב אך השמירה בשרת נכשלה. הדוח לא יסומן כהושלם; אפשר לנסות שוב.');
         analyzedCount++;
       }
       if(stored&&gameAnalysis&&(stored.timeClass!==archived.timeClass||stored.playerColor!==archived.playerColor||stored.date!==archived.date||stored.source!==archived.source)){
         assertSameDnaOwner();
         const refreshed=await dnaRequest('/api/chess-dna',{method:'POST',timeoutMs:30000,body:{action:'save-game',fingerprint:archived.fingerprint,pgn:archived.pgn,game:{date:archived.date,timeClass:archived.timeClass,playerColor:archived.playerColor,source:archived.source,analysis:gameAnalysis}}});
         if(!refreshed.ok)throw new Error('הניתוח השמור קיים, אך עדכון פרטי המשחק בשרת נכשל. הדוח לא יסומן כהושלם.');
       }
       analyzed.push({...archived,analysis:gameAnalysis});
       completedGames=index+1;
       setDnaProgress({done:index+1,total:identified.length});
     }
     const report:any=buildDnaReport(analyzed);
     report.selection=selection.counts;
     report.execution={selected:identified.length,reused:reusedCount,analyzed:analyzedCount,failed:0,saved:analyzed.length};
     report.source={provider:archiveProvider,username:currentUsername,warning:fetched.warning||''};
     assertSameDnaOwner();
     const reportId=window.crypto.randomUUID();
     const saveReport=await dnaRequest('/api/chess-dna',{method:'POST',timeoutMs:30000,body:{action:'save-report',reportId,report}});
     setDnaReport(report);
     if(!saveReport.ok){
       setDnaError('הניתוח הושלם, אך שמירת דוח הסיכום בשרת נכשלה. הדוח מוצג זמנית ואינו נחשב לדוח שמור.');
       setDnaStatus('הדוח חושב מקומית; השמירה לא אושרה על ידי השרת.');
       return;
     }
     setDnaStatus('הדוח נשמר בשרת. ניתוחי המשחקים שנשמרו יתאימו לשימוש חוזר רק אם ה-PGN, גרסת המנוע וגרסת הניתוח זהים.');
   }catch(error){
     setDnaError(String(error?.message||error||'יצירת דוח DNA נכשלה.'));
     setDnaStatus('הדוח לא הושלם. '+completedGames+' מתוך '+totalGames+' משחקים עובדו בהצלחה; אם אירעה שגיאת שמירה, ניתוחים שכבר נשמרו יוכלו לשמש בניסיון הבא.');
   }finally{dnaRunLockRef.current=false;setDnaRunning(false);}
 }

 function importGame(g){
   if(!g?.pgn){setStatus('למשחק הזה אין PGN זמין.');setArchiveError('המשחק שנבחר לא מכיל PGN תקין.');return;}
   const loaded=loadPgnText(g.pgn);
   if(!loaded){setArchiveError('לא הצלחתי לטעון את המשחק שנבחר ללוח. נסה שוב או בחר משחק אחר.');return;}
   setActiveArchiveGame(g?.id?{id:g.id,playerColor:g.playerColor||'white'}:null);
   setPage('review');
 }
 async function adminLogin(){const r=await postJson('/api/admin-auth',{password:adminPassword});if(r.ok&&r.data?.authenticated){setIsAdmin(true);setAdminEmail(r.data.email||'');setAdminPassword('');setStatus('נכנסת כאדמין.');setPage('admin');return;}setStatus(r.data?.error==='admin_auth_not_configured'?'Admin עדיין לא מחובר לשרת. צריך להגדיר את משתני ה-Admin ב-Netlify.':'סיסמת Admin שגויה.');}
 async function adminLogout(){await fetch('/api/admin-auth',{method:'DELETE',credentials:'same-origin'}).catch(()=>{});setIsAdmin(false);setAdminEmail('');setPage('review');}
 async function openAdminStats(){const r=await getJson('/api/admin-stats');setAdminStats(r.data||null);await loadAccessRequests();}
 async function loadAccessRequests(){const r=await getJson('/api/admin-access');setAccessRequests(r.ok&&Array.isArray(r.data?.requests)?r.data.requests:[]);}
 async function approveAccess(id:string){const r=await postJson('/api/admin-access',{id,decision:'approve'});if(r.ok&&r.data?.code){setIssuedCodes(prev=>({...prev,[id]:{code:r.data.code,expiresAt:r.data.expiresAt}}));await loadAccessRequests();setStatus(`הבקשה אושרה. הקוד נוצר בצד השרת: ${r.data.code}`);return;}setStatus('אישור בקשת הגישה נכשל.');}
 async function dismissAccessRequest(id:string){const r=await postJson('/api/admin-access',{id,decision:'reject'});if(r.ok&&r.data?.decision==='reject'){setAccessRequests(prev=>prev.filter(x=>x.id!==id));setIssuedCodes(prev=>{const next={...prev};delete next[id];return next;});setStatus('בקשת הגישה נדחתה.');return;}setStatus('דחיית בקשת הגישה נכשלה.');}
 async function saveAdminBot(){if(!adminBotSlug||!adminBotDraft)return;const r=await postJson('/api/admin-bots',{slug:adminBotSlug,payload:adminBotDraft});if(r.ok){setStatus('השינויים נשמרו בשרת.');const rr=await getJson('/api/bots');if(rr.ok&&Array.isArray(rr.data?.bots))setBots(rr.data.bots);}else setStatus(r.data?.error==='storage_not_configured'?'אחסון אדמין עדיין לא מחובר.':'שמירת השינויים נכשלה.');}
 function selectAdminBot(b){if(b)setAdminBotSlug(b.slug||'');if(b)setAdminBotDraft({...b});}
 function recordBotWin(botIndex){if(!Number.isInteger(botIndex)||botIndex<0)return;const next=Math.max(botUnlockedIndex,Math.min(bots.length-1,botIndex+1));if(next>botUnlockedIndex){setBotUnlockedIndex(next);setBotUnlockedIndexState(next);syncBotProgress(next);setStatus(`נפתח הבוט הבא: ${bots[next]?.name||'הבוט הבא'} 🎉`);}}
 function toggleAdaptive(v){setAdaptiveOptIn(v);setAdaptiveOptInState(v);setStatus(v?'שיפור המערכת הופעל. נשמרים סיגנלים מצטברים בלבד.':'שיפור המערכת כבוי.');}

 const currentA=analysis?.moves?.[selected]; const vis=CLASS_VIS[currentA?.classification||'good']||CLASS_VIS.good; const scoreCp=((currentA?.whiteChanceAfter??50)-50)/10; const scoreText=(Math.abs(scoreCp)<0.05?'0.00':`${scoreCp>0?'+':''}${scoreCp.toFixed(2)}`);
 const currentWhiteChance=currentA?.whiteChanceAfter ?? 50;

function summaryData(){ return analysis?.summary || {counts:{white:{},black:{}},whiteAcc:0,blackAcc:0,whiteRating:800,blackRating:800}; }

 if(!authReady) return h('div',{className:'app-shell auth-shell'},h('main',{className:'content auth-page'},h('section',{className:'auth-card center'},h('h1',null,getLang()==='en'?'Loading Veyra...':'טוען את Veyra...'))));
 if(!authConfigured) return h(SetupRequiredPage);
 const home=()=>h(HomePage,{signedIn:!!authUser,onSignIn:()=>{setAuthStage('auth');setAuthMode('login');},onNavigate:(destination:HomeDestination)=>destination==='dna'?openDnaPage():setPage(destination),createBoard:createHomeBoard,Brand:ProductBrand,LangButton:GlobalLanguageButton});
 if(authStage==='welcome') return home();
 if(authStage==='auth') return h(AuthPage,{mode:authMode,onModeChange:setAuthMode,onAuthed:(u)=>{setAuthUser(u);setAuthStage('app');setPage('home');},onVerify:(e)=>{setVerifyEmail(e);setAuthStage('verify');}});
 if(authStage==='verify') return h(VerifyPage,{email:verifyEmail,onBack:()=>setAuthStage('auth')});
 if(authStage==='account') return h(AccountPage,{user:authUser,onLogout:async()=>{await postJson('/api/auth',{action:'logout'});setAuthUser(null);setAuthStage('auth');setAuthMode('login');},onDeleted:()=>{setAuthUser(null);setAuthStage('welcome');try{localStorage.removeItem('tabia_onboarding_seen');}catch{}}});

 if(page==='home') return home();
 if(page==='stats'){
   const stats=buildDnaStatisticsOverview(dnaReport);
   const fmt=value=>value==null?'—':Number(value).toFixed(1)+'%';
   const labels={bullet:'Bullet',blitz:'Blitz',rapid:'Rapid'};
   return h('div',{className:'archive-root dna-root'},
     h('div',{className:'global-controls'},h(GlobalLanguageButton),h(GlobalAccountButton,{user:authUser,onOpen:()=>setAuthStage('account')})),
     h('header',{className:'topbar'},h(ProductBrand,{section:'Veyra Chess'}),h('div',{className:'top-actions'},
       h('button',{onClick:()=>setPage('archive')},'חזרה לארכיון'),
       h('button',{onClick:openDnaPage},'דוח DNA'))),
     h('main',{className:'dna-content','aria-busy':statsLoading},
       h('section',{className:'dna-hero'},h('span',{className:'archive-eyebrow'},'PLAYER STATISTICS'),h('h1',null,'הסטטיסטיקות שלך'),
         h('p',null,'המסך הזה משתמש בדוח DNA השמור בחשבון. הוא לא מריץ מנוע מחדש ולא שומר עותק נוסף של הניתוחים.')),
       h('section',{className:'dna-actions'},
         h('span',{className:'dna-status','aria-live':'polite'},dnaStatus),
         dnaError&&h('p',{className:'dna-error',role:'alert'},dnaError),
         h('button',{className:'archive-fetch-button',onClick:openStatsPage,disabled:statsLoading},dnaError?'נסה שוב':'רענון סטטיסטיקות')),
       !statsLoading&&!dnaError&&(stats.hasData?h(React.Fragment,null,
         h('section',{className:'dna-time-card dna-overview-card'},
           h('h2',null,'סיכום כללי'),
           h('div',{className:'dna-stat-grid'},
             h('div',{className:'dna-stat'},h('span',null,'משחקים שנכללו'),h('strong',null,String(stats.totalGames))),
             h('div',{className:'dna-stat'},h('span',null,'מהלכים של השחקן'),h('strong',null,String(stats.totalUserMoves))),
             h('div',{className:'dna-stat'},h('span',null,'Accuracy משוקלל לפי סוג זמן'),h('strong',null,fmt(stats.averageAccuracy))),
             h('div',{className:'dna-stat'},h('span',null,'Blunders ל־100 מהלכים'),h('strong',null,String(stats.issueRatesPer100Moves.blunder))),
             h('div',{className:'dna-stat'},h('span',null,'Mistakes ל־100 מהלכים'),h('strong',null,String(stats.issueRatesPer100Moves.mistake))),
             h('div',{className:'dna-stat'},h('span',null,'Misses ל־100 מהלכים'),h('strong',null,String(stats.issueRatesPer100Moves.miss))),
             h('div',{className:'dna-stat'},h('span',null,'Inaccuracies ל־100 מהלכים'),h('strong',null,String(stats.issueRatesPer100Moves.inaccuracy)))),
           h('p',{className:'dna-muted'},'ה־Accuracy הכללי משוקלל לפי מספר המשחקים בכל סוג זמן, על בסיס ממוצעי הסוגים המעוגלים בדוח.')),
         h('section',{className:'dna-time-controls'},(['bullet','blitz','rapid'] as const).map(key=>{
           const bucket=stats.perTimeControl[key];
           return h('article',{className:'dna-time-card',key},
             h('div',{className:'dna-time-card-header'},h('h2',null,labels[key]),h('span',{className:'dna-count'},bucket.games+' משחקים')),
             h('div',{className:'dna-stat-grid'},
               h('div',{className:'dna-stat'},h('span',null,'Accuracy ממוצע'),h('strong',null,fmt(bucket.averageAccuracy))),
               h('div',{className:'dna-stat'},h('span',null,'מהלכי השחקן'),h('strong',null,String(bucket.userMoves))),
               h('div',{className:'dna-stat'},h('span',null,'Blunders ל־100 מהלכים'),h('strong',null,String(bucket.issueRatesPer100Moves.blunder))),
               h('div',{className:'dna-stat'},h('span',null,'Mistakes ל־100 מהלכים'),h('strong',null,String(bucket.issueRatesPer100Moves.mistake)))),
             bucket.sampleIsSmall&&h('p',{className:'dna-sample-note'},'מדגם קטן: אין להסיק ממנו דפוס יציב.'),
             h('div',{className:'dna-classification-list'},['blunder','mistake','miss','inaccuracy','best','brilliant'].map(name=>
               h('div',{className:'dna-classification-row',key:name},h('span',null,name),h('strong',null,String(bucket.classificationCounts[name]||0))))));
         })),
         h('section',{className:'dna-time-card'},
           h('h2',null,'Blindfold'),
           h('p',{className:'dna-muted'},'נתוני Blindfold אינם נמצאים בדוח ניתוח המשחקים. כדי לחשב סטטיסטיקות אמינות צריך לשמור סיכומי אימון קומפקטיים, כמו שלב, תוצאה ומשך, ולא לנחש אותם מתוך משחקים רגילים. כרגע לא מוצגים מדדים שאין להם מקור נתונים מאומת.'),
           h('button',{className:'archive-fetch-button',onClick:openDnaPage},'פתיחת דוח DNA')),
       ):h('section',{className:'dna-time-card'},
         h('h2',null,'אין עדיין נתוני DNA שמורים'),
         h('p',{className:'dna-muted'},'צרו דוח DNA כדי שהסטטיסטיקות הכלליות יוכלו להשתמש בניתוחים השמורים במקום לחשב הכול מחדש.'),
         h('button',{className:'archive-fetch-button',onClick:openDnaPage},'יצירת דוח DNA')))
     )
   );
 }
 if(page==='dna'){
   const classes=[['bullet','Bullet'],['blitz','Blitz'],['rapid','Rapid']];
   const controls=dnaReport?.timeControls||{};
   const fmt=value=>value==null?'—':Number(value).toFixed(1)+'%';
   return h('div',{className:'archive-root dna-root'},
     h('div',{className:'global-controls'},h(GlobalLanguageButton),h(GlobalAccountButton,{user:authUser,onOpen:()=>setAuthStage('account')})),
     h('header',{className:'topbar'},h(ProductBrand,{section:'Veyra Chess'}),h('div',{className:'top-actions'},h('button',{onClick:()=>setPage('archive')},'חזרה לארכיון'),h('button',{onClick:()=>setPage('review')},'לוח וניתוח'))),
     h('main',{className:'dna-content'},
       h('section',{className:'dna-hero'},h('span',{className:'archive-eyebrow'},'CHESS DNA'),h('h1',null,'דוח סגנון המשחק שלך'),h('p',null,'ניתוח מבוסס מנוע של המשחקים האחרונים. כל סוג זמן מחושב בנפרד, והדוח לא יסומן כשמור אם השרת לא אישר את השמירה.')),
       h('section',{className:'dna-actions'},
         h('button',{className:'archive-fetch-button',disabled:dnaRunning,onClick:runDnaReview},dnaRunning?'מנתח ושומר…':'יצירת / עדכון דוח DNA'),
         dnaRunning&&h('button',{className:'dna-cancel-button',onClick:()=>{dnaCancelRef.current=true;setDnaStatus('עוצר אחרי העמדה הנוכחית...');}},'ביטול ניתוח'),
         h('span',{className:'dna-status','aria-live':'polite'},dnaStatus),
         dnaRunning&&h('div',{className:'dna-progress'},h('div',{className:'dna-progress-track'},h('div',{className:'dna-progress-fill',style:{width:(dnaProgress.total?Math.round(dnaProgress.done/dnaProgress.total*100):0)+'%'}})),h('span',null,dnaProgress.done+' / '+dnaProgress.total+' משחקים')),
         dnaError&&h('p',{className:'dna-error',role:'alert'},dnaError)
       ),
       dnaReport&&h('section',{className:'dna-report'},
         h('div',{className:'dna-report-meta'},'גרסת דוח '+(dnaReport.schemaVersion||'—')+' · נוצר '+(dnaReport.generatedAt?new Date(dnaReport.generatedAt).toLocaleString('he-IL'):'תאריך לא זמין')),
         dnaReport.source?.warning&&h('p',{className:'dna-sample-note'},dnaReport.source.warning),
         h('div',{className:'dna-time-controls'},classes.map(([key,label])=>{
           const bucket=controls[key]||{};
           const openings=Array.isArray(bucket.openings)?bucket.openings:[];
           return h('article',{className:'dna-time-card',key},
             h('div',{className:'dna-time-card-header'},h('h2',null,label),h('span',{className:'dna-count'},(bucket.count||0)+' / 25 משחקים')),
             h('div',{className:'dna-stat-grid'},
               h('div',{className:'dna-stat'},h('span',null,'Accuracy ממוצע'),h('strong',null,fmt(bucket.averageAccuracy))),
               h('div',{className:'dna-stat'},h('span',null,'מהלכי השחקן'),h('strong',null,String(bucket.userMoves||0))),
               h('div',{className:'dna-stat'},h('span',null,'טעויות גסות ל־100 מהלכים'),h('strong',null,String(bucket.issueRatesPer100Moves?.blunder??0))),
               h('div',{className:'dna-stat'},h('span',null,'טעויות ל־100 מהלכים'),h('strong',null,String(bucket.issueRatesPer100Moves?.mistake??0))),
               h('div',{className:'dna-stat'},h('span',null,'מהלכים בשעון נמוך מתוך מהלכים עם נתוני שעון'),h('strong',null,bucket.clock?.lowTimeRatePer100Moves==null?'—':String(bucket.clock.lowTimeRatePer100Moves)+'%'))
             ),
             bucket.count<5&&h('p',{className:'dna-sample-note'},'מדגם קטן: אין להסיק ממנו דפוס יציב.'),
             bucket.clock?.lowTimeRatePer100Moves==null&&h('p',{className:'dna-muted'},'אין נתוני שעון מלאים מספיקים למדד ניהול זמן.'),
             h('h3',null,'פתיחות נפוצות'),
             openings.length?h('ol',{className:'dna-opening-list'},openings.slice(0,5).map(item=>h('li',{key:item.name},h('span',null,item.name),h('strong',null,String(item.games))))):h('p',{className:'dna-muted'},'אין מספיק נתונים לפתיחות.'),
             h('h3',null,'איכות המהלכים שלך'),
             h('div',{className:'dna-classification-list'},['blunder','miss','mistake','inaccuracy','best','brilliant'].map(name=>h('div',{className:'dna-classification-row',key:name},h('span',null,name),h('strong',null,String(bucket.classificationCounts?.[name]||0)))))
           );
         })),
         dnaReport.execution&&h('p',{className:'dna-report-meta'},'עיבוד: '+dnaReport.execution.selected+' נבחרו · '+dnaReport.execution.reused+' ניתוחים ממוחזרים · '+dnaReport.execution.analyzed+' נותחו מחדש · '+dnaReport.execution.failed+' נכשלו · '+dnaReport.execution.saved+' נשמרו'),
         dnaReport.selection&&h('details',{className:'dna-selection-details'},h('summary',null,'איך נבחרו המשחקים?'),h('p',null,'נבדקו '+dnaReport.selection.fetched+' משחקים; '+dnaReport.selection.duplicates+' כפילויות הוסרו, '+dnaReport.selection.excludedUnknownTimeClass+' משחקים הוחרגו כי סוג הזמן אינו ודאי, ו-'+dnaReport.selection.excludedInvalid+' משחקים נפסלו בגלל נתונים לא תקינים.')),
         h('p',{className:'dna-disclaimer'},'המדדים הם חישובים של Veyra על בסיס המנוע הקיים; הם אינם דירוג רשמי של Chess.com או Lichess.')
       )
     )
   );
 }

  if(page==='legends') return h(LegendsPage,{bots,onBack:()=>setPage('archive'),chooseBotMove,onBlindfold:()=>{setBlindfoldBotId('tal');setPage('blindfold');},onReview:(gamePgn)=>{try{const parsed=makeBoardState(gamePgn);setPgn(gamePgn);setMoveClocks(extractClockTags(gamePgn));setActiveArchiveGame(null);setGame(parsed.c);setHistory(parsed.hist);setSelected(parsed.hist.length?0:-1);setAnalysis(null);setStatus('משחק האגדות נטען לסקירה הרגילה.');setPage('review');}catch{setStatus('לא הצלחתי להעביר את משחק האגדות לסקירה.');}}});
   if(page==='blindfold') return h(BlindfoldTrainingPage,{bots,initialBotId:blindfoldBotId,onBack:()=>setPage('archive'),chooseBotMove,onReview:(gamePgn)=>{try{const parsed=makeBoardState(gamePgn);setPgn(gamePgn);setMoveClocks(extractClockTags(gamePgn));setActiveArchiveGame(null);setGame(parsed.c);setHistory(parsed.hist);setSelected(parsed.hist.length?0:-1);setAnalysis(null);setStatus('משחק השחמט העיוור נטען לסקירה רגילה.');setPage('review');}catch{setStatus('לא הצלחתי להעביר את המשחק לסקירה.');}}});
 if(page==='archive'){
   const dayKeys=Array.from(new Set(archiveGames.map(g=>g.date||'unknown')));
   const formatArchiveDay=(day)=>day==='unknown'?'תאריך לא ידוע':new Date(day+'T12:00:00').toLocaleDateString('he-IL',{day:'numeric',month:'long',year:'numeric'});
   const resultLabel=(result)=>result==='win'?'ניצחון':result==='loss'?'הפסד':result==='draw'?'תיקו':'תוצאה לא ידועה';
   const renderArchiveCard=(g,demo=false)=>h('article',{key:g.id,className:'archive-game-card '+(g.result==='win'?'is-win':g.result==='loss'?'is-loss':'is-draw')+(demo?' archive-demo-game':'')},
     h('span',{className:'archive-result-bar','aria-hidden':true}),
     h('div',{className:'archive-card-info'},
       h('div',{className:'archive-card-title'},h('strong',null,g.opponent||'יריב לא ידוע'),h('span',{className:'archive-opponent-rating'},g.opponentRating?'('+g.opponentRating+')':'(דירוג לא זמין)'),h('span',{className:'archive-result-pill '+(g.result==='win'?'is-win':g.result==='loss'?'is-loss':'is-draw')},resultLabel(g.result))),
       h('div',{className:'archive-card-meta'},
         h('span',null,(g.timeClass==='blitz'?'⚡':g.timeClass==='bullet'?'⌁':'⏱')+' '+(g.timeClass==='rapid'?'Rapid':g.timeClass==='blitz'?'Blitz':g.timeClass==='bullet'?'Bullet':g.timeClass==='classical'?'Classical':g.timeClass==='daily'?'Daily':'Chess')),
         h('span',null,'קצב '+(g.timeControlLabel||'לא ידוע')),
         h('span',null,(g.opening||'פתיחה לא זוהתה')),
         h('span',null,(g.moveCount||0)+' מהלכים'),
         h('span',null,(g.finishReason||'סיום לא ידוע'))
       ),
       archiveReviews[g.id]&&h('span',{className:'archive-accuracy-badge'},'Accuracy '+Number(archiveReviews[g.id].accuracy).toFixed(1)+'%'),
       demo&&h('span',{className:'archive-demo-label'},'משחק דוגמה — לא נמשך מחשבון אמיתי')
     ),
     h('button',{className:'archive-analyze-button',onClick:()=>importGame(g)},'Analyze →')
   );
   const activeUsername=archiveProvider==='chesscom'?username:lichessUsername;
   return h('div',{className:'archive-root'},
     h('div',{className:'global-controls'},h(GlobalLanguageButton),h(GlobalAccountButton,{user:authUser,onOpen:()=>setAuthStage('account')})),
     h('header',{className:'topbar'},
       h(ProductBrand,{section:'Veyra Chess'}),
       h('div',{className:'top-actions'},
         h('span',{className:'sync-status',title:'סנכרון נתוני החשבון בין מכשירים'},accountSyncStatus==='saving'?'מסנכרן…':accountSyncStatus==='synced'?'מסונכרן':accountSyncStatus==='error'?'שגיאת סנכרון':''),
         h('button',{onClick:()=>setPage('home'),'data-home-return':true},getLang()==='en'?'Home':'בית'),
         h('button',{onClick:()=>setPage('review')},'לוח וניתוח'),
         h('button',{onClick:openDnaPage},'סקירת DNA'),
         h('button',{onClick:()=>setPage('daily-streak')},getLang()==='en'?'Daily streak':'רצף יומי'),
         h('button',{onClick:openStatsPage},'📊 סטטיסטיקות'),
         h('button',{onClick:()=>setPage('bots')},'🤖 בוטים'),h('button',{onClick:()=>setPage('legends')},'🏆 אגדות'),h('button',{onClick:()=>{setBlindfoldBotId(null);setPage('blindfold')}},'♟️ שחמט עיוור'),h('button',{onClick:()=>setPage('puzzles')},'🧩 פאזלים'),
         h('button',{onClick:()=>setPage('clock')},'⏱️ שעון'),h('button',{onClick:()=>{setBlindfoldBotId(null);setPage('blindfold')}},'♟️ שחמט עיוור'),h('button',{onClick:()=>setPage('openings')},'📚 פתיחות'),
         isAdmin&&h('button',{onClick:()=>setPage('admin')},'⚙️ Admin')
       )
     ),
     h('main',{className:'archive-content'},
       h('section',{className:'archive-hero'},
         h('span',{className:'archive-eyebrow'},'YOUR GAME ARCHIVE'),
         h('h1',null,'המשחקים שלך. בלי רעש.'),
         h('p',null,'חבר Chess.com או Lichess, מצא את המשחק שאתה מחפש, ולחץ Analyze כדי לפתוח אותו בלוח ובמאמן הקיימים.')
       ),
       h('section',{className:'archive-search-panel'},
         h('div',{className:'archive-provider-tabs'},
           h('button',{className:archiveProvider==='chesscom'?'active':'',onClick:()=>{setArchiveProvider('chesscom');setArchiveGames([]);setArchiveError('');setArchiveWarning('');setArchiveLoadedProvider('');}},'Chess.com'),
           h('button',{className:archiveProvider==='lichess'?'active':'',onClick:()=>{setArchiveProvider('lichess');setArchiveGames([]);setArchiveError('');setArchiveWarning('');setArchiveLoadedProvider('');}},'Lichess')
         ),
         h('div',{className:'archive-search-row'},
           h('label',{className:'archive-input-wrap'},h('span',null,'שם משתמש'),h('input',{value:activeUsername,onChange:e=>archiveProvider==='chesscom'?setUsername(e.target.value):setLichessUsername(e.target.value),placeholder:archiveProvider==='chesscom'?'Chess.com username':'Lichess username','aria-label':'שם משתמש',onKeyDown:e=>{if(e.key==='Enter')fetchArchive();}})),
           h('button',{className:'archive-fetch-button',disabled:archiveLoading,onClick:fetchArchive},archiveLoading?'טוען משחקים…':'טעינת 100 המשחקים האחרונים')
         ),
         h('div',{className:'archive-status','aria-live':'polite'},archiveLoading?'מתחבר לשירות ומביא משחקים…':archiveError?archiveError:archiveWarning?archiveWarning:archiveGames.length?'נטענו '+archiveGames.length+' משחקים מ-'+(archiveLoadedProvider==='lichess'?'Lichess':'Chess.com')+'.':'המשחקים ייטענו רק אחרי שתכניס שם משתמש.'),
         archiveError&&h('button',{className:'archive-retry-button',onClick:fetchArchive,disabled:archiveLoading},'נסה שוב')
       ),
       h('section',{className:'archive-section'},
         h('div',{className:'archive-section-heading'},h('h2',null,'הארכיון'),h('span',null,archiveGames.length?archiveGames.length+' משחקים':'המשחקים החדשים ביותר תחילה')),
         archiveGames.length?dayKeys.map(day=>{
           const group=archiveGames.filter(g=>(g.date||'unknown')===day);
           const wins=group.filter(g=>g.result==='win').length;
           const losses=group.filter(g=>g.result==='loss').length;
           const draws=group.filter(g=>g.result==='draw').length;
           return h('section',{className:'archive-day-group',key:day},
             h('div',{className:'archive-day-heading'},h('strong',null,formatArchiveDay(day)),h('span',{className:'archive-day-summary'},wins+'W | '+losses+'L'+(draws?' | '+draws+'D':''))),
             h('div',{className:'archive-game-list'},group.map(g=>renderArchiveCard(g,false)))
           );
         }):h('div',{className:'archive-empty-state'},h('strong',null,'עדיין אין משחקים להצגה'),h('p',null,'הכנס שם משתמש ולחץ על טעינת המשחקים. אפשר גם לבדוק את מסלול החיבור עם משחק הדוגמה למטה.'))
       ),
       h('section',{className:'archive-demo-section'},
         h('div',{className:'archive-section-heading'},h('h2',null,'בדיקת החיבור ללוח'),h('span',null,'Demo · לא נספר בארכיון החשבון')),
         h('div',{className:'archive-game-list'},renderArchiveCard(DEMO_ARCHIVE_GAME,true))
       ),
       authUser&&h('section',{className:'archive-saved-section'},
         h('div',{className:'archive-section-heading'},h('h2',null,'משחקים שמורים'),h('span',null,savedGames.length+' משחקים')),
         savedGames.length
           ? h('div',{className:'archive-game-list'},
               savedGames.map(g =>
                 h('article',{key:g.id,className:'archive-game-card is-draw'},
                   h('span',{className:'archive-result-bar','aria-hidden':true}),
                   h('div',{className:'archive-card-info'},
                     h('div',{className:'archive-card-title'},
                       h('strong',null,(g.meta?.black||'Black')+' vs '+(g.meta?.white||'White')),
                       h('span',{className:'archive-opponent-rating'},(g.created_at||'').slice(0,10))
                     ),
                     h('div',{className:'archive-card-meta'},h('span',null,'משחק ששמור בחשבון'))
                   ),
                   h('button',{className:'archive-analyze-button',onClick:()=>openSavedGame(g.id)},'פתח →')
                 )
               )
             )
           : h('div',{className:'archive-empty-state'},'אין עדיין משחקים שמורים.')
       )
     )
   );
 }
 if(page==='clock') return h(ChessClockPage,{onBack:()=>setPage('review')});
 if(page==='openings'||page==='daily-openings') return h(OpeningsPage,{user:authUser,onBack:()=>setPage(page==='daily-openings'?'daily-streak':'review')});
 if(page==='botgame') return h(BotGame,{bot:selectedBot||bots[0]||{name:'Bot',elo:300},botIndex:Math.max(0,bots.findIndex(b=>b.slug===selectedBot?.slug)),sideChoice:playerSide,minutes:clockMinutes,onGameFinished:({won,botIndex})=>{if(won){recordBotWin(botIndex);}},onReview:(gamePgn)=>{try{const parsed=makeBoardState(gamePgn);setPgn(gamePgn);setMoveClocks(extractClockTags(gamePgn));setActiveArchiveGame(null);setGame(parsed.c);setHistory(parsed.hist);setSelected(parsed.hist.length?0:-1);setAnalysis(null);setStatus('משחק הבוט נטען לסקירה.');setPage('review');}catch{setStatus('לא הצלחתי להעביר את משחק הבוט לסקירה.')}},onBack:()=>setPage('bots')});

 if(page==='daily-streak') return h(DailyStreakPage,{key:authUser?.id||'',userId:authUser?.id||'',onBack:()=>setPage('archive'),onPuzzles:()=>setPage('daily-puzzles'),onOpenings:()=>setPage('daily-openings'),Brand:ProductBrand,LangButton:GlobalLanguageButton});
 if(page==='puzzles'||page==='daily-puzzles') return h(PuzzlesPage,{onBack:()=>setPage('archive'),onDailyStreak:()=>setPage('daily-streak'),initialTab:page==='daily-puzzles'?'streak':undefined,Brand:ProductBrand,LangButton:GlobalLanguageButton,authUser});
 if(page==='bots') {
   const unlocked=Math.max(0,Math.min(Math.max(0,bots.length-1),botUnlockedIndex));
   return h('div',{className:'app-shell'},h('header',{className:'topbar'},h(ProductBrand,{section:'Veyra Chess'}),h('div',{className:'top-actions'},h('button',{onClick:()=>setPage('puzzles')},'🧩 פאזלים'),h('button',{onClick:()=>setPage('adaptive')},'🧠 Adaptive'),isAdmin&&h('button',{onClick:()=>setPage('admin')},'⚙️ Admin'),h('button',{onClick:()=>setPage('review')},'חזרה לסקירה'))),h('main',{className:'content bots-page'},h('div',{className:'hero-row bot-progress-hero'},h('div',null,h('span',{className:'eyebrow'},'BOT CAMPAIGN'),h('h1',null,'מתקדם מול יריבים'),h('p',{className:'muted'},`ניצחון על בוט פותח את הבא. כרגע פתוחים ${Math.min(bots.length,unlocked+1)} מתוך ${bots.length}.`)),h('div',{className:'bot-level-ring'},h('b',null,`${Math.min(bots.length,unlocked+1)}`),h('span',null,`/${bots.length}`))),h('div',{className:'bot-grid'},bots.map((b,i)=>{const locked=i>unlocked;return h('button',{key:b.name,className:'bot-card '+(selectedBot?.slug===b.slug?'selected ':'')+(locked?'locked':''),disabled:locked,onClick:()=>{setSelectedBot(b);setStatus(`בחרת את ${b.name}.`);telemetry('bot_game_started',{botIndex:i})}},h('div',{className:'bot-avatar',style:{background:locked?'var(--surface-tile-2)':palette(i)}},locked?'🔒':(b.piece||'♟')),h('div',{className:'bot-meta'},h('b',null,locked?'???':b.name),h('span',null,locked?'הבוט נעול':`${b.title} • ${b.elo} Elo`),h('small',null,locked?'נצח את הבוט הקודם כדי לפתוח אותו':(b.flavor||'')),h('small',{className:'bot-origin'},locked?'🔒':`${b.era||''} · ${b.region||''}`),h('small',{className:'bot-tier'},locked?'🔒':`${botStageLabel(b.tier)} • ${b.styleLabel||'אוניברסלי'}`)))})),h('section',{className:'bot-controls'},h('label',null,'הצד שלך',h('select',{value:playerSide,onChange:e=>setPlayerSide(e.target.value)},h('option',{value:'white'},'לבן'),h('option',{value:'black'},'שחור'),h('option',{value:'random'},'אקראי'))),h('label',null,'זמן',h('select',{value:clockMinutes,onChange:e=>setClockMinutes(Number(e.target.value))},h('option',{value:10},'10 דקות'),h('option',{value:5},'5 דקות'),h('option',{value:3},'3 דקות'))),h('button',{className:'primary',disabled:!selectedBot,onClick:()=>setPage('botgame')},selectedBot?'התחל משחק':'בחר בוט פתוח')),h('section',{className:'panel bot-campaign-note'},h('b',null,'חוק ההתקדמות'),h('p',{className:'muted'},'ברירת המחדל כרגע: ניצחון מול הבוט הנוכחי פותח את הבא. ההתקדמות נשמרת במכשיר שלך.'))));
 }

 if(page==='adaptive') {
   return h('div',{className:'app-shell'},h('div',{className:'global-controls'},h(GlobalLanguageButton),h(GlobalAccountButton,{user:authUser,onOpen:()=>setAuthStage('account')})),h('header',{className:'topbar'},h(ProductBrand,{section:'Adaptive Bots'}),h('div',{className:'top-actions'},isAdmin&&h('button',{onClick:()=>setPage('admin')},'⚙️ Admin'),h('button',{onClick:()=>setPage('bots')},'🤖 בוטים'),h('button',{onClick:()=>setPage('legends')},'🏆 אגדות'),h('button',{onClick:()=>setPage('review')},'סקירה'))),h('main',{className:'content adaptive-page'},h('section',{className:'hero-row'},h('div',null,h('span',{className:'eyebrow'},'LEARNING SYSTEM'),h('h1',null,'Adaptive Bots'),h('p',{className:'muted'},'המערכת יכולה ללמוד מדפוסים מצטברים של משתמשים ולהתאים את רמת האימון, בלי לשלוח PGN גולמי למודל המשותף.'))),h('section',{className:'adaptive-grid'},h('div',{className:'panel'},h('h2',null,'הפרופיל האישי שלך'),h('p',{className:'muted'},adaptiveOptIn?'שיפור המערכת פעיל. המערכת יכולה לשלוח סיגנלים מצטברים.':'שיפור המערכת כבוי. שום סיגנל Adaptive לא נשלח לשרת.'),h('label',{className:'toggle-row'},h('input',{type:'checkbox',checked:adaptiveOptIn,onChange:e=>toggleAdaptive(e.target.checked)}),h('span',null,'אפשר שיפור Adaptive')),h('div',{className:'adaptive-pill-row'},h('span',{className:'adaptive-pill'},adaptiveOptIn?'ON':'OFF'),h('span',{className:'muted'},'השליטה אצלך'))),h('div',{className:'panel'},h('h2',null,'מה הבוט לומד'),h('div',{className:'adaptive-list'},['עקרונות הטעויות שחוזרים אצלך','שלב המשחק שבו הטעות קורית','חומרת הטעות','קצב ההסתגלות לרמת היריב'].map(x=>h('div',{key:x},'✓ ',x))),h('p',{className:'muted'},'המערכת המשותפת מקבלת סיגנלים מצטברים בלבד.'))),h('section',{className:'panel'},h('h2',null,'למידה בין משתמשים'),h('p',{className:'muted'},'כאשר שיפור המערכת פעיל, סיגנלים מצטברים ממשתמשים שונים יכולים לשפר את התנהגות ה-Adaptive Bot.')),
     h('section',{className:'panel'},h('h2',null,'אבטחה ופרטיות'),h('p',{className:'muted'},'לפני פרסום מלא יש להשלים את audit האבטחה, הפרטיות וההרשאות בסביבת השרת האמיתית.'),h('a',{href:'/legal/privacy.html',target:'_blank'},'מדיניות פרטיות'))));
 }

 if(page==='windows') return h('div',{className:'app-shell'},h('div',{className:'global-controls'},h(GlobalLanguageButton),h(GlobalAccountButton,{user:authUser,onOpen:()=>setAuthStage('account')})),h('header',{className:'topbar'},h(ProductBrand,{section:'Windows'}),h('button',{onClick:()=>setPage('review')},'חזרה')),h('main',{className:'content'},h('section',{className:'hero-row'},h('div',null,h('span',{className:'eyebrow'},'WINDOWS'),h('h1',null,'Veyra Chess על Windows'),h('p',{className:'muted'},'אותה אפליקציה, עטופה כ-PWA כדי לא לשכפל את המוצר או הלוגיקה.')),h('div',{className:'top-actions'},h('a',{className:'button-link primary',href:'/download.html',target:'_blank'},'עמוד הורדה ל-Windows'))),h('section',{className:'panel'},h('h2',null,'איך זה עובד'),h('p',{className:'muted'},'המערכת נשארת מחוברת לאינטרנט ומשתמשת באותה שכבת backend ונתונים כמו גרסת הדפדפן.'))));

 if(page==='admin') {
   if(!isAdmin) return h('div',{className:'app-shell'},h('header',{className:'topbar'},h(ProductBrand,{section:'Admin'})),h('main',{className:'content'},h('section',{className:'panel admin-auth'},h('h1',null,'כניסת Admin'),h('p',{className:'muted'},'זיהוי המנהל נקבע בצד השרת. הדפדפן אינו בוחר את זהות ה־Admin.'),h('input',{value:adminPassword,onChange:e=>setAdminPassword(e.target.value),placeholder:'Admin password',type:'password',autoComplete:'current-password'}),h('button',{className:'primary',onClick:adminLogin},'כניסה'),h('a',{href:'mailto:'+SUPPORT_EMAIL},'תמיכה'))));
   return h('div',{className:'app-shell'},
     h('div',{className:'global-controls'},h(GlobalLanguageButton),h(GlobalAccountButton,{user:authUser,onOpen:()=>setAuthStage('account')})),
     h('header',{className:'topbar'},
       h(ProductBrand,{section:'Admin'}),
       h('div',{className:'top-actions'},
         h('span',{className:'admin-chip'},adminEmail||SUPPORT_EMAIL),
         h('button',{onClick:adminLogout},'יציאה')
       )
     ),
     h('main',{className:'content admin-page'},
       h('section',{className:'hero-row'},
         h('div',null,
           h('span',{className:'eyebrow'},'ADMIN CONTROL'),
           h('h1',null,'מרכז שליטה'),
           h('p',{className:'muted'},'אתה יכול לערוך תוכן בלי לשנות את לוגיקת המשחק עצמה.')
         ),
         h('div',{className:'top-actions'},h('button',{className:'primary',onClick:openAdminStats},'רענן סטטיסטיקה'))
       ),
       h('section',{className:'admin-grid'},
         h('div',{className:'panel'},
           h('h2',null,'עריכת בוט'),
           h('select',{value:adminBotSlug,onChange:e=>{const b=bots.find(x=>x.slug===e.target.value);selectAdminBot(b);}},
             h('option',{value:''},'בחר בוט'),
             bots.map(b=>h('option',{key:b.slug,value:b.slug},`${b.name} • ${b.elo}`))
           ),
           adminBotDraft&&h('div',{className:'admin-form'},
             [['name','שם'],['title','תואר'],['elo','Elo'],['tier','Tier'],['flavor','אופי'],['piece','סמל']].map(([key,label])=>
               h('label',{key},label,h('input',{value:adminBotDraft[key]??'',onChange:e=>setAdminBotDraft({...adminBotDraft,[key]:key==='elo'||key==='tier'?Number(e.target.value):e.target.value})}))
             ),
             h('button',{className:'primary',onClick:saveAdminBot},'שמור שינויים')
           )
         ),
         h('div',{className:'panel'},
           h('h2',null,'סטטיסטיקה'),
           adminStats?h('pre',{className:'admin-stats'},JSON.stringify(adminStats,null,2)):h('p',{className:'muted'},'לחץ רענן סטטיסטיקה כדי לקרוא נתונים מהשרת.')
         )
       ),
       h('section',{className:'panel'},
         h('h2',null,'בקשות גישה'),
         h('p',{className:'muted'},'הנפק קוד חד־פעמי ומסור אותו למבקש. הקוד בתוקף ל־12 דקות מרגע ההנפקה.'),
         h('button',{onClick:loadAccessRequests},'רענן בקשות'),
         accessRequests.length===0?h('p',{className:'muted'},'אין בקשות ממתינות.'):h('div',{className:'admin-form'},accessRequests.map(req=>h('div',{key:req.id,className:'row'},h('strong',null,req.email),h('span',{className:'muted'},new Date(req.created_at).toLocaleString('he-IL')),issuedCodes[req.id]&&h('span',{className:'admin-chip'},`${issuedCodes[req.id].code} • עד ${new Date(issuedCodes[req.id].expiresAt).toLocaleTimeString('he-IL')}`),h('button',{className:'primary',onClick:()=>approveAccess(req.id)},'אשר + צור קוד'),h('button',{onClick:()=>dismissAccessRequest(req.id)},'דחה')))),
       ),
       h('section',{className:'panel'},
         h('h2',null,'שליטה במערכת'),
         h('p',{className:'muted'},'Admin משתמש באותו מוצר בדיוק כמו משתמש רגיל.'),
         h('div',{className:'row'},
           h('button',{onClick:()=>setPage('review')},'סקירה'),
           h('button',{onClick:()=>setPage('bots')},'בוטים'),
           h('button',{onClick:()=>setPage('adaptive')},'Adaptive'),
           h('a',{href:'/credits.html',target:'_blank'},'Credits')
         )
       )
     )
   );
 }


 return h('div',{className:'app-shell'},h('div',{className:'global-controls'},h(GlobalLanguageButton),h(GlobalAccountButton,{user:authUser,onOpen:()=>setAuthStage('account')})),
   h('header',{className:'topbar'},
     h(ProductBrand,{section:'Veyra Chess'}),
     h('div',{className:'top-actions'},h('span',{className:'stage-pill'},'Preview'),h('button',{onClick:()=>setPage('archive')},'🗂️ ארכיון'),h('button',{onClick:()=>setPage('legends')},'🏆 אגדות'),h('button',{onClick:()=>setPage('clock')},'⏱️ שעון'),h('button',{onClick:()=>setPage('windows')},'🪟 Windows'),h('button',{onClick:()=>{setBlindfoldBotId(null);setPage('blindfold')}},'♟️ שחמט עיוור'),h('button',{onClick:()=>setPage('adaptive')},'🧠 Adaptive'),isAdmin&&h('button',{onClick:()=>setPage('admin')},'⚙️ Admin'),h('button',{onClick:()=>setPage('openings')},'📚 פתיחות'),h('button',{onClick:()=>setPage('bots')},'🤖 בוטים'),h('button',{onClick:()=>setPage('puzzles')},'🧩 פאזלים'))
   ),
   h('div',{className:'workspace'},
     h('nav',{className:'sidebar-nav'},['בית','סקירה','בוטים','Adaptive','Windows','Admin','אגדות'].map((x,i)=>
       h('button',{key:x,className:(page==='home'&&i===0)||(page==='review'&&i===1)||(page==='bots'&&i===2)||(page==='adaptive'&&i===3)||(page==='windows'&&i===4)||(page==='admin'&&i===5)||(page==='legends'&&i===6)?'active':'',onClick:()=>i===0?setPage('home'):i===1?setPage('review'):i===2?setPage('bots'):i===3?setPage('adaptive'):i===4?setPage('windows'):i===5?setPage('admin'):setPage('legends')},x)
     )),
     h('main',{className:'main'},
       h('section',{className:'hero-row'},
         h('div',null,h('h1',null,'מאמן שחמט'),h('p',null,'סקירה חכמה, Coach ובוטים במקום אחד.')),
         h('div',{className:'metric-ring'},h('b',null,analysis?.summary?(playerSide==='white'?analysis.summary.whiteAcc:analysis.summary.blackAcc):0),h('span',null,'Accuracy'))
       ),
       h('section',{className:'board-and-coach'},
         h('div',{className:'board-col'},
           h('div',{className:'board-wrap'},
             h('div',{ref:boardRef,className:'board'}),
             h('svg',{ref:overlayRef,className:'arrow-layer'}),
             h('div',{className:'badge-layer'})
           ),
           h('div',{className:'move-strip'},history.length
             ? history.slice(Math.max(0,selected-4),selected+5).map((m,i)=>{const mk=timelineMark(analysis?.moves?.[Math.max(0,selected-4)+i]?.classification); return h('button',{key:m.from+m.to+i,onClick:()=>setSelected(Math.max(0,selected-4)+i),...(mk?{title:`${m.san} — ${mk.labelHe} / ${mk.labelEn}`,'aria-label':`${m.san} — ${mk.labelHe} / ${mk.labelEn}`,'data-mark':mk.tone}:{})},m.san,mk&&h('span',{className:'strip-mark strip-mark-'+mk.tone,'aria-hidden':'true'},mk.symbol));})
             : h('span',{className:'muted'},'טען משחק כדי להתחיל')
           ),
           h('div',{className:'board-actions'},
             h('button',{onClick:()=>setPlayerSide(playerSide==='white'?'black':'white')},'הפוך לוח'),
             h('button',{onClick:()=>setSelected(Math.max(0,selected-1))},'←'),
             h('button',{onClick:()=>setSelected(Math.min(history.length-1,selected+1))},'→')
           )
         ),
         h('aside',{className:'coach-card'},
           h('div',{className:'coach-header'},
             h('img',{src:'/coach-avatar.webp',className:'coach-avatar-small',alt:'Coach'}),
             vis.icon && h('img',{className:'coach-classification-icon',src:vis.icon,alt:vis.label,title:vis.label}),
             h('div',null,h('b',null,currentA?vis.label:'Coach'),h('small',null,currentA?`מהלך ${selected+1} מתוך ${history.length}`:'טען משחק')),
             h('div',{className:'score-pill'},scoreText)
           ),
           h('p',{className:'coach-copy'},currentA?(currentA.explanation||'המהלך נותח. עבור למהלך הבא להסבר הבא.'):'הטען PGN או משחק מ-Chess.com כדי להתחיל.'),
           h('div',{className:'eval-panel'},h('div',{className:'eval-bar-v'},h('div',{className:'eval-fill-v',style:{height:`${currentWhiteChance}%`}})),h('span',null,`${currentWhiteChance.toFixed(1)}%`)),
           h('div',{className:'coach-buttons'},
             h('button',{onClick:()=>{setExplainMode('best');setStatus(currentA?`המהלך הטוב ביותר: ${currentA.bestUci||'לא זמין'}`:'טען מהלך קודם.')}},'הסבר מהלך הכי טוב'),
             h('button',{onClick:()=>{setExplainMode('threat');setStatus(currentA?'מוצגת תגובת האיום החזקה של היריב.':'טען מהלך קודם.')}},'הסבר איום')
           ),
           h('div',{className:'coach-buttons'},
             h('button',{onClick:()=>{setExplainMode('normal');setSelected(Math.min(history.length-1,selected+1))}},'הבנתי ✓'),
             h('button',{onClick:()=>setStatus('בחר הסבר מהלך הכי טוב או הסבר איום כדי להעמיק.')},'לא הבנתי')
           ),
           analysis?.moves?.[selected]?.classification && h('div',{className:'classification-note'},`סיווג: ${vis.label}`)
         )
       ),
       h('section',{className:'import-grid'},
         h('div',{className:'panel'},
           h('h2',null,'PGN'),
           h('textarea',{value:pgn,onChange:e=>setPgn(e.target.value),placeholder:'הדבק PGN כאן'}),
           h('div',{className:'row'},h('input',{type:'file',accept:'.pgn,text/plain',onChange:e=>{const f=e.target.files?.[0]; if(f)f.text().then(setPgn).catch(()=>setStatus('קריאת הקובץ נכשלה.'));}})),
           h('div',{className:'row'},h('button',{className:'primary',onClick:loadPgn},'טען משחק'),h('button',{onClick:analyze,disabled:analyzing},analyzing?'מנתח...':'נתח משחק'),analysis&&h('button',{onClick:()=>setSummaryOpen(true)},'סיכום Review'))
         ),
         h('div',{className:'panel archive-saved-panel'},
           h('h2',null,'המשחקים השמורים שלי'),
           authUser&&h('div',{className:'game-list'},savedGames.length?savedGames.map(g=>h('button',{key:g.id,onClick:()=>openSavedGame(g.id)},String(g.meta?.white||'White')+' vs '+String(g.meta?.black||'Black')+' • '+String((g.created_at||'').slice(0,10)))):h('small',{className:'muted'},'עדיין אין משחקים שמורים. כל משחק שתטען יישמר כאן.')),
           !authUser&&h('small',{className:'muted'},'התחבר לחשבון כדי לראות משחקים שמורים.')
         )
       ),
       h('section',{className:'panel'},
         h('div',{className:'panel-title'},h('h2',null,'מהלכים'),h('span',{className:'muted'},status)),
         h('div',{className:'moves-list'},history.map((m,i)=>{
           const a=analysis?.moves?.[i]; const v=CLASS_VIS[a?.classification||'good']||CLASS_VIS.good;
           return h('button',{key:i,className:'move-item '+(i===selected?'selected':''),onClick:()=>setSelected(i)},
             h('span',{className:'move-label'},h('span',null,`${i%2===0?Math.floor(i/2)+1+'.':'...'} ${m.san}`),moveClocks[i]&&h('small',{className:'move-clock'},'⏱ '+moveClocks[i])),
             a&&v.icon&&h('img',{className:'mini-badge classification-icon',src:v.icon,alt:v.label,title:v.label})
           );
         }))
       )
       ,h('section',{className:'panel legal-links'},h('div',{className:'support-strip'},h('b',null,'תמיכה: '),h('a',{href:'mailto:'+SUPPORT_EMAIL},SUPPORT_EMAIL)),h('span',{className:'muted'},'Preview policies'),h('div',{className:'row'},h('a',{href:'/legal/terms.html',target:'_blank'},'תנאי שימוש'),h('a',{href:'/legal/privacy.html',target:'_blank'},'פרטיות'),h('a',{href:'/legal/cookies.html',target:'_blank'},'Cookies'),h('a',{href:'/legal/refunds.html',target:'_blank'},'ביטולים והחזרים'),h('a',{href:'/legal/accessibility.html',target:'_blank'},'נגישות'),h('a',{href:'/credits.html',target:'_blank'},'Credits'),h('a',{href:'/download.html',target:'_blank'},'Windows'),h('a',{href:'mailto:'+SUPPORT_EMAIL},SUPPORT_EMAIL)))
     )
   )
   ,summaryOpen && h(SummaryModal,{data:summaryData(),playerSide,onClose:()=>setSummaryOpen(false),onSelectCategory:(key)=>{const idx=(analysis?.moves||[]).findIndex(m=>m.classification===key); if(idx>=0){setSelected(idx);setSummaryOpen(false);}}})
 );
}

function SummaryModal({data,onClose,onSelectCategory,playerSide}){
  const rows=['brilliant','great','best','excellent','good','book','forced','inaccuracy','mistake','miss','blunder'];
  const mine=playerSide==='white'?data.counts.white:data.counts.black; const opp=playerSide==='white'?data.counts.black:data.counts.white;
  const mineAcc=playerSide==='white'?data.whiteAcc:data.blackAcc; const oppAcc=playerSide==='white'?data.blackAcc:data.whiteAcc;
  const mineRating=playerSide==='white'?data.whiteRating:data.blackRating; const oppRating=playerSide==='white'?data.blackRating:data.whiteRating;
  return h('div',{className:'modal-backdrop'},
    h('div',{className:'summary-modal'},
      h('div',{className:'summary-head'},h('h2',null,'סיכום Review'),h('button',{onClick:onClose},'סגור')),
      h('div',{className:'summary-columns'},
        h('div',null,h('b',null,'אני'),h('div',{className:'summary-stat'},`Accuracy: ${mineAcc.toFixed(1)}`),h('div',{className:'summary-stat'},`Rating: ${mineRating}`)),
        h('div',null,h('b',null,'היריב'),h('div',{className:'summary-stat'},`Accuracy: ${oppAcc.toFixed(1)}`),h('div',{className:'summary-stat'},`Rating: ${oppRating}`))
      ),
      h('div',{className:'summary-rows'},rows.map(k=>
        h('button',{key:k,onClick:()=>onSelectCategory(k)},h('span',{className:'summary-icon',style:{background:CLASS_VIS[k]?.bg||'var(--surface-tile-1)'}},CLASS_VIS[k]?.symbol||''),h('span',{className:'summary-label'},CLASS_VIS[k]?.label||k),h('span',{className:'summary-count'},`${mine[k]||0} / ${opp[k]||0}`))
      ))
    )
  );
}

function palette(i){const p=['var(--canvas)','var(--canvas-parchment)','var(--surface-pearl)']; return p[i%p.length];}

// Error boundaries must be class components (no hook equivalent in React 18).
class AppErrorBoundary extends React.Component {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(error,info){console.error('Veyra render error:',error,info);}
  render(){
    if(!this.state.failed) return this.props.children;
    const en=getLang()==='en';
    return h('div',{className:'app-shell auth-shell'},h('main',{className:'content auth-page'},h('section',{className:'auth-card center'},h('h1',null,en?'Something went wrong':'משהו השתבש'),h('p',null,en?'Veyra hit an unexpected error. Reload the page to continue.':'Veyra נתקלה בשגיאה לא צפויה. טען מחדש את הדף כדי להמשיך.'),h('button',{className:'primary',onClick:()=>window.location.reload()},en?'Reload':'טען מחדש'))));
  }
}

function boot(){ ReactDOM.render(h(AppErrorBoundary,null,h(App)),document.getElementById('root')); }
boot();
