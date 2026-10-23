# אגדות Veyra — לוח התקדמות

עדכון: 2026-10-21  
ענף עבודה: `tal-legends-bot-vs-bot`  
PR ממוזג: [#13 — Add Tal-inspired Legends and bot-vs-bot learning](https://github.com/orenzbit/veyra-chess/pull/13)  
Commit ב-`main`: `6450389782dafe121a92a5d1f4176be9b645f62d`

## מקרא
- ✅ הושלם ונבדק
- 🟠 בתהליך / נדרש ניסיון נוסף
- 🔴 חסום לאחר ניסיונות מתועדים

## התקדמות
**██████████ 100%** — כל שלבי המימוש, הבדיקות, התיעוד והמיזוג הושלמו.

- [x] ✅ יצירת ענף עבודה נפרד
- [x] ✅ ניתוח PGN: 2,431 משחקים, טווח 1952–1992, תוצאות וצבעים
- [x] ✅ החלפת הבוט תחת מזהה `tal` ושמירת 50 הגדרות הבוטים תקינות
- [x] ✅ אזור "אגדות", משחק בוט מול בוט, שליטה במהירות, רשימת מהלכים וסקירה לימודית
- [x] ✅ העברה לסקירה המלאה וקיצור דרך לשחמט עיוור מול טל
- [x] ✅ ארכיון משפטים לפי הקשר: כללי, פתיחה, איומים, טקטיקה וסיומים
- [x] ✅ README, דוח PGN, פרומפט חוזר ורשימת שחקנים מגוונת
- [x] ✅ CI: בדיקות מבנה, TypeScript, build, בדיקת דפדפן, אימות rules bundle ודיוק טקטי דטרמיניסטי
- [x] ✅ PR #13 מוזג ל-`main`; ה-commit אומת ב-ref של `main`

**הפעולה היחידה שנותרה היא מחיקת ענף העבודה, והיא אינה חלק מהאוטומציה.** הענף נשאר קיים עד לאישור מפורש ונפרד של המשתמש.


---

## מחזור אוטומציה מורחב — נפתח 2026-10-22

**סטטוס: 🟠 בתהליך תכנון והקמת תשתית.** אין לראות את מחזור העבודה החדש כהושלם רק מפני שמשימת טל הקודמת הושלמה.

- [x] 🟠 אומת שקיימים קובצי PGN של שחקנים בענף `player-data-batch`, כולל `Capablanca.pgn`.
- [x] 🟠 נכתב מסמך מחזור מלא: `docs/LEGENDS_AUTOMATION_LOOP.md`.
- [x] 🟠 עודכן הפרומפט החוזר עם שערי מוכנות, טורניר לפני מיזוג, טורניר אחרי מיזוג, עדכון README ובדיקת מחיקת ענף.
- [ ] 🟠 לבנות/לאמת את כל הבוטים ההיסטוריים המיועדים לפי פרוטוקול המחקר, בלי להחליף בוטים קיימים או למחוק תוכן קודם.
- [ ] 🟠 להוסיף ולבדוק runner לטורניר מלא: כל זוג בוטים, שני משחקים בצבעים הפוכים, כולל טל; לשמור PGN ותוצאות לכל משחק.
- [ ] 🟠 להריץ את הבדיקות הראשוניות לכל הבוטים ולתקן כישלונות.
- [ ] 🟠 להריץ טורניר מלא בענף העבודה ולשמור ראיות.
- [ ] 🟠 לפתוח PR, להמתין ל-CI ולמזג רק אחרי מעבר שערי האיכות.
- [ ] 🟠 ב-`main`: לעדכן README בתוצאות האמיתיות, להריץ מחדש את כל בדיקות החובה ואת הטורניר המלא כולל טל.
- [ ] 🟠 לוודא שאין commits או קבצים נחוצים ייחודיים לענף, שאין עבודה שתלויה בו, ורק אז למחוק את `player-data-batch`. אם אי אפשר להוכיח בטיחות, להשאיר אותו ולתעד.
- [ ] 🟠 רק לאחר השלמת כל השלבים לעיל: לבנות ויזואליזציה לבוט נבחר, לתעד את שלביה ב-README, להציג ארבעה משחקים מול טל, ואז להציע שלושה שדרוגים לבחירת המשתמש.

### מגבלות הרצה שצריך לזכור
הבדיקה הראשונית של סביבת העבודה הראתה שאין אפשרות לבצע `git clone` מתוך סביבת ההרצה הנוכחית בגלל כשל DNS ל-`github.com`. לכן עדיין לא הורצו מקומית build, בדיקות או משחקי טורניר במחזור החדש. יש להשתמש ב-GitHub Actions/runner זמין או לפתור את הגישה לפני שמסמנים בדיקות אלה כעברו.


## הרחבת הלולאה — 2026-10-22

**סטטוס עדכני: 🟠 התחיל.** אומת שהענף מכיל 50 הגדרות בוט פעילות, את קובץ Tal ואת 12 קובצי PGN היסטוריים: Anand, Anderssen, Capablanca, Carlsen, Fischer, Karpov, Kasparov, Marshall, Morphy, Nakamura, PolgarJ ו-Tal. עדיין אין ראיה לכך שכל השחקנים ההיסטוריים מלבד Tal נבנו כבוטים נפרדים, ולכן אין לסמן זאת כהושלם.

- [x] 🟠 הובהר סדר העבודה הסדרתי: בוט אחד עד שער מוכנות, ואז הבא; הטורניר ממתין לכולם.
- [ ] 🟠 להפיק ולאמת פרופילים ייחודיים ורפרטואר מתוך קובצי המקור עבור כל שחקן היסטורי נדרש.
- [ ] 🟠 להוסיף ארכיון משפטים ייחודי לכל בוט קיים ולהיסטוריים החדשים, בלי ציטוטים מומצאים.
- [ ] 🟠 להוסיף תאריך ושעה לכל משחק, PGN לכל משחק ו-PNG של העמדה הסופית.
- [ ] 🟠 להריץ טורניר מלא לפני המיזוג; כל זוג משחק פעמיים בצבעים הפוכים.
- [ ] 🟠 למזג רק אחרי הצלחה, ואז להריץ מחדש את כל הבדיקות ואת הטורניר ב-main, כולל Tal.
- [ ] 🟠 לעדכן README של main עם שתי גלריות משחקים, תוצאות מאומתות ופרטי המיזוג.
- [ ] 🟠 לבדוק אם מחיקת הענף בטוחה, בלי למחוק אותו אוטומטית.
- [ ] 🟠 רק אחרי כל האמור: ויזואליזציה, שני משחקי הדגמה מול Tal (אחד לכל צבע), ואז שלושה רעיונות לשדרוגים.

**מגבלת הרצה ידועה:** סביבת הכלים הנוכחית אינה מצליחה לבצע clone דרך DNS; לכן בדיקות וטורנירים ייחשבו כעוברים רק על סמך CI/runner ותוצאות מתועדות, לא על סמך בדיקת קוד בלבד.


**מחיקת הענף אינה חלק מהאוטומציה.** בדיקת הבטיחות היא לקריאה בלבד; מחיקה דורשת אישור נפרד ומפורש.


## עבודה ממוקדת — 2026-10-22

**סטטוס: 🟠 הוכן שינוי בענף `player-data-batch`; טרם אומת ב-CI.**

- [x] נבחר פרופיל התקפי אחד לעבודה: `Anderssen.pgn` → **The Immortal Gambit** (השם המוצג אינו שם השחמטאי).
- [x] שודרג הפרופיל עם ארכיון משפטים ייחודי לפי הקשר ו-`searchDepth: 5`; מנוע הבחירה מכבד עומק מוגדר עד תקרה 5.
- [x] שם בוט קפבלנקה שונה ל-**Cuban Endgame Maestro**; מזהה פנימי `capablanca` נשמר לתאימות.
- [x] הוספו בדיקות להסכמה בין manifest ל-runtime, לשם, לעומק החיפוש ולמקור ההיסטורי.
- [ ] להריץ build, `check:legends`, `check:bot-accuracy` וטורניר/holdout דרך CI; אין לסמן כוח משחק או מהלכים מבריקים כמאומתים לפני תוצאות.
- [ ] לבדוק בפועל זמני חשיבה של עומק 5. עומק גדול יותר לבדו אינו מבטיח מהלכים מבריקים; נדרשת בדיקת מנוע והשוואה על עמדות holdout.

**הערה:** לא שונתה רשימת כל הבוטים ולא נבנו כמה בוטים במקביל. זהו שינוי ממוקד בפרופיל ההתקפי הנבחר ובשם התצוגה של בוט הסיומים.

## ביקורת ארכיון מילים ושמות — 2026-10-22

**סטטוס: 🟠 שינוי הוכן בענף; נדרש CI על ה-commit האחרון.**

- בביקורת manifest נמצאו 61 בוטים וארכיוני משפטים תקינים מבחינת מבנה, אך משפטי fallback זהים הופיעו אצל עד 58 בוטים. לכן מבנה תקין לא הוכיח התאמה אישית.
- עודכן מחולל הארכיונים ל-v2: כל בוט מקבל שתי שורות מקוריות לכל קטגוריה (כללי, פתיחה, איומים, טקטיקה, סיום), לפי סגנון המשחק שלו ובתוספת זהות התצוגה. ארכיונים מותאמים ידנית של The Immortal Gambit, Cuban Endgame Maestro ו-The Magician from Riga נשמרים.
- נוספו בדיקות לגרסת הארכיון, ייחודיות משפטים, סכימה, ושוויון בין manifest לקובצי runtime.
- שמות התצוגה של 12 פרופילי ה-PGN יהיו כינויים בהשראת הסגנון, ולא שמות השחקנים האמיתיים. שמות המקור נשמרים במחקר לצורך עקיבות.
- בדיקת ה-holdout הנוכחית בודקת חוקיות וחפיפה מדויקת למהלך היסטורי; היא אינה ניתוח Stockfish מלא. לא נטען שהמהלכים המבריקים או איכות המשחק אומתו עד שיתווספו ויעברו בדיקות איכות עצמאיות.
- שערי האיכות הבאים: CI על הענף המעודכן, דוח holdout, בדיקת דפדפן, ואז משחקים מול יריבים מאתגרים לפי תוצאות הבדיקות. אין לסמן בוט כ"מחקה בצורה מופלאה" בלי מדידה ותיעוד.
- נוסף `scripts/check-historical-stockfish.mjs` ושולב ב-CI: ניתוח Stockfish בעומק 10 על מדגם holdout לכל אחד מ-12 הבוטים ההיסטוריים, עם מדידת centipawn loss, התאמה למהלך המנוע וסימוני הקרבות מועמדות. סף הקבלה עדיין לא אומת בהרצה.
- בדיקת סימולציה של מחולל v2 מול manifest הקיים: 610 שורות משפטים צפויות ל-61 בוטים, 610 ייחודיות, ללא כפילויות בין בוטים. זו בדיקת לוגיקת המחולל בלבד; המימוש בקובצי runtime ממתין להרצת הבנייה וה-CI.
- שודרג מנוע החיפוש: נוסף ניקוד עמדתי לרגלים, מרכזיות כלים, זוג רצים, טורים פתוחים, בטיחות מלך, מבנה רגלים ופעילות מלך בסיום; נוסף גם transposition table עם bounds ל-alpha-beta כדי להעמיק חישוב. כל זה ממתין עדיין לבדיקות ריצה על ה-commit החדש.

## טיפול ממוקד ב-Anand — 2026-10-22

**סטטוס: 🟠 תיקוני קוד ונתוני תצוגה הועלו; אימות ריצה על ה-commit האחרון עדיין ממתין.**

- שם התצוגה של פרופיל `anand` ושל ארכיון המשפטים שונה ל-`The Lightning Strategist`. המזהה הפנימי `anand` ומקור הנתונים נשמרו.
- ארכיון המשפטים מכיל שתי שורות בכל אחת מהקטגוריות `general`, `opening`, `threat`, `tactics`, `endgame`. בדיקה סטטית על שדות התצוגה והארכיון לאחר השינוי לא מצאה את השם האמיתי.
- נוספה תמיכה ב-`--only=anand` למחולל, לרבות מיזוג קובץ runtime רק עבור הבוט הנבחר ושמירת עדכון דוח המחקר בתוך מקטע Anand בלבד. ה-workflow משתמש באפשרות זו כדי לא לשנות פרופילים אחרים בתהליך העבודה הממוקד.
- נוספה בדיקת holdout מדווחת עבור ספירות הכאות, שח ומהלכי מלך מאוחרים בהשוואה בין מהלך הבוט למהלך ההיסטורי באותן עמדות. הספירות תיאוריות למדגם שנבחר ואינן מוצגות כשיעורי מהלכים ל-100 או כהוכחה לחיקוי סגנון.
- ה-workflow עודכן כך שטורניר מלא, ביקורת המשחקים ורינדור הראיות שלהם ירוצו רק ב-`workflow_dispatch` עם `tournament_approved=true`; אין להריץ טורניר כחלק מ-PR רגיל.
- **עדיין לא מאומת:** מחולל המקור לא הורץ בפועל על ה-commit החדש בסביבת CI זמינה. לכן `sourceGeneratorVersion` בנתוני Anand נשאר `3` עד לבנייה אמיתית בגרסה 4. בדיקות build, `check:legends`, holdout, Stockfish ודפדפן על ה-head האחרון עדיין ממתינות; אין לסמן את הבוט כמאומת עד לקבלת תוצאות.
- ריצת Actions `39727257171` נוצרה לפני תיקון שער הטורניר והיא עדיין פעילה לפי הבדיקה האחרונה. יש לבטל אותה ידנית לפני שהיא מגיעה לשלבי הטורניר; אין להשתמש בתוצאותיה כאימות ל-commit הנוכחי.

## Anand — מחזור תיקון ואימות ממוקד — 2026-10-22

**סטטוס: 🟠 בתהליך; קוד בדיקה תוקן, בנייה ובדיקות על ה-commit החדש עדיין ממתינות ל-CI.** העבודה מוגבלת ל-Anand. אין להתחיל פרופיל נוסף ואין להריץ טורניר מלא ללא אישור מפורש נפרד.

- [x] נבדקו מחדש ה-manifest וקובץ runtime העדכניים בענף. שם התצוגה בשניהם כבר `The Lightning Strategist`; לכן לא בוצע שינוי שם מיותר.
- [x] נבדק ארכיון Anand הקיים: חמש הקטגוריות קיימות, שתי שורות ייחודיות בכל קטגוריה, והטקסטים שנבדקו אינם כוללים את השם האמיתי. זו בדיקה סטטית של הקבצים, לא הוכחה שה-build העדכני או כל משטח UI עברו.
- [x] תוקן `scripts/check-legends.mjs`: בדיקת Anand השתמשה במשתנה `phrases` מחוץ לתחום ההגדרה שלו, דבר שהיה גורם ל-ReferenceError. הבדיקה מחשבת כעת את המשפטים מתוך ארכיון Anand ובודקת גם את `quips` נגד דליפת השם וכפילויות.
- [x] נבדק דוח holdout קודם מהריצה `39727257171` כקו בסיס בלבד: 6/24 התאמות מהלך מדויקות (25%), ובפתיחה 0/6. הדוח שייך ל-commit ישן עם פרופיל/קוד ישנים ולכן אינו אימות של השינוי הנוכחי.
- [x] נמצא פער במנגנון הפתיחות: השוואת FEN מלא כללה גם מוני חצי־מהלך ומספר מהלך. נוספה אפשרות `openingMatchMode: "position"` ל-Anand בלבד; היא משווה את ארבעת שדות המיקום הרלוונטיים, ובודקת שהמהלך עדיין חוקי. בוטים ללא הדגל שומרים על ההתנהגות הקודמת.
- [x] נוספה בדיקת רגרסיה ב-`scripts/check-historical-holdout.mjs`: היא משנה את מוני ה-FEN ובודקת שהרפרטואר של Anand עדיין מזוהה, ושבלי הדגל ההתאמה המורחבת אינה פעילה.
- [ ] לבנות מחדש את Anand בלבד באמצעות `--only=anand`. בקובץ runtime שנבדק `sourceGeneratorVersion` עדיין שווה 3, בעוד שערי האיכות מצפים לגרסה 4; אין לסמן את פרופיל המקור כעדכני עד שתושלם בנייה אמיתית.
- [ ] לאמת לאחר הבנייה את ה-hash של מקור PGN, ספירת משחקי האימון וה-holdout, חלוקת הצבעים, הרפרטואר והסכמה בין manifest לקובץ runtime.
- [ ] להריץ `check:legends`, בדיקת holdout ו-Stockfish, build ובדיקת דפדפן. לשמור תוצאות אמיתיות ולדווח בנפרד על כל כישלון.
- [ ] אחרי קבלת התוצאות, לעדכן סטטוס רק לפי הראיות. אין טורניר מלא, מיזוג, פריסה או התחלת הבוט הבא כחלק מהמחזור הזה.

- [ ] **שער CI ממתין להפעלה ידנית:** לאחר עדכון הענף, לא נמצא workflow run המשויך ל-head הנוכחי. ההרצה הירוקה האחרונה `39727257171` רצה על קוד ישן עם פרופילי generator v3, ולכן אינה מאמתת את תיקון FEN או את בדיקת הרגרסיה החדשה. יש להריץ את `Verify project` על `player-data-batch` עם `tournament_approved=false`; כך יופעלו בדיקות האיכות בלי טורניר מלא.


## Anand בלבד — עיצוב פרופיל ממוקד (2026-10-22)

- [x] אושר לעבוד על Anand בלבד; הכינוי הקיים `The Lightning Strategist` נשמר.
- [x] נכתב ארכיון חדש של 10 משפטים מקוריים בעברית, בשתי שורות לכל אחת מחמש הקטגוריות; אין לייחס אותם לציטוטים היסטוריים.
- [x] עודכנו הכותרת, התיאור והטקסט הקצר של הפרופיל לכיוון אוניברסלי־דינמי.
- [x] הוגדר פרופיל סגנון ייחודי ל-Anand בלבד עם בונוסים קטנים לפיתוח כלים, שליטה במרכז, הצרחה ופעילות מלך; אלה היוריסטיקות ולא טענה לשחזור מחשבות השחקן.
- [x] נוספו בדיקות רגרסיה לשדות הסגנון ולארכיון המשפטים.
- [ ] ממתין להרצת המחולל על Anand בלבד, אימות hash ומדדי המקור, בדיקות holdout/Stockfish, build ובדיקת דפדפן.
- [ ] אין שינוי מתוכנן לבוט אחר; אין טורניר מלא, מיזוג או פריסה במסגרת העבודה הזאת.


## בקשת אימות Anand — 2026-10-22

- [x] אושר להמשיך את Anand בלבד.
- [x] נבדק שההרצה הירוקה האחרונה (39727257171) קדמה ל-head הנוכחי ואינה ראיה לאימותו.
- [ ] להריץ את workflow `Verify project` על ה-head הנוכחי עם `tournament_approved=false`; אין להריץ טורניר מלא.
- [ ] לאשר ש-`sourceGeneratorVersion` עלה ל-4 רק לאחר שהמחולל רץ בפועל ושמר את הפרופיל.
- [ ] לתעד תוצאות CI, holdout, Stockfish, build ובדיקת דפדפן לפי תוצאות אמיתיות בלבד.
- [ ] לא למזג, לפרוס, למחוק ענף או להתחיל בוט אחר במחזור הזה.


## לקחים מקפבלנקה והניסיון הבא של CI — 2026-10-22

**ממצאים מאומתים:** ה-commit של Capablanca הוא `4caf311fb6b99121d79c563c77dc8832d2fcfc21`. ריצת Actions `39732399007` הסתיימה בהצלחה על אותו commit בתוך כ-2 דקות ו-36 שניות. היא עברה יצירת פרופיל Capablanca, בדיקות release structure, production build, בדיקת דפדפן ובדיקת דיוק טקטי דטרמיניסטית. היא לא מאמתת את Anand או את ה-head הנוכחי.

**מה לומדים ומיישמים עכשיו:**
- לשמור על בנייה ממוקדת של בוט אחד: Capablanca נבנה לבדו, וגם ניסיון Anand צריך לגעת רק ב-Anand.
- להפריד יצירת נתונים מבדיקות: ה-workflow כבר בודק אם צריך לבנות את Anand ומריץ את המחולל פעם אחת. קודם `check:release` הריץ את אותו מחולל שוב כחלק מהפקודה שלו, ולכן הסרנו את הבנייה הכפולה מה-script; שלב ה-workflow נשאר המקור היחיד לבניית פרופיל.
- הצלחה קודמת נחשבת ראיה רק ל-commit שעליו היא רצה. ניסיון חדש צריך להסתיים על ה-head הנוכחי, ולתעד תוצאות holdout, Stockfish, build ודפדפן בפועל.
- ריצת ה-PR משתמשת באותה קבוצת concurrency, `verify-17`, עם `cancel-in-progress: true`. דחיפת התיקון לענף תגרום ל-GitHub לבטל את הריצה הקודמת ולהפעיל run חדש על ה-commit המעודכן. אין להריץ טורניר מלא, למזג או לפרוס.

**סטטוס:** תיקון תהליך הבנייה הכפולה הוכן לקראת ניסיון CI חדש. אין לסמן את Anand כמאומת עד שה-run החדש יסתיים וכל שערי האיכות הרלוונטיים יעברו.


## תיקון Magnus Carlsen והכנת תוכנית לבוטים הבאים — 2026-10-22

**שורש הבעיה שאומת בקוד:** `carlsen.json` וה-manifest היו ב-`sourceGeneratorVersion: 3`; המחולל דחה במפורש `--only=carlsen` ודילג על Carlsen גם בלולאת הבנייה וגם בלולאת הנרמול. בנוסף, `check-legends.mjs` ציפה לגרסה 3 ולשם התצוגה האמיתי `Magnus Carlsen`, ושני שערי האיכות `check-historical-holdout.mjs` ו-`check-historical-stockfish.mjs` החריגו אותו ודיווחו `excludedByRequest: ['carlsen']`. לכן הפרופיל שלו לא עבר אותו מסלול אימות כמו שאר פרופילי המקור, ולא ניתן היה לבנות אותו מחדש דרך המסלול הממוקד.

- [x] נמצא מקור הנתונים `Carlsen.pgn` והפרופיל הקיים מציג 7,815 משחקים, 7,035 אימון ו-780 holdout; זהו baseline שנוצר בגרסה 3, לא תוצאת בדיקה עדכנית.
- [x] תוקן המחולל כדי לאפשר `--only=carlsen` ולהסיר החרגות מיוחדות.
- [x] תוקן חוזה הבדיקה לצפות בגרסה 4 ובכינוי `The Relentless Grinder`.
- [x] בדיקות holdout ו-Stockfish יכולות לבחור בוט יחיד דרך `HISTORICAL_BOT_IDS`; כברירת מחדל הן בודקות את כל פרופילי המקור, כולל Carlsen.
- [ ] להריץ את workflow החדש ולוודא ש-Anand ו-Carlsen נבנים ברצף, ואז release checks, build, holdout, Stockfish, דיוק טקטי ודפדפן.
- [ ] לאשר לפי תוצאות אמיתיות ש-`sourceGeneratorVersion: 4` וה-hash נשמרו ושכל השערים עברו. אין לסמן הצלחה מראש.

תוכנית הבוט הבא וכל שאר הפרופילים נשמרה ב-`docs/LEGENDS_BOT_ROADMAP.md`. לפי רצף העבודה הקיים, Marshall הוא הבא לאחר השלמת Anand ואישור המעבר; אין להתחיל אותו כחלק מתיקון Carlsen.


## אבחון כשל Carlsen — 2026-10-23

**ממצא מתוך יומן Actions:** הבנייה הממוקדת של Anand ו-Carlsen הסתיימה, אך `check:release` נעצר ב-`scripts/check-legends.mjs` עם `Historical phrase archive version is stale: marshall`. הכשל נבע משער רחב מדי שהחיל דרישת ארכיון v2 על פרופיל היסטורי ישן שלא נבנה במחזור הזה. בנפרד, commit התוצאות נדחה כי הענף התקדם בזמן הריצה.

- [x] זוהתה סיבת הכשל מתוך יומן הריצה, לא מהשערה.
- [x] נבדק שהגרסה העדכנית בענף מצמצמת את בדיקת גרסת הארכיון לפרופילים שנבנו ב-generator v4.
- [x] נבדק שה-workflow העדכני מנסה לבצע fetch/rebase/push באופן בטוח ואינו דורס את ראש הענף.
- [ ] להריץ workflow חדש על ראש הענף הנוכחי: https://github.com/orenzbit/veyra-chess/actions.
- [ ] לאשר שכל שערי האיכות, כולל build, tactical accuracy, holdout, Stockfish ודפדפן, רצו בפועל והצליחו לפני טורניר.


## Retrospective and retry plan — 2026-10-24

**Observed run:** GitHub Actions run [39988893612](https://github.com/orenzbit/veyra-chess/actions/runs/39988893612) completed profile generation, profile contracts, production build, tactical checks and held-out checks, then remained at `Validate Stockfish move quality` for several hours. The job had no per-search timeout, so this is treated as a hung validation step, not as a pass.

**Root cause supported by code:** `scripts/check-historical-stockfish.mjs` waited indefinitely for Stockfish to emit `bestmove`; it used depth 10 and 8 positions per bot by default. A slow or stuck UCI search could hold the whole job open until the 360-minute workflow timeout.

**Retry approach:** rebuild all 12 PGN-backed historical profiles one at a time; after each non-Tal profile, validate manifest/runtime consistency and run one color-balanced qualification game against Tal for each non-Tal profile (never Tal versus itself); add a per-search timeout; use depth 8 and four held-out positions for the first bounded quality gate; then run all profile contracts, holdout checks, tactical accuracy and browser smoke test. Only after those pass, run the full 61-bot double round-robin, audit every PGN and pairing, and generate individual PGN/PNG evidence.

**Plan rating: 91/100.** Strengths: bounded engine searches, deterministic sequence, per-profile checkpoints, explicit pass/fail gates, per-game PGN files, and audit-backed tournament results. Remaining gap: this runner cannot invoke the ChatGPT model powering the current conversation as an opponent. It will not label a Stockfish or heuristic proxy as ChatGPT; those games require interactive play or a separately authorized model integration.

**Current status:** retry workflow is being prepared. No tournament result, podium, image, or ChatGPT game is considered complete until the corresponding run/artifact exists.


## Retry iteration 1 — 2026-10-24

**Run:** [40028170906](https://github.com/orenzbit/veyra-chess/actions/runs/40028170906) failed immediately at the first Anand build, before any profile was regenerated or qualification game was played.

**Root cause:** the workflow set `HISTORICAL_BOT_IDS` to all 12 IDs at the whole-loop step level. The profile generator intentionally rejects multiple IDs because it must build exactly one historical bot per invocation. The per-bot command already passes `--only=<id>`; the inherited multi-ID environment contradicted that contract.

**Correction:** remove the all-profile environment variable from the sequential build step. Set the full ID list only on validation steps that explicitly support multi-profile selection. No tournament ran in the failed attempt. The next retry is expected to start with Anand and continue serially.


## Retry iteration 2 — bounded qualification runtime — 2026-10-24

**Observation:** the full-loop retry passed dependency installation and the production build, then remained in the combined profile-build/qualification step for several minutes without completing. The prior run logs show each profile generator itself completes in under a second, so the likely expensive part is the game search; live step logs do not confirm the exact point, so this is recorded as a runtime risk rather than a proven defect.

**Correction:** the approved full-loop workflow caps qualification games at depth 2 and the full tournament at depth 3, and logs progress every 10 plies. The full tournament audit verifies the depth-3 cap was recorded. This bounds execution while preserving each bot's repertoire and style bonuses; it does not claim that depth-3 tournament play measures grandmaster strength.

**Revised plan score: 92/100.** Remaining risks are the total runtime of 3,660 games, the Stockfish quality gate, and the fact that the current ChatGPT model cannot be invoked as an opponent from GitHub Actions. No result or podium is considered complete before the run and audit pass.


## Retry iteration 3 — explicit progress and bounded qualification — 2026-10-24

The full-loop workflow was still in its combined build/qualification step after several minutes, and the live job interface did not expose enough log detail to identify the exact current bot. This does not prove a chess-engine hang, but it shows that a single opaque shell step is hard to supervise.

**Revision:** add an explicit start message for every game, keep per-10-ply progress logs, cap qualification search at depth 2, and wrap each qualification game in a 120-second hard timeout. The full round-robin is capped at depth 3 and wrapped in a 330-minute timeout, leaving time in the 360-minute job for audit, rendering, and artifact upload. The engine now uses a separate `searchDepthCap` field so capping depth does not accidentally disable the bots' existing rating-based move-noise setting.

**Plan rating: 93/100.** The approach is reproducible, bounded, and produces audit-verifiable PGNs. The main outstanding limitation is still that the current ChatGPT model cannot be invoked as an automated opponent by this runner; no substitute will be mislabeled.
