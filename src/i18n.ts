const LANG_KEY = 'tabia_language';
export type Lang = 'he' | 'en';

export const TERMS_VERSION = '2026-09-26';
export const PRIVACY_VERSION = '2026-09-26';
export const EFFECTIVE_DATE = '2026-09-26';

const HE_TO_EN: Record<string, string> = {
  'לבן':'White','שחור':'Black','PGN לא נטען':'PGN could not be loaded','שחור ניצח במט':'Black won by checkmate','לבן ניצח במט':'White won by checkmate','תיקו':'Draw','שחור ניצח על הזמן':'Black won on time','לבן ניצח על הזמן':'White won on time','שחור ניצח בהתפטרות':'Black won by resignation','לבן ניצח בהתפטרות':'White won by resignation','חזרה לבוטים':'Back to Bots','הבוט חושב...':'Bot is thinking...','תורך':'Your move','פרוש':'Resign','הצע תיקו':'Offer draw','העבר לסקירה':'Review game','בוט אחר':'Another bot','מוכן. הדבק PGN או בחר משחק מ-Chess.com.':'Ready. Paste a PGN or choose a Chess.com game.','טעינת הבוטים נכשלה.':'Failed to load bots.','מהלך בוצע.':'Move played.','לא הצלחתי לקרוא את ה-PGN הזה.':'I could not read this PGN.','טען משחק לפני ניתוח.':'Load a game before analysis.','מנתח...':'Analyzing...','מהלך לא חוקי':'Illegal move','הניתוח הסתיים.':'Analysis complete.','טוען משחקים מ-Lichess...':'Loading games from Lichess...','טוען משחקים...':'Loading games...','נכנסת כאדמין.':'Admin login successful.','Admin עדיין לא מחובר לשרת. צריך להגדיר את משתני ה-Admin ב-Netlify.':'Admin is not connected yet. Configure the Admin environment variables in Netlify.','פרטי Admin שגויים.':'Invalid Admin credentials.','השינויים נשמרו בשרת.':'Changes saved to the server.','אחסון אדמין עדיין לא מחובר.':'Admin storage is not connected yet.','שמירת השינויים נכשלה.':'Failed to save changes.','הבוט הבא':'Next bot','שיפור המערכת הופעל. נשמרים סיגנלים מצטברים בלבד.':'System improvement enabled. Only aggregate signals are stored.','שיפור המערכת כבוי.':'System improvement disabled.','משחק הבוט נטען לסקירה.':'Bot game loaded into Review.','לא הצלחתי להעביר את משחק הבוט לסקירה.':'Could not transfer the bot game to Review.','חזרה לסקירה':'Back to Review','מתקדם מול יריבים':'Progress through opponents','הבוט נעול':'Bot locked','נצח את הבוט הקודם כדי לפתוח אותו':'Beat the previous bot to unlock it','הצד שלך':'Your side','אקראי':'Random','זמן':'Time','10 דקות':'10 minutes','5 דקות':'5 minutes','3 דקות':'3 minutes','התחל משחק':'Start game','בחר בוט פתוח':'Choose an unlocked bot','חוק ההתקדמות':'Progression rule','ברירת המחדל כרגע: ניצחון מול הבוט הנוכחי פותח את הבא. ההתקדמות נשמרת במכשיר שלך.':'By default, beating the current bot unlocks the next one. Progress is saved on your device.','🤖 בוטים':'🤖 Bots','סקירה':'Review','המערכת יכולה ללמוד מדפוסים מצטברים של משתמשים ולהתאים את רמת האימון, בלי לשלוח PGN גולמי למודל המשותף.':'The system can learn from aggregate patterns and adapt training without sending raw PGNs to the shared model.','הפרופיל האישי שלך':'Your personal profile','שיפור המערכת פעיל. המערכת יכולה לשלוח סיגנלים מצטברים.':'System improvement is on. Aggregate signals may be sent.','שיפור המערכת כבוי. שום סיגנל Adaptive לא נשלח לשרת.':'System improvement is off. No Adaptive signal is sent to the server.','אפשר שיפור Adaptive':'Enable Adaptive improvement','השליטה אצלך':'You stay in control','מה הבוט לומד':'What the bot learns','עקרונות הטעויות שחוזרים אצלך':'Recurring mistake principles','שלב המשחק שבו הטעות קורית':'Game phase where mistakes happen','חומרת הטעות':'Mistake severity','קצב ההסתגלות לרמת היריב':'How the bot adapts to your level','המערכת המשותפת מקבלת סיגנלים מצטברים בלבד.':'The shared system receives aggregate signals only.','למידה בין משתמשים':'Learning across users','כאשר שיפור המערכת פעיל, סיגנלים מצטברים ממשתמשים שונים יכולים לשפר את התנהגות ה-Adaptive Bot.':'When improvement is enabled, aggregate signals from different users can improve Adaptive Bot behavior.','אבטחה ופרטיות':'Security & Privacy','לפני פרסום מלא יש להשלים את audit האבטחה, הפרטיות וההרשאות בסביבת השרת האמיתית.':'Before full publication, the security, privacy and permissions audit must be completed in the real server environment.','מדיניות פרטיות':'Privacy Policy','חזרה':'Back','Veyra Chess על Windows':'Veyra Chess on Windows','אותה אפליקציה, עטופה כ-PWA כדי לא לשכפל את המוצר או הלוגיקה.':'The same app, packaged for Windows without duplicating the product or its logic.','עמוד הורדה ל-Windows':'Windows download page','איך זה עובד':'How it works','המערכת נשארת מחוברת לאינטרנט ומשתמשת באותה שכבת backend ונתונים כמו גרסת הדפדפן.':'The app stays connected to the internet and uses the same backend and data layer as the browser version.','כניסת Admin':'Admin sign in','כניסה':'Sign in','תמיכה':'Support','יציאה':'Sign out','מרכז שליטה':'Control center','אתה יכול לערוך תוכן בלי לשנות את לוגיקת המשחק עצמה.':'You can edit content without changing the game logic itself.','רענן סטטיסטיקה':'Refresh stats','עריכת בוט':'Edit bot','בחר בוט':'Choose a bot','שם':'Name','תואר':'Title','אופי':'Style','סמל':'Symbol','שמור שינויים':'Save changes','סטטיסטיקה':'Statistics','לחץ רענן סטטיסטיקה כדי לקרוא נתונים מהשרת.':'Press Refresh stats to load server data.','שליטה במערכת':'System control','Admin משתמש באותו מוצר בדיוק כמו משתמש רגיל.':'Admin uses the same product as a normal user.','בוטים':'Bots','בית':'Home','מאמן שחמט':'Chess Coach','סקירה חכמה, Coach ובוטים במקום אחד.':'Smart review, Coach and bots in one place.','טען משחק כדי להתחיל':'Load a game to start','הפוך לוח':'Flip board','טען משחק':'Load game','המהלך נותח. עבור למהלך הבא להסבר הבא.':'This move was analyzed. Go to the next move for the next explanation.','הטען PGN או משחק מ-Chess.com כדי להתחיל.':'Load a PGN or a Chess.com game to begin.','לא זמין':'Not available','טען מהלך קודם.':'Load a previous move.','הסבר מהלך הכי טוב':'Explain the best move','מוצגת תגובת האיום החזקה של היריב.':'The opponent’s strongest threat response is shown.','הסבר איום':'Explain the threat','הבנתי ✓':'Got it ✓','בחר הסבר מהלך הכי טוב או הסבר איום כדי להעמיק.':'Choose Best Move explanation or Threat explanation for more detail.','לא הבנתי':'I did not understand','הדבק PGN כאן':'Paste PGN here','קריאת הקובץ נכשלה.':'Could not read the file.','נתח משחק':'Analyze game','סיכום Review':'Review summary','מקורות משחקים':'Game sources','מהלכים':'Moves','תמיכה: ':'Support: ','תנאי שימוש':'Terms of Use','פרטיות':'Privacy','ביטולים והחזרים':'Refunds & cancellations','נגישות':'Accessibility','סגור':'Close','אני':'Me','היריב':'Opponent','שעון':'Clock','שעון שחמט':'Chess Clock','החל זמן':'Set Time','נגמר הזמן!':'Time out!','מושהה':'Paused','פעיל':'Active','המשחק הסתיים':'Game over','לחץ להתחלה':'Tap to start','מותאם אישית':'Custom','תוספת בשניות':'Increment (sec)','דקות':'Minutes'
};
const EN_TO_HE: Record<string,string> = Object.fromEntries(Object.entries(HE_TO_EN).map(([h,e])=>[e,h]));

export function getLang(): Lang {
  try { return localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'he'; } catch { return 'he'; }
}
export function setLang(lang: Lang){
  try { localStorage.setItem(LANG_KEY, lang); } catch {}
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
  document.body?.setAttribute('data-lang', lang);
  window.dispatchEvent(new CustomEvent('tabia-language-change',{detail:lang}));
}
export function toggleLang(){ setLang(getLang()==='he'?'en':'he'); }
export function t(text:string, lang:Lang=getLang()):string { if(lang==='he') return EN_TO_HE[text] || text; return HE_TO_EN[text] || text; }

function dynamic(text:string, lang:Lang):string {
  if(lang==='he'){
    return EN_TO_HE[text] || text;
  }
  let s=HE_TO_EN[text] || text;
  s=s.replace(/^ניצחון על בוט פותח את הבא\. כרגע פתוחים (\d+) מתוך (\d+)\.$/,'A win against the current bot unlocks the next. Currently $1 of $2 are unlocked.');
  s=s.replace(/^בחרת את (.+)\.$/,'You selected $1.');
  s=s.replace(/^נטען (\d+) מהלכים\.$/,'Loaded $1 moves.');
  s=s.replace(/^מנתח (\d+)\/(\d+)$/,'Analyzing $1/$2');
  s=s.replace(/^סיווג: (.+)$/,'Classification: $1');
  s=s.replace(/^מהלך (\d+) מתוך (\d+)$/,'Move $1 of $2');
  s=s.replace(/^המהלך הטוב ביותר: (.+)$/,'Best move: $1');
  s=s.replace(/^חשבון מנהל: (.+)$/,'Admin account: $1');
  s=s.replace(/^ניצחון מול בוט (\d+) פותח את הבא\.$/,'Beat bot $1 to unlock the next.');
  s=s.replace(/^המנתח עצר במהלך (\d+).*$/,'Analysis stopped during move $1.');
  return s;
}

export function applyLanguage(root:ParentNode=document, lang:Lang=getLang()){
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  const nodes:Text[]=[]; let n:Node|null; while((n=walker.nextNode())) nodes.push(n as Text);
  for(const node of nodes){
    const p=node.parentElement; if(!p || ['SCRIPT','STYLE','TEXTAREA'].includes(p.tagName)) continue;
    const raw=node.nodeValue||''; if(!raw.trim()) continue;
    const translated=dynamic(raw,lang); if(translated!==raw) node.nodeValue=translated;
  }
  const els=(root as Element|Document).querySelectorAll?.('[placeholder],[title],[aria-label]')||[];
  els.forEach((el:any)=>['placeholder','title','aria-label'].forEach(attr=>{const v=el.getAttribute(attr);if(v) el.setAttribute(attr,dynamic(v,lang));}));
}

export function installDomTranslator(){
  const lang=getLang(); setLang(lang); applyLanguage(document,lang);
  const obs=new MutationObserver(()=>applyLanguage(document,getLang())); obs.observe(document.body,{subtree:true,childList:true,characterData:true});
  return ()=>obs.disconnect();
}

export function languageToggle(){
  const lang=getLang();
  const b=document.createElement('button');
  b.id='tabia-language-toggle'; b.type='button'; b.className='language-toggle'; b.textContent=lang==='he'?'EN':'עברית';
  b.title=lang==='he'?'Switch to English':'החלפה לעברית';
  b.onclick=()=>toggleLang();
  return b;
}
