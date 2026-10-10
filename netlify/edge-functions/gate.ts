const attempts = new Map<string,{start:number,count:number}>();
const text = new TextEncoder();

function getIp(request: Request){
  return request.headers.get('x-nf-client-connection-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}
function allowedRate(ip:string){
  const now=Date.now();
  const row=attempts.get(ip) || {start:now,count:0};
  if(now-row.start>=15*60*1000){row.start=now;row.count=0;}
  row.count+=1; attempts.set(ip,row);
  return row.count<=20;
}
function parseCookies(header:string){
  return Object.fromEntries(header.split(';').map(v=>v.trim()).filter(Boolean).map(v=>{const i=v.indexOf('=');return i<0?[v,'']:[v.slice(0,i),v.slice(i+1)]}));
}
function bytesToB64(bytes:Uint8Array){let out='';for(const b of bytes)out+=String.fromCharCode(b);return btoa(out).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function b64ToBytes(value:string){const normalized=value.replace(/-/g,'+').replace(/_/g,'/');const pad='='.repeat((4-normalized.length%4)%4);const raw=atob(normalized+pad);return Uint8Array.from(raw,c=>c.charCodeAt(0));}
async function hmac(secret:string,payload:string){const key=await crypto.subtle.importKey('raw',text.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);return new Uint8Array(await crypto.subtle.sign('HMAC',key,text.encode(payload)));}
async function makeToken(secret:string){const exp=Math.floor(Date.now()/1000)+86400;const nonce=crypto.randomUUID();const payload=`${exp}.${nonce}`;const sig=bytesToB64(await hmac(secret,payload));return `${payload}.${sig}`;}
async function verifyToken(secret:string,token:string){try{const parts=token.split('.');if(parts.length!==3)return false;const [expText,nonce,sig]=parts;const exp=Number(expText);if(!nonce||!sig||!Number.isFinite(exp)||exp<=Math.floor(Date.now()/1000))return false;const expected=bytesToB64(await hmac(secret,`${exp}.${nonce}`));return expected===sig;}catch{return false;}}
function gatePage(error=''){return `<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>לפני הכניסה • Veyra Chess</title><style>body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;min-height:100vh;margin:0;background:#06101e;color:#eef5ff;display:grid;place-items:center;padding:18px;box-sizing:border-box}main{width:min(760px,94vw);background:#0f1a2a;border:1px solid rgba(255,255,255,.09);padding:30px;border-radius:24px;box-shadow:0 30px 80px rgba(0,0,0,.35)}h1{margin:0 0 6px;font-size:32px}h2{margin:22px 0 8px;font-size:18px}p{color:#93a8c2;line-height:1.65;margin:8px 0}.intro{font-size:16px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:16px}.card{background:#0a1422;border:1px solid rgba(255,255,255,.07);border-radius:16px;padding:14px}.card b{display:block;margin-bottom:5px}.card span{color:#93a8c2;line-height:1.5;font-size:14px}.notice{margin-top:18px;padding:14px 16px;border-radius:15px;background:rgba(91,141,239,.08);border:1px solid rgba(91,141,239,.2);color:#cfe0ff;line-height:1.6}.links{display:flex;gap:12px;flex-wrap:wrap;margin-top:14px}.links a{color:#bcd1ff;text-decoration:none}.gate{margin-top:24px;padding-top:22px;border-top:1px solid rgba(255,255,255,.08)}input,button{width:100%;box-sizing:border-box;margin-top:10px;padding:12px;border-radius:11px;border:1px solid #334155}input{background:#08111d;color:#fff}button{background:linear-gradient(135deg,#4f5fff,#7c56ff);color:#fff;font-weight:800;cursor:pointer}.muted,small{color:#7087a2}small{display:block;margin-top:14px}@media(max-width:650px){.grid{grid-template-columns:1fr}h1{font-size:28px}}</style><main><h1>Veyra Chess</h1><p class="intro">לפני הכניסה לבטא הפרטית, הנה בדיוק מה יש כאן ומה אפשר לעשות.</p><div class="grid"><div class="card"><b>♟️ סקירת משחקים</b><span>טוענים PGN או משחק מ-Chess.com / Lichess, עוברים מהלך-מהלך ומקבלים סיווג, הערכה והסבר.</span></div><div class="card"><b>♟️ לוח שחמט</b><span>לוח אינטראקטיבי עם בחירת מהלכים, הפיכת לוח, רשימת מהלכים וחיצי Best / Threat.</span></div><div class="card"><b>🧠 Coach</b><span>מאמן שמסביר מה קרה במהלך, מה היה המהלך הטוב יותר ומה האיום המרכזי.</span></div><div class="card"><b>🤖 20 בוטים</b><span>קמפיין מדורג עם 20 יריבים, רמות שונות, בחירת צבע וזמן משחק, והעברת משחק ישירות ל-Review.</span></div><div class="card"><b>🧩 Adaptive</b><span>מצב אופציונלי ללמידה מהדפוסים המצטברים שלך. הוא כבוי כברירת מחדל ואפשר להפעיל או לכבות אותו.</span></div><div class="card"><b>🪟 Windows</b><span>גרסה שמחברת אותך לאותה אפליקציה דרך Windows בלי ליצור מוצר נפרד.</span></div></div><div class="notice"><b>חשוב:</b> זה Preview / בטא פרטית. הניתוחים והדירוגים הם כלי אימון ועזר, לא הבטחה לתוצאה ולא דירוג רשמי של Chess.com או Lichess.</div><div class="links"><a href="/legal/terms.html" target="_blank" rel="noreferrer">תנאי שימוש</a><a href="/legal/privacy.html" target="_blank" rel="noreferrer">מדיניות פרטיות</a><a href="/legal/cookies.html" target="_blank" rel="noreferrer">Cookies</a><a href="/legal/accessibility.html" target="_blank" rel="noreferrer">נגישות</a></div><div class="gate"><h2>כניסה לבטא</h2><p class="muted">אם קיבלת סיסמת גישה, הכנס אותה כאן.</p>${error?`<p style="color:#ff9e9e">${error}</p>`:''}<form method="post" action="/gate"><input name="password" type="password" autocomplete="current-password" required autofocus><button>כניסה ל-Veyra</button></form><small>תמיכה: orennzb@gmail.com</small></div></main></html>`;}

export default async (request:Request, context:any)=>{
  const url=new URL(request.url);
  // Static app assets must bypass the private gate so the protected entrypoint can boot normally.
  const publicStatic =
    url.pathname === '/manifest.webmanifest' ||
    url.pathname === '/bootstrap.js' ||
    url.pathname === '/sw.js' ||
    url.pathname === '/styles.css' ||
    url.pathname === '/chess-global.js' ||
    url.pathname === '/cm-global.js' ||
    url.pathname === '/engine-worker.js' ||
    url.pathname === '/robots.txt' ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/data/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/vendor/') ||
    url.pathname.startsWith('/src/') ||
    url.pathname === '/download.html' ||
    url.pathname === '/credits.html' ||
    url.pathname.startsWith('/legal/');
  if(url.pathname==='/__gate' || publicStatic) return context.next();
  const secret=Deno.env.get('SITE_GATE_PASSWORD');
  if(!secret) return context.next();
  const cookies=parseCookies(request.headers.get('cookie')||'');
  const existing=cookies['__Host-site_gate'];
  if(existing&&await verifyToken(secret,existing)) return context.next();
  if(request.method==='POST'&&url.pathname==='/gate'){
    const ip=getIp(request);
    if(!allowedRate(ip)) return new Response('Too Many Requests',{status:429,headers:{'retry-after':'900'}});
    const origin=request.headers.get('origin');const referer=request.headers.get('referer');
    const sameOrigin=origin?origin===url.origin:(referer?(()=>{try{return new URL(referer).origin===url.origin}catch{return false}})():false);
    if(!sameOrigin)return new Response('Forbidden',{status:403});
    const body=await request.formData();const password=String(body.get('password')||'');
    if(password===secret){
      const token=await makeToken(secret);
      return new Response(null,{status:302,headers:{location:'/', 'set-cookie':`__Host-site_gate=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`,'cache-control':'no-store'}});
    }
    return new Response(gatePage('סיסמה שגויה. נסה שוב.'),{status:401,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});
  }
  return new Response(gatePage(),{status:401,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});
};
