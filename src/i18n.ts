const LANG_KEY = 'tabia_language';
export type Lang = 'he' | 'en';

export const TERMS_VERSION = '2026-09-26';
export const PRIVACY_VERSION = '2026-09-26';
export const EFFECTIVE_DATE = '2026-09-26';

const HE_TO_EN: Record<string, string> = {
  'לבן':'White','שחור':'Black','PGN לא נטען':'PGN could not be loaded','שחור ניצח במט':'Black won by checkmate','לבן ניצח במט':'White won by checkmate','תיקו':'Draw','שחור ניצח על הזמן':'Black won on time','לבן ניצח על הזמן':'White won on time','שחור ניצח בהתפטרות':'Black won by resignation','לבן ניצח בהתפטרות':'White won by resignation','חזרה לבוטים':'Back to Bots','הבוט חושב...':'Bot is thinking...','תורך':'Your move','פרוש':'Resign','הצע תיקו':'Offer draw','העבר לסקירה':'Review game','בוט אחר':'Another bot','מוכן. הדבק PGN או בחר משחק מ-Chess.com.':'Ready. Paste a PGN or choose a Chess.com game.','טעינת הבוטים נכשלה.':'Failed to load bots.','מהלך בוצע.':'Move played.','לא הצלחתי לקרוא את ה-PGN הזה.':'I could not read this PGN.','טען משחק לפני ניתוח.':'Load a game before analysis.','מנתח...':'Analyzing...','מהלך לא חוקי':'Illegal move','הניתוח הסתיים.':'Analysis complete.','טוען משחקים מ-Lichess...':'Loading games from Lichess...','טוען משחקים...':'Loading games...','נכנסת כאדמין.':'Admin login successful.','Admin עדיין לא מחובר לשרת. צריך להגדיר את משתני ה-Admin ב-Netlify.':'Admin is not connected yet. Configure the Admin environment variables in Netlify.','פרטי Admin שגויים.':'Invalid Admin credentials.','השינויים נשמרו בשרת.':'Changes saved to the server.','אחסון אדמין עדיין לא מחובר.':'Admin storage is not connected yet.','שמירת השינויים נכשלה.':'Failed to save changes.','הבוט הבא':'Next bot','שיפור המערכת הופעל. נשמרים סיגנלים מצטברים בלבד.':'System improvement enabled. Only aggregate signals are stored.','שיפור המערכת כבוי.':'System improvement disabled.','משחק הבוט נטען לסקירה.':'Bot game loaded into Review.','לא הצלחתי להעביר את משחק הבוט לסקירה.':'Could not transfer the bot game to Review.','חזרה לסקירה':'Back to Review','מתקדם מול יריבים':'Progress through opponents','הבוט נעול':'Bot locked','נצח את הבוט הקודם כדי לפתוח אותו':'Beat the previous bot to unlock it','הצד שלך':'Your side','אקראי':'Random','זמן':'Time','10 דקות':'10 minutes','5 דקות':'5 minutes','3 דקות':'3 minutes','התחל משחק':'Start game','בחר בוט פתוח':'Choose an unlocked bot','חוק ההתקדמות':'Progression rule','ברירת המחדל כרגע: ניצחון מול הבוט הנוכחי פותח את הבא. ההתקדמות נשמרת במכשיר שלך.':'By default, beating the current bot unlocks the next one. Progress is saved on your device.','🤖 בוטים':'🤖 Bots','סקירה':'Review','המערכת יכולה ללמוד מדפוסים מצטברים של משתמשים ולהתאים את רמת האימון, בלי לשלוח PGN גולמי למודל המשותף.':'The system can learn from aggregate patterns and adapt training without sending raw PGNs to the shared model.','הפרופיל האישי שלך':'Your personal profile','שיפור המערכת פעיל. המערכת יכולה לשלוח סיגנלים מצטברים.':'System improvement is on. Aggregate signals may be sent.','שיפור המערכת כבוי. שום סיגנל Adaptive לא נשלח לשרת.':'System improvement is off. No Adaptive signal is sent to the server.','אפשר שיפור Adaptive':'Enable Adaptive improvement','השליטה אצלך':'You stay in control','מה הבוט לומד':'What the bot learns','עקרונות הטעויות שחוזרים אצלך':'Recurring mistake principles','שלב המשחק שבו הטעות קורית':'Game phase where mistakes happen','חומרת הטעות':'Mistake severity','קצב ההסתגלות לרמת היריב':'How the bot adapts to your level','המערכת המשותפת מקבלת סיגנלים מצטברים בלבד.':'The shared system receives aggregate signals only.','למידה בין משתמשים':'Learning across users','כאשר שיפור המערכת פעיל, סיגנלים מצטברים ממשתמשים שונים יכולים לשפר את התנהגות ה-Adaptive Bot.':'When improvement is enabled, aggregate signals from different users can improve Adaptive Bot behavior.','אבטחה ופרטיות':'Security & Privacy','לפני פרסום מלא יש להשלים את audit האבטחה, הפרטיות וההרשאות בסביבת השרת האמיתית.':'Before full publication, the security, privacy and permissions audit must be completed in the real server environment.','מדיניות פרטיות':'Privacy Policy','חזרה':'Back','Veyra Chess על Windows':'Veyra Chess on Windows','אותה אפליקציה, עטופה כ-PWA כדי לא לשכפל את המוצר או הלוגיקה.':'The same app, packaged for Windows without duplicating the product or its logic.','עמוד הורדה ל-Windows':'Windows download page','איך זה עובד':'How it works','המערכת נשארת מחוברת לאינטרנט ומשתמשת באותה שכבת backend ונתונים כמו גרסת הדפדפן.':'The app stays connected to the internet and uses the same backend and data layer as the browser version.','כניסת Admin':'Admin sign in','כניסה':'Sign in','תמיכה':'Support','יציאה':'Sign out','מרכז שליטה':'Control center','אתה יכול לערוך תוכן בלי לשנות את לוגיקת המשחק עצמה.':'You can edit content without changing the game logic itself.','רענן סטטיסטיקה':'Refresh stats','עריכת בוט':'Edit bot','בחר בוט':'Choose a bot','שם':'Name','תואר':'Title','אופי':'Style','סמל':'Symbol','שמור שינויים':'Save changes','סטטיסטיקה':'Statistics','לחץ רענן סטטיסטיקה כדי לקרוא נתונים מהשרת.':'Press Refresh stats to load server data.','שליטה במערכת':'System control','Admin משתמש באותו מוצר בדיוק כמו משתמש רגיל.':'Admin uses the same product as a normal user.','בוטים':'Bots','בית':'Home','מאמן שחמט':'Chess Coach','סקירה חכמה, Coach ובוטים במקום אחד.':'Smart review, Coach and bots in one place.','טען משחק כדי להתחיל':'Load a game to start','הפוך לוח':'Flip board','טען משחק':'Load game','המהלך נותח. עבור למהלך הבא להסבר הבא.':'This move was analyzed. Go to the next move for the next explanation.','הטען PGN או משחק מ-Chess.com כדי להתחיל.':'Load a PGN or a Chess.com game to begin.','לא זמין':'Not available','טען מהלך קודם.':'Load a previous move.','הסבר מהלך הכי טוב':'Explain the best move','מוצגת תגובת האיום החזקה של היריב.':'The opponent’s strongest threat response is shown.','הסבר איום':'Explain the threat','הבנתי ✓':'Got it ✓','בחר הסבר מהלך הכי טוב או הסבר איום כדי להעמיק.':'Choose Best Move explanation or Threat explanation for more detail.','לא הבנתי':'I did not understand','הדבק PGN כאן':'Paste PGN here','קריאת הקובץ נכשלה.':'Could not read the file.','נתח משחק':'Analyze game','סיכום Review':'Review summary','מקורות משחקים':'Game sources','מהלכים':'Moves','תמיכה: ':'Support: ','תנאי שימוש':'Terms of Use','פרטיות':'Privacy','ביטולים והחזרים':'Refunds & cancellations','נגישות':'Accessibility','סגור':'Close','אני':'Me','היריב':'Opponent','שעון':'Clock','שעון שחמט':'Chess Clock','החל זמן':'Set Time','נגמר הזמן!':'Time out!','מושהה':'Paused','פעיל':'Active','המשחק הסתיים':'Game over','לחץ להתחלה':'Tap to start','מותאם אישית':'Custom','תוספת בשניות':'Increment (sec)','דקות':'Minutes'
};
// Puzzle streak page strings.
Object.assign(HE_TO_EN, {
"🧩 פאזלים":"🧩 Puzzles",
"רצף פאזלים":"Puzzle streak",
"פתרו פאזלים ברצף בלי לטעות":"Solve puzzles in a row without a mistake",
" פתרו פאזלים ברצף בלי לטעות":" Solve puzzles in a row without a mistake",
"חזרה לבית":"Back to home",
"טוען פאזל...":"Loading puzzle...",
"טעינת הפאזלים נכשלה.":"Failed to load puzzles.",
"רצף":"Streak",
"שיא":"Best",
"נפתרו: ":"Solved: ",
"נכון!":"Correct!",
"🔥 רצף של 3! ממשיכים?":"🔥 Streak of 3! Keep going?",
"רמז":"Hint",
"רמז נוסף":"Another hint",
"אין רמזים נוספים":"No more hints",
"נסה שוב":"Try again",
"הפאזל הבא":"Next puzzle",
"מט שהוחמץ":"Missed mate",
"כלי תלוי":"Hanging piece",
"סיום":"Endgame",
"כללי":"General",
"ביטחון המלך":"King safety",
"פתיחה":"Opening",
"לחץ זמן":"Time pressure"
});

// Personal puzzles + Puzzle Rush strings.
Object.assign(HE_TO_EN, {
"אימון אישי":"Personal training","Puzzle Rush":"Puzzle Rush","רצף":"Streak","מצבי פאזלים":"Puzzle modes",
"כדי לקבל פאזלים מהמשחקים שלך צריך להתחבר.":"Sign in to get puzzles from your own games.",
"בינתיים אפשר לשחק ברצף פאזלים.":"Meanwhile you can play the puzzle streak.",
"טוען פאזלים...":"Loading puzzles...",
"ההתחברות פגה. התחבר שוב כדי להמשיך.":"Your session expired. Sign in again to continue.",
"פאזלים אישיים עוד לא נפתחו בחשבון שלך.":"Personal puzzles are not open on your account yet.",
"אין חיבור ואין נתונים שמורים במכשיר.":"No connection and no saved data on this device.",
"נסה שוב":"Try again",
"עדיין אין לך פאזלים מהמשחקים שלך":"You do not have puzzles from your own games yet",
"כרגע מוצגים פאזלים לדוגמה. הרץ DNA כדי שנמצא את הטעויות האמיתיות שלך ונהפוך אותן לפאזלים.":"Sample puzzles are shown for now. Run DNA to find your real mistakes and turn them into puzzles.",
"רוצה עוד? הרץ DNA נוסף והמשחקים הבאים שלך יהפכו לפאזלים.":"Want more? Run another DNA and your next games become puzzles.",
"הרץ DNA על המשחקים שלי":"Run DNA on my games","הרץ DNA נוסף":"Run another DNA","מפעיל...":"Starting...",
"מנתח את המשחקים שלך":"Analyzing your games",
"אפשר להמשיך לתרגל. הניתוח נמשך ברקע וגם אם תסגור את האפליקציה.":"You can keep practicing. The analysis continues in the background even if you close the app.",
"הגעת למגבלת הניתוח היומית. אפשר להמשיך מחר.":"You reached the daily analysis limit. You can continue tomorrow.",
"אין חיבור כרגע. נסה שוב בעוד רגע.":"No connection right now. Try again in a moment.",
"צריך להתחבר מחדש כדי להריץ DNA.":"Sign in again to run DNA.",
"הניתוח נעצר בגלל שגיאה. אפשר להפעיל אותו שוב.":"The analysis stopped because of an error. You can start it again.",
"ספק המשחקים הגביל זמנית את הבקשות. הניתוח ימשיך בהפעלה הבאה.":"The game provider limited requests for now. The analysis will continue on the next run.",
"לא הצלחנו להפעיל את הניתוח. נסה שוב.":"We could not start the analysis. Try again.",
"לא מצאנו משחקים. הגדר שם משתמש של Chess.com או Lichess במסך הארכיון ונסה שוב.":"We found no games. Set a Chess.com or Lichess username in the archive screen and try again.",
"אין משחקים חדשים לניתוח כרגע.":"There are no new games to analyze right now.",
"אין חיבור. התוצאות נשמרות במכשיר ויישלחו כשהחיבור יחזור.":"No connection. Results are saved on this device and will be sent when the connection returns.",
"ההתחברות פגה. התחבר שוב כדי לשמור את התוצאות. הן לא אבדו.":"Your session expired. Sign in again to save your results. They were not lost.",
"אין פאזלים זמינים כרגע.":"No puzzles are available right now.",
"מהלך שווה ערך. גם זה נכון!":"An equivalent move. Also correct!",
"התוצאות נשמרו בחשבון שלך.":"Your results were saved to your account.",
"חלק מהתוצאות יישלחו כשהחיבור יחזור.":"Some results will be sent when the connection returns.",
"שומר את התוצאות...":"Saving your results...","תרגול נוסף":"Practice more",
"פאזל":"Puzzle","נכונים":"Correct","פאזל לדוגמה":"Sample puzzle","הסר פאזל זה":"Remove this puzzle",
"הפאזל הבא":"Next puzzle","לוח הפאזל":"Puzzle board","לוח Puzzle Rush":"Puzzle Rush board","לוח שחמט":"Chessboard",
"בחר כלי להכתרה:":"Choose a promotion piece:","ביטול":"Cancel",
"שלוש דקות. כמה שיותר פאזלים נכונים. שלוש טעויות והריצה נגמרת. הפאזלים לקוחים מהטעויות שלך.":"Three minutes. As many correct puzzles as you can. Three mistakes and the run ends. The puzzles come from your own mistakes.",
"אין חיבור. אפשר לשחק והתוצאה תישלח אחר כך.":"No connection. You can play and the result will be sent later.",
"התחל":"Start","אין פאזלים זמינים":"No puzzles available","זמן":"Time","ניקוד":"Score","טעויות":"Mistakes",
"שלוש טעויות. הריצה הסתיימה.":"Three mistakes. The run is over.","הזמן נגמר!":"Time is up!","נגמרו הפאזלים בסט.":"The set ran out of puzzles.",
"התוצאה תישלח כשהחיבור יחזור.":"The result will be sent when the connection returns.","התוצאה נשמרה בחשבון שלך.":"The result was saved to your account.",
"שומר את התוצאה...":"Saving the result...","שחק שוב":"Play again","מושהה. הזמן לא נספר.":"Paused. The clock is not running.",
"רמז":"Hint","רמז נוסף":"Another hint","אין רמזים נוספים":"No more hints"
});
const DYNAMIC_PUZZLE_RULES: [RegExp, string | ((...a: string[]) => string)][] = [
  [/^משחק (\d+) מתוך (\d+) • נוספו (\d+) פאזלים$/, 'Game $1 of $2 • $3 puzzles added'],
  [/^הבריכה שלך: (\d+) פאזלים \((\d+) חדשים\)$/, 'Your pool: $1 puzzles ($2 new)'],
  [/^נותחו (\d+) משחקים ונוספו (\d+) פאזלים מהטעויות שלך\.$/, '$1 games analyzed and $2 puzzles added from your mistakes.'],
  [/^נותחו (\d+) משחקים ולא נמצאו טעויות שמתאימות לפאזל\.$/, '$1 games analyzed; no mistakes suitable for a puzzle were found.'],
  [/^ממתינות: (\d+)$/, 'Waiting: $1'],
  [/^סיימת את הסט: (\d+) מתוך (\d+)$/, 'Set finished: $1 of $2'],
  [/^(\d+)\/(\d+)$/, '$1/$2'],
  [/^מהמשחק שלך( מול (.+?))?( \((.+?)\))?( • מהלך (\d+))?( • שיחקת: (.+))?$/, (m: string, a: string, opp: string, c: string, date: string, e: string, mv: string, f: string, played: string) => 'From your game' + (opp ? ' vs ' + opp : '') + (date ? ' (' + date + ')' : '') + (mv ? ' • move ' + mv : '') + (played ? ' • you played: ' + played : '')],
  [/^(\d+) פתרונות$/, '$1 solved'],
  [/^(\d+) מתוך 3 טעויות$/, '$1 of 3 mistakes'],
  [/^דיוק (\d+)% • שיא קודם (\d+)$/, 'Accuracy $1% • previous best $2'],
  [/^לא נכון\. המהלך: (.+)$/, 'Wrong. The move: $1'],
  [/^(.+): (\d+)\/(\d+)$/, (m: string, a: string, b: string, c: string) => (HE_TO_EN[a] || a) + ': ' + b + '/' + c],
];
Object.assign(HE_TO_EN, {
  'רצף יומי': 'Daily streak',
  'שינוי אזור הזמן נכשל. אפשר לנסות שוב.': 'Could not change the timezone. You can try again.',
  '📊 סטטיסטיקות': '📊 Statistics',
  'הסטטיסטיקות שלך': 'Your statistics',
  'המסך הזה משתמש בדוח DNA השמור בחשבון. הוא לא מריץ מנוע מחדש ולא שומר עותק נוסף של הניתוחים.': 'This page uses your saved DNA report. It does not rerun the engine or store another copy of the analyses.',
  'רענון סטטיסטיקות': 'Refresh statistics',
  'טוען סטטיסטיקות שמורות מהחשבון...': 'Loading saved statistics from your account...',
  'צריך להתחבר לחשבון כדי לטעון סטטיסטיקות שמורות.': 'Sign in to load saved statistics.',
  'צריך להתחבר מחדש כדי לטעון סטטיסטיקות שמורות.': 'Sign in again to load saved statistics.',
  'לא הצלחתי לטעון את הסטטיסטיקות השמורות. אפשר לנסות שוב.': 'Could not load saved statistics. You can try again.',
  'הסטטיסטיקות מחושבות מדוח DNA שמור. לא בוצע ניתוח מנוע נוסף.': 'Statistics are calculated from a saved DNA report. No additional engine analysis was run.',
  'עדיין אין דוח DNA שמור בחשבון. צרו דוח DNA כדי להתחיל.': 'There is no saved DNA report in this account yet. Create a DNA report to get started.',
  'סיכום כללי': 'Overall summary',
  'משחקים שנכללו': 'Games included',
  'מהלכים של השחקן': 'Player moves',
  'מהלכי השחקן': 'Own moves',
  'Accuracy משוקלל לפי סוג זמן': 'Accuracy weighted by time control',
  'Accuracy ממוצע': 'Average accuracy',
  'Blunders ל־100 מהלכים': 'Blunders per 100 moves',
  'Mistakes ל־100 מהלכים': 'Mistakes per 100 moves',
  'Misses ל־100 מהלכים': 'Misses per 100 moves',
  'Inaccuracies ל־100 מהלכים': 'Inaccuracies per 100 moves',
  'ה־Accuracy הכללי משוקלל לפי מספר המשחקים בכל סוג זמן, על בסיס ממוצעי הסוגים המעוגלים בדוח.': 'Overall accuracy is weighted by the number of games in each time control, using the rounded averages in the report.',
  'מדגם קטן: אין להסיק ממנו דפוס יציב.': 'Small sample: do not infer a stable pattern from it.',
  'נתוני Blindfold אינם נמצאים בדוח ניתוח המשחקים. כדי לחשב סטטיסטיקות אמינות צריך לשמור סיכומי אימון קומפקטיים, כמו שלב, תוצאה ומשך, ולא לנחש אותם מתוך משחקים רגילים. כרגע לא מוצגים מדדים שאין להם מקור נתונים מאומת.': 'Blindfold data is not part of the game analysis report. Reliable statistics require compact training summaries such as stage, outcome and duration, rather than guesses from ordinary games. Metrics without a verified data source are not shown.',
  'אין עדיין נתוני DNA שמורים': 'No saved DNA data yet',
  'צרו דוח DNA כדי שהסטטיסטיקות הכלליות יוכלו להשתמש בניתוחים השמורים במקום לחשב הכול מחדש.': 'Create a DNA report so statistics can reuse saved analyses instead of calculating everything again.',
  'דוח DNA': 'DNA report',
  'פתיחת דוח DNA': 'Open DNA report',
  'יצירת דוח DNA': 'Create DNA report',
});
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
  s=s.replace(/^לא מדויק\. המהלך הנכון: (.+)$/,'Not accurate. Correct move: $1');
  s=s.replace(/^המהלך: (.+)$/,'Move: $1');
  s=s.replace(/^כלי במשבצת (.+)$/,'Piece on $1');
  s=s.replace(/^היעד: (.+)$/,'Target: $1');
  s=s.replace(/^הכלי מתקדם להכתרה: (.+)$/,'Promotes to: $1');
  s=s.replace(/^מזהה (\S+) • דירוג (\d+)$/,'ID $1 • Rating $2');
  s=s.replace(/^תורך: (לבן|שחור) • (.+)$/,(m,a,b)=>'Turn: '+(a==='לבן'?'White':'Black')+' • '+(HE_TO_EN[b]||b));
  s=s.replace(/^נפתרו: (\d+)$/,'Solved: $1');
  s=s.replace(/^(\d+) משחקים$/,'$1 games');
  for(const [re,rep] of DYNAMIC_PUZZLE_RULES){ if(re.test(s)){ s=typeof rep==='string'?s.replace(re,rep):s.replace(re,rep as any); break; } }
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
