# תוכנית ביקורת: 12 בוטי השחמט ההיסטוריים

ענף שנבדק: `player-data-batch`  
מאגר: https://github.com/orenzbit/veyra-chess  
תחום: 12 הפרופילים שמקורם בקובצי PGN היסטוריים בלבד. אין לשנות בוטים בדיוניים.

## ממצאים משותפים שאומתו

1. **פער היקף בטורניר:** `.github/workflows/legends-full-loop.yml` מפעיל טורניר "61-bot double round-robin" למרות שהמשימה הנוכחית מוגבלת ל-12 בוטים היסטוריים. לפני הרצת הטורניר הבא, יש להגביל את משתתפי הטורניר ל-12 ההיסטוריים ולוודא שה-auditor מאמת את אותו היקף.
2. **כשל זמן של Marshall:** [Run 40029785021](https://github.com/orenzbit/veyra-chess/actions/runs/40029785021) נעצר ב-Marshall מול Tal אחרי 90 חצאי-מהלכים, עם exit code 124 לאחר מגבלת 120 שניות. [Run 40028170906](https://github.com/orenzbit/veyra-chess/actions/runs/40028170906) נכשל גם הוא במהלך הסמכת Marshall.
3. **כשל Stockfish מאומת:** [Run 39988893612](https://github.com/orenzbit/veyra-chess/actions/runs/39988893612) נכשל כי חיפוש Stockfish בעומק 8 עבר את מגבלת 30,000ms ב-FEN המתועד בלוג. הדוח לא נוצר, ולכן אין להסיק ממנו איכות משחק.
4. **מגבלת בדיקת הנאמנות:** `scripts/check-historical-holdout.mjs` בודק עד 12 עמדות לכל בוט, עד 4 מכל שלב משחק, ומשתמש בעומק קבוע לבדיקת התאמה למהלך היסטורי. הקוד עצמו מציין שחפיפה למהלך היסטורי היא מדד סגנון מקורב, לא מדד כוח שחמט.
5. **סגנון במנוע:** `src/bot-engine.ts` משתמש בהטיות כלליות לפי קטגוריית style, והעדפות `styleProfile` ייעודיות קיימות כרגע עבור Anand בלבד. זהו פער מוכח ברמת המימוש, אבל לא הוכחה שכל אחד מ-11 הבוטים האחרים דורש שינוי. נבדוק כל אחד בנפרד לפני כוונון.
6. **מצב המחולל בפרופילים הנוכחיים:** Anand, Marshall ו-Carlsen בגרסה 4; Anderssen, Fischer, Karpov, Kasparov, Morphy, Nakamura, Polgár, Tal ו-Capablanca בגרסה 3. ה-workflow מנסה לבנות כל פרופיל לפני שערי האיכות, אך הריצות שנבדקו נעצרו לפני שהוכח שכל 12 עברו את המחזור.

## סדר בדיקות חובה לכל בוט

1. מקור PGN, זהות שחקן, hash, ספירת משחקים, צבעים, תוצאות וחלוקת אימון/holdout.
2. בנייה בגרסת המחולל העדכנית ובדיקת התאמה בין manifest, runtime ורפרטואר.
3. חוקיות מהלכים ומצבי קצה.
4. איכות שחמט מול Stockfish עם timeout שמרני ותיעוד חלקי גם בכשל.
5. התאמת מהלכים היסטוריים בעמדות holdout פתיחה/אמצע/סיום.
6. מבחני הפתעה: מהלך חוקי חלופי של היריב בעמדה ממשחק אמיתי, מסומן כניסוי ולא כהיסטוריה.
7. ביצועים ו-CI.
8. רגרסיה לבוטים ההיסטוריים האחרים.

## כללי דיווח

- "בעיה שאומתה" רק כשיש ראיה בקובץ/לוג/ריצה.
- "סיכון אפשרי" אינו מוצג ככשל קיים.
- תוצאה חסרה או timeout אינם הצלחה.
- תיקון נחשב מאומת רק אחרי שהבדיקה שנכשלה עוברת ובדיקות הרגרסיה הרלוונטיות עוברות.
- לא למזג ל-main, לא לפרסם לפרודקשן ולא למחוק ענף במסגרת העבודה הזאת בלי אישור נפרד.

## תוכניות אישיות

1. [Anand / The Lightning Strategist](LEGENDS_BOT_PLANS/anand.md)
2. [Marshall / The Tactical Hammer](LEGENDS_BOT_PLANS/marshall.md)
3. [Anderssen / The Immortal Gambit](LEGENDS_BOT_PLANS/anderssen.md)
4. [Fischer / Bobby Fischer](LEGENDS_BOT_PLANS/fischer.md)
5. [Karpov / Anatoly Karpov](LEGENDS_BOT_PLANS/karpov.md)
6. [Kasparov / Garry Kasparov](LEGENDS_BOT_PLANS/kasparov.md)
7. [Morphy / Paul Morphy](LEGENDS_BOT_PLANS/morphy.md)
8. [Nakamura / Hikaru Nakamura](LEGENDS_BOT_PLANS/nakamura.md)
9. [Polgár / Judit Polgár](LEGENDS_BOT_PLANS/polgarj.md)
10. [Tal / The Magician from Riga](LEGENDS_BOT_PLANS/tal.md)
11. [Capablanca / Cuban Endgame Maestro](LEGENDS_BOT_PLANS/capablanca.md)
12. [Carlsen / השחקן הטוב בכל הזמנים](LEGENDS_BOT_PLANS/carlsen.md)
