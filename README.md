## תוספת פיצ'ר: שעון שחמט דיגיטלי מקצועי (Chess Clock) — 16.10.2026

בהשראת כלי השעון של **Chessigma** (`/tools/chess-clock`), נוסף ל-**Veyra Chess** מודול שעון שחמט דיגיטלי עצמאי, מדויק ורספונסיבי:

### מה בדיוק נוסף ושונה:
1. **מודול שעון שחמט חדש (`src/chess-clock.ts`):**
   - שעון דיגיטלי דו-צדדי (לבן ושחור) מבוסס `Date.now()` ברמת דיוק גבוהה ללא סטיית זמן (Anti-drift).
   - תמיכה מלאה במקצבי זמן פופולריים:
     - **Bullet:** 1+0, 1+1, 2+1
     - **Blitz:** 3+0, 3+2, 5+0, 5+3
     - **Rapid:** 10+0, 15+10, 30+0
     - **Classical:** 60+0
     - **Custom:** הגדרה חופשית של דקות ותוספת זמן (Increment) בשניות.
   - תוספת זמן (Fischer Increment) אוטומטית בכל מהלך.
   - מונה מהלכים (Move counter) עצמאי לכל צד.
   - תצוגת עשיריות שנייה כאשר הזמן יורד מתחת ל-10 שניות.
   - אינדיקציה קולית וויזואלית לסיום זמן ונפילת דגל (Flagged).
   - הגנת Debounce נגד לחיצות מגע כפולות במסכים ניידים.
   - תמיכה במקשי קיצור במקלדת (`Space` להעברת תור, `P` להשהיה, `R` לאיפוס).
2. **עיצוב וממשק ייעודי (`public/styles.css`):**
   - נוספו סגנונות עבור שעון השחמט עם ניגודיות גבוהה, כפתורי ענק מותאמים למגע ומחשב, והתראת דופק כשהזמן יורד מתחת ל-30 שניות.
3. **שילוב ניווט וניתוב (`src/main.ts`):**
   - חובר ניתוב `page === 'clock'` בתוך האפליקציה.
   - נוספו כפתורי ניווט מהיר '⏱️ שעון' בסרגלי ה-Top bar.
4. **תמיכה דו-לשונית (`src/i18n.ts`):**
   - נוספו תרגומים מלאים לעברית ולאנגלית עבור כל מונחי השעון והמקצבים.

---

## מצב עדכני והחלטות טכניות — 16.10.2026

> **מצב אמיתי:** החלפת מנוע חוקי השחמט והגנת הבוטים משולבות בקוד `main`. בדיקת CI מלאה עברה על commit סמוך, אך עדיין אין הוכחה לשקילות של 100% לכל ה־API הישן או לאימות מלא של הפריסה החיה. הענפים הישנים עדיין קיימים ולא נמחקו.

### 1. החלפת מנוע חוקי השחמט

- מנוע חוקי השחמט בפרויקט הוא `js-chess-engine` ברישיון MIT, יחד עם שכבת תאימות מקורית של Veyra: `rules-src/chess-compat.mjs`.
- `scripts/build-rules.mjs` מאגד את שכבת התאימות ואת המנוע לתוך `public/vendor/veyra-rules/chess-compat.js`. קובץ הרישיון של המנוע נמצא ב־`public/vendor/veyra-rules/LICENSE-js-chess-engine.txt`.
- `package.json` כולל את `js-chess-engine` ואת כלי הגנת האדם `altcha-lib`; `public/vendor/chessjs/` אינו קיים בענף `main`, והספרייה הישנה אינה תלות runtime של הפרויקט.
- החלטת המימוש: לא להעתיק מחדש את ענף ההחלפה הישן בשלמותו. שכבת המנוע כבר קיימת ב־`main`, ואילו בדיקת ההשוואה שבענף הישן מסתמכת על ייבוא חיצוני של ספריית המנוע הקודמת. לא החזרנו תלות כזו למוצר.

### 2. מה שכבת התאימות מספקת

ה־API של Veyra נכתב מחדש כדי לכסות את הפעולות שהוגדרו ונבדקו בפרויקט. בין היתר, בדיקות `scripts/check-rules.mjs` כוללות:

- יצירת עמדה התחלתית, מהלכים חוקיים, SAN, תור, FEN והיסטוריית מהלכים.
- ספירת מהלכים מוכרת לעמדה ההתחלתית (perft): 20 בעומק 1, 400 בעומק 2 ו־8,902 בעומק 3.
- הצרחה, הכאה דרך הילוכו, קידום רגלים לכל האפשרויות, מט ופט.
- תיקו בחומר לא מספיק, חוק 50 המסעים, חזרה משולשת וביטול מהלך.
- ייבוא/ייצוא PGN בסיסי, כותרות, מהלכים ושחזור העמדה.

**הגבול החשוב:** אלה בדיקות של ההתנהגויות שהוגדרו ב־Veyra, לא הוכחה שכל מתודה, אפשרות, תוצאת שגיאה או מקרי קצה של `chess.js` הועתקו אחד לאחד. אין להציג את המימוש כתחליף drop-in מלא לפני השלמת השוואה שיטתית לכל הקריאות בפועל באפליקציה ולמקרי קצה של FEN/PGN.

יש גם סיכון תחזוקה ידוע: `rules-src/chess-compat.mjs` משתמש בפרטים פנימיים של `js-chess-engine` ובונה מופע `Game` באמצעות prototype ומתאם פנימי. שינוי עתידי בגרסת המנוע עלול לשבור את השכבה, ולכן יש להריץ את בדיקות החוקים אחרי כל עדכון תלות. מפרש ה־PGN בשכבה הוא מימוש מותאם ופשוט יחסית, ולא הוכחה לתמיכה בכל וריאציות PGN המורכבות.

בענף הישן `replace-chessjs` קיים `scripts/test-rules-diff.mjs`, שמיועד להשוות מהלכים מול oracle חיצוני. הודעת commit באותו ענף תיעדה ריצה של 110 משחקים ללא אי־התאמות, אבל זו אינה בדיקה שרצה על ה־`main` העדכני, והסקריפט עצמו לא הועתק ל־`main` משום שהוא דורש את הספרייה הקודמת כ־oracle. לכן אין לספור את ההרצה ההיסטורית כהוכחה ל־100% תאימות או ל־100% תקינות של כל ה־API.

### 3. רישוי וקרדיטים

- קוד המנוע `js-chess-engine` מסומן ב־MIT; הקרדיט מפנה למאגר המקור ומציין את Josef Jadrny וזכויות היוצרים © 2020.
- עודכן `public/credits.html` בעברית ובאנגלית: נוסף קישור למאגר, הובהרו השימוש במנוע ושכבת התאימות של Veyra, והוסרה רשומת `js-chess-engine` כפולה ומיושנת שטענה שהשילוב עדיין בתהליך.
- שינוי הקרדיטים נשמר ב־commit [`134c8241dc1b92fb4aa312f2d081eb0226e1a8de`](https://github.com/orenzbit/veyra-chess/commit/134c8241dc1b92fb4aa312f2d081eb0226e1a8de).
- `npm run check:mit-only` בודק את שורות הרישיון שמתועדות ב־`THIRD_PARTY_NOTICES.md`. הוא אינו תחליף לאודיט משפטי מלא של כל חבילת npm, נכס גרפי או תוכן בפרויקט.

### 4. הגנת בוטים ואימות אדם

- הגנת ALTCHA מתארחת מקומית בפרויקט ומשמשת לבדיקת אנושיות לפני הגישה לאתר ולנתיבי API מוגנים. היא משתמשת ב־proof-of-work וב־cookie חתום, עם בדיקות נוספות בפונקציות הרלוונטיות והגבלת קצב בקשות.
- משתנה הסביבה `BOT_CHALLENGE_SECRET` נדרש ב־Netlify. לפי הקוד, היעדרו גורם ל־HTTP 503 בכוונה (fail closed); זו התנהגות בטיחותית, אבל פירושה שהאתר לא יהיה זמין עד להגדרה.
- הבדיקות האוטומטיות נמצאות ב־`scripts/check-human-gate.mjs` ומופעלות דרך `npm run check:human`; הן מכסות בין היתר פתרון אתגר, דחיית תשובות מזויפות/חוזרות, תוקף cookie והגבלת קצב.
- הגדרת משתני הסביבה בפועל ופעולת האתר בפריסת Netlify החיה **לא אומתו במסגרת העדכון הזה**. מעבר CI אינו מוכיח שהסודות מוגדרים נכון בסביבת הפריסה.

### 5. החלטות מיזוג וניקוי הענפים

- `main` כבר מכיל את שכבת חוקי השחמט, הקובץ שנוצר ממנה והגנת ALTCHA, ולכן לא בוצע מיזוג נוסף של ענפים ישנים שעלול להחזיר קוד מיושן או תלות לא רצויה.
- PR מס׳ 1 (`bot-protection`) נסגר ללא מיזוג, כי המנגנון כבר נמצא ב־`main` וה־PR היה מיושן ולא בר־מיזוג. PR-י QA מס׳ 2–5 גם הם סגורים ללא מיזוג; קובצי probe זמניים לא הוכנסו ל־`main`.
- בבדיקה האחרונה הענפים `replace-chessjs`, `bot-protection`, `qa/admin-security-20261014` ו־`qa/sync-verification-final` עדיין הופיעו ב־GitHub. **לא נמחק אף ענף**: פעולת מחיקת ענף אינה זמינה בחיבור GitHub ששימש לעדכון זה. סגירת PR אינה מוחקת את הענף.
- אין כרגע ממצא שמצדיק למזג את ענפי העבודה הישנים בשלמותם. לפני מחיקת ענף יש להשוות שוב את תוכנו ל־`main` ולהבטיח שאין בו עבודה ייחודית שלא נשמרה.

### 6. מצב הבדיקות שאפשר להוכיח

- ריצת GitHub Actions [38910185049](https://github.com/orenzbit/veyra-chess/actions/runs/38910185049) הסתיימה ב־Success עבור commit `194e756941e655129ac2776331312218f51040d5`. ה־workflow דיווח הצלחה בבדיקות TypeScript/מוצר, ארכיון, סנכרון חשבון, בדיקות release, production build ובדיקת bundle של מנוע החוקים.
- לאחר מכן נוצר commit [`8bc7c2390463ca7b268a7ffc8d2c07af49ac57bf`](https://github.com/orenzbit/veyra-chess/commit/8bc7c2390463ca7b268a7ffc8d2c07af49ac57bf), ששינה רק את הקובץ שנוצר אוטומטית `public/vendor/veyra-rules/chess-compat.js`. אחריו עודכן קובץ הקרדיטים ב־commit `134c8241...`; עדכון README זה הוא תיעוד נוסף.
- הריצות הקודמות שנכשלו נשארות בהיסטוריית GitHub, ואינן מוצגות כהצלחות. יש להעריך כל ריצה לפי ה־commit והתוצאה שלה.
- **מה עדיין חסר להכרזת release מלאה:** ריצת CI ישירה על ה־SHA העדכני לאחר שינוי התיעוד; בדיקת browser end-to-end על פריסת Netlify בפועל; אישור שמותני הסביבה מוגדרים; בדיקות PGN/FEN מורכבות והשוואה שיטתית של כל קריאות ה־API שבהן משתמש המוצר; ולבסוף מחיקת ענפים רק אחרי אימות שאין בהם עבודה ייחודית.

### סיכום קצר

הוחלף מנוע חוקי השחמט ל־`js-chess-engine` עם שכבת תאימות של Veyra תחת MIT; נוצר bundle לדפדפן ונוספו בדיקות חוקים; קרדיט המנוע עודכן; הגנת ALTCHA והבדיקות שלה נמצאות ב־`main`; PR הבוטים הישן נסגר ללא מיזוג. **לא הוכחה תאימות מלאה של 100% ל־API הקודם, לא אומתה הפריסה החיה, וענפי העבודה טרם נמחקו.**

---

# Veyra Chess

גרסת Web של Chess Review Coach עם Review, Coach, 20 בוטים, מסלול התקדמות, Adaptive Bots, Admin Panel ועטיפת Windows כ-PWA.


## עדכון ארכיון המשחקים והמיתוג — 14.10.2026

הסעיף הזה מתעד **מה השתנה במוצר ולמה**, ולא רק רשימת קבצים. הוא משלים את הוראות ההרצה והמידע המקורי שב־README; שום חלק מהתיעוד הקודם לא הוסר.

### מה המשתמש רואה עכשיו

- אחרי הכניסה, ברירת המחדל היא ארכיון המשחקים במקום מסך הניתוח הישיר.
- אפשר לבחור Chess.com או Lichess, להזין שם משתמש ציבורי ולטעון עד 100 משחקים אחרונים.
- המשחקים מוצגים בקבוצות לפי יום. כל קבוצה מציגה סיכום ניצחונות, הפסדים ותיקו, וכרטיס מציג יריב, דירוג, קצב, זמן, פתיחה, מספר מהלכים וסיבת סיום ככל שהמידע קיים.
- כרטיס **Analyze** טוען את ה־PGN למסך Review הקיים. הוא לא מפעיל את המנוע אוטומטית: לאחר המעבר אפשר ללחוץ על כפתור הניתוח הקיים.
- קיימת שורת הדגמה בשם **Opponent Gamma**. היא משחק בדיקה קבוע, לא משחק שנשלף מחשבון אמיתי, ולא נספרת בתוצאות הארכיון.
- לאחר ניתוח משחק ארכיוני, תג Accuracy יכול להופיע בכרטיס. תוצאות הסקירה מסתנכרנות לחשבון המשתמש בשרת, לצד שמירת עותק מקומי; משתמשים באותו חשבון יכולים לראות אותן גם בדפדפן או במכשיר אחר.
- תגי שעון מסוג `[%clk ...]` מוצגים ליד המהלכים כשה־PGN שסופק כולל אותם.
- המיתוג הטקסטואלי **OREN AND CLAUDE** הוחזר לכותרות העליונות יחד עם שם המסך/המוצר. לא נדרש קובץ תמונה חיצוני.

### איך החיבור עובד

```text
כניסה / התחברות
       ↓
ארכיון המשחקים
       ↓
Chess.com או Lichess — מידע ציבורי
       ↓
נרמול נתוני המשחק ו־PGN
       ↓ Analyze
טעינת המשחק במנגנון ה־PGN הקיים
       ↓
מסך Review + לוח cm-chessboard + Coach
       ↓ לחיצה מפורשת על ניתוח
מנוע Chessy WASM הקיים
```

הארכיון והממשק החדשים לא מחליפים את מנגנון חוקי השחמט, הלוח או המנוע. הם מוסיפים מסך בחירת משחק ומחברים ממנו את ה־PGN למסך הקיים.

### מה שונה ברמת המוצר

**טעינת משחקים:** Chess.com נטען מתוך רשימת ארכיונים חודשיים ציבוריים, מהחדשים לישנים, עד 100 משחקים; Lichess משתמש בייצוא משחקים ציבורי עם עד 100 משחקים ותגי שעון. שם המשתמש נשמר ב־localStorage כפי שנעשה קודם. לא מבקשים סיסמת Chess.com או Lichess.

**העברה ללוח:** מעבר דרך Analyze מפעיל את טעינת ה־PGN הקיימת, מעביר למסך Review ושומר על הלוח, רשימת המהלכים והמאמן הקיימים. נוספה גם הגדרה מחדש של הלוח בעת חזרה למסך Review, מפני שהלוח אינו מוצג בזמן שנמצאים בארכיון.

**שגיאות וניסיון חוזר:** טעינה שנכשלה מציגה הודעה וכפתור ניסיון חוזר במקום להשאיר את המשתמש בלי הסבר. אם שירות חיצוני מגביל בקשות, מוצגת הודעה מתאימה.

**תוצאה ו־Accuracy:** תוצאות מוצגות מנקודת המבט של המשתמש שמזוהה ב־PGN/נתוני המשחק, ככל שהמידע מאפשר. תג ה־Accuracy המקומי מתווסף רק אחרי הפעלת ניתוח במשחק הארכיוני.

**מיתוג:** המסך החדש קיבל תחילה כותרת משלו שהראתה רק Veyra Chess ולא השתמשה ברכיב מותג משותף — לכן OREN AND CLAUDE לא הופיע בכותרת הארכיון. בבדיקת snapshot של main מלפני שינוי הארכיון לא נמצא הביטוי המדויק בקוד המעקב, ולכן אין בסיס לטעון ששורת קוד מסוימת עם השם נמחקה באותו שינוי. התיקון מוסיף כעת רכיב מיתוג טקסטואלי משותף לכותרות העליונות, בלי לוגו תמונה.

### פירוט הקבצים ששונו ונוספו

| קובץ | סוג השינוי | מה הוא עושה ולמה |
|---|---|---|
| `src/main.ts` | קובץ קיים — השתנה | נוספו מצב הארכיון, בחירת ספק, מצבי טעינה/שגיאה, קבוצות לפי יום וכרטיסי משחק; מסך הארכיון הוגדר כמסך הכניסה לאחר התחברות; Analyze מחבר בין המשחק הנבחר ל־Review; תגי שעון מוצגים ברשימת המהלכים; הלוח נוצר מחדש אחרי ניווט; נוסף רכיב מותג משותף. רשימת Chess.com/Lichess הישנה שהייתה בתוך מסך Review הוחלפה באזור המשחקים השמורים, מפני שבחירת משחק מתבצעת כעת בארכיון. טעינת PGN ידנית ומשחקים שמורים נשארו. |
| `public/styles.css` | קובץ קיים — השתנה | נוספו כללי עיצוב מוגבלים למחלקות `.archive-*` עבור הרקע הכהה, הכרטיסים, פסי תוצאה, כפתורי Analyze, תגי Accuracy והתאמה למסכים קטנים. נוספו גם כללי טקסט למיתוג OREN AND CLAUDE. עיצוב שאר המסכים נשמר ככל האפשר. |
| `src/game-archive.ts` | קובץ חדש | מרכז את טיפוסי המשחק, קריאת נתונים ציבוריים מ־Chess.com/Lichess, נרמול PGN ומידע כמו תוצאה/דירוג/פתיחה/זמן, טיפול בשגיאות, ומשחק ההדגמה Opponent Gamma. הוא מפריד את לוגיקת הארכיון מקומפוננטת הממשק הגדולה. |
| `GAME_ARCHIVE_HANDOFF.md` | קובץ חדש | מסירת הקשר טכני ל־AI הבא: זרימת הנתונים, התנהגות המנוע והלוח, שמירת Accuracy, קבצים שנגעו בהם ומה עדיין צריך לבדוק. |
| `README.md` | קובץ קיים — השתנה | נוסף הסבר קריא למשתמש בעברית, כולל תרשים הזרימה, התנהגות הארכיון, פירוט הקבצים, החלטות שימור ומגבלות הבדיקות. הוראות ההתקנה המקוריות נשארו. |

### מה לא נמחק ולא הוחלף

לא נמחקו קבצים. לא הוחלפו הלוח `cm-chessboard`, מנוע Chessy WASM, קובצי המנוע, Coach, פונקציות ההתחברות, שער הגישה, פונקציות Netlify, בוטים, מאגרי פתיחות או הגדרות הפריסה. הממשק הישן של בחירת משחקי Chess.com/Lichess בתוך מסך Review הוסר והועבר מבחינת תפקידו לארכיון; אזור ה־PGN הידני והמשחקים השמורים נשארו.

### בדיקות ומגבלות ידועות

- ה־Push ל־GitHub אושר ונבדק לפי קיום הקבצים וה־commits.
- **לא הורץ `npm run build` בסביבת העבודה הזו**, לכן אין לטעון שהקומפילציה או הפריסה אומתו.
- תוצאות סקירת הארכיון ותגי Accuracy נשמרים מקומית ומסתנכרנים גם דרך `/api/sync` לחשבון המאומת, בהתאם למגבלות הסנכרון שמפורטות בהמשך README.
- לפני הכרזה שהכול עובד, יש להריץ את פקודות הבדיקה שכבר רשומות ב־README, ולאחר מכן לבדוק טעינת 100 משחקים בשני השירותים, Analyze של Opponent Gamma, מעבר הלוך־ושוב לארכיון והצגת תגי שעון ב־PGN מתאים.

### היסטוריית השינוי של הארכיון

- [הוספת הארכיון והעברת המשחק ללוח](https://github.com/orenzbit/veyra-chess/commit/5505ceef783f81a92785dc922efbd60e7e6e893b)
- [תיקון סדר המשחקים ותיקון נתוני ההדגמה](https://github.com/orenzbit/veyra-chess/commit/ea3b1e65a4cda90e8e133ca6a04e31c9e0400b5f)

לתיעוד הטכני המיועד לסוכן שממשיך את העבודה, פתח גם את [GAME_ARCHIVE_HANDOFF.md](GAME_ARCHIVE_HANDOFF.md).


## בדיקת הפרויקט — 14.10.2026

### היקף הבדיקה

נסקרו מבנה הפרויקט והחיבורים המרכזיים: אפליקציית TypeScript, ארכיון המשחקים, מסכי Review/Coach/בוטים/פתיחות/Admin, סקריפטי build ובדיקות, פונקציות Netlify, Edge Function של שער הגישה, סכימת Supabase, קובצי מדיניות ונתוני בוטים. הבדיקה הזו אינה תחליף לבדיקת דפדפן או לבדיקת הרשאות מול סביבת Supabase האמיתית.

### תקלה שנמצאה ותוקנה

במסך Admin, כפתור דחיית בקשת גישה שלח `DELETE` אל `/api/admin-access`, אבל פונקציית השרת תומכת ב־`GET` וב־`POST` בלבד. כתוצאה מכך הבקשה לא נדחתה במסד הנתונים, אף שהממשק הסיר אותה מהרשימה המקומית. התיקון שולח כעת `POST` עם `decision: 'reject'` — פעולה שהשרת כבר תומך בה — ומסיר את הבקשה מהמסך רק אחרי אישור הצלחה מהשרת.


### ממצאי בדיקת ה־CI ותיקון

ה־Workflow הראשון רץ בפועל ונכשל בבדיקת TypeScript לפני שלב ה־build. השגיאה הייתה בביטוי JSX-like שנבנה באמצעות `React.createElement` עבור רשימת המשחקים השמורים בארכיון: היו בו סוגריים לא מאוזנים (`src/main.ts`, באזור שורת 704). הביטוי פורק לשורות והסוגריים הותאמו. בנוסף, ה־Workflow עבר ל־Node 24 משום ש־`js-chess-engine@2.4.6` מצהירה על דרישה ל־Node `>=24`; קודם הופיעה אזהרת EBADENGINE תחת Node 22.

**הסטטוס לאחר התיקון: עבר.** הרצת GitHub Actions עבור ה־Commit `e56fc02bad0909815dad111d0ee840a4fc9b419e` הסתיימה ב־Success: התקנת התלויות, `check:archive`, `check:product`, `check:release` ו־`npm run build` עברו. [לצפייה בתוצאות המלאות](https://github.com/orenzbit/veyra-chess/actions/runs/38604643130). הריצה הקודמת אכן נכשלה על שגיאת התחביר שפורטה למעלה; היא נשמרת בהיסטוריה ולא נספרת כהצלחה.

### גבולות האימות

- בדיקת ה־CI מאמתת TypeScript, סקריפטי בדיקה ובניית production; היא אינה מריצה דפדפן אוטומטי או משחק אמיתי מול חשבונות Chess.com/Lichess.
- לא בוצעה בדיקת end-to-end מול Supabase המחובר בפועל, משום שהדבר תלוי במשתני הסביבה ובנתוני הפרויקט הפרטי.
- GitHub Actions מריץ התקנת תלויות נעולה, בדיקות מוצר, בדיקות release ו־production build בזרימת הפיתוח שהוגדרה לפרויקט.
- מסך הבוטים כולל 20 יריבים ומנגנון התקדמות: רק בוטים שנפתחו זמינים, וניצחון פותח את הבא.
- עמוד Adaptive נפרד, עם opt-in מקומי לפני שליחת סיגנלים לשרת.
- Admin Panel בצד המוצר, עם אימות server-side, עריכת פרופילי בוטים וקריאת סטטיסטיקות.
- עמוד Windows שמפנה להתקנה כאפליקציית PWA, כך שאין שכפול של מנוע/Review/Coach.
- עמוד Credits מרכזי וכתובת תמיכה: `orennzb@gmail.com`.
- Private Beta gate עבר ל-cookie חתום HMAC עם HttpOnly/Secure/SameSite ו-rate limit בסיסי.
- כל פתיחת חשבון חדשה דורשת אישור ידני של המפעיל: בקשת גישה שולחת קוד חד־פעמי בן 6 ספרות למפעיל, הקוד תקף ל-12 דקות ולשימוש יחיד בלבד.
- API server-side עבור telemetry, adaptive signals ו-bot overrides.
- סכימת Supabase עם RLS עבור נתוני השרת.

## Admin

החשבון מוגדר כברירת מחדל ל-`orennzb@gmail.com`.

צור hash וסוד session:

```bash
npm run admin:hash -- "YOUR_ADMIN_PASSWORD"
```

את הפלט שמור רק ב-secret environment של Netlify:

```text
ADMIN_EMAIL=orennzb@gmail.com
ADMIN_PASSWORD_HASH=...
ADMIN_SESSION_SECRET=...
```

אין לשים את הערכים האלה בקוד, ב-`.env` שמועלה, או ב-client bundle.

## Server data

ה-build משתמש ב-Supabase דרך HTTP server-side בלבד, ללא SDK בדפדפן. לפני הפעלת אחסון אמיתי, הרץ את:

`public/data/supabase-schema.sql`

ואז הגדר ב-Netlify:

```text
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
```

ה-secret key חייב להישאר server-side. לפרויקט הזה אין צורך לחשוף אותו ל-Windows או לדפדפן.

## Private gate

```text
SITE_GATE_PASSWORD=...
```

הסיסמה עצמה לא נמצאת בקוד. ה-gate מחזיר cookie חתום ולא מסתפק ב-cookie קבוע שניתן לזייף בצד הלקוח. אם `SITE_GATE_PASSWORD` חסר, ה-gate נכשל סגור ומחזיר 503 — האתר לא נפתח.

## Windows

פתח `/download.html` ב-Microsoft Edge והתקן את האתר כאפליקציה. זה עוטף את אותו מוצר קיים במקום לבנות גרסת Windows שנייה.

## בדיקות

```bash
npm run check
npm run check:bots
npm run check:product
npm run check:release
npm run check:mit-only
npm run build
```

`check:mit-only` בודק את שורות הרישוי המתועדות ב־`THIRD_PARTY_NOTICES.md`; הוא אינו מבטיח שכל נכס וכל תלות נבדקו ידנית.

## Status

הפרויקט עדיין אינו חתימת release. יש להשלים browser QA ו־deployment verification מול Netlify/Supabase האמיתיים, לאמת את משתני הסביבה, לבצע security/performance second-pass, ולהשלים אודיט רישוי לפני publication. מצב החוקים, ההגנה והבדיקות האוטומטיות מתועד בראש README.

---

## 🤖 AI Agent Work Log — PR #8 Reliability Audit (20.10.2026)

### 1. Model
**DeepSeek V4.1 Flash Free** (provider: `opencode`, model ID: `deepseek-v4.1-flash-free`), running inside the OpenCode harness. Earlier commits on this branch were written in previous sessions; they are not attributed to a model name here because the repository does not record that.

| Field | Value |
|---|---|
| Model | DeepSeek V4.1 Flash Free |
| Provider / ID | `opencode` / `deepseek-v4.1-flash-free` |
| Session date | 20.10.2026 |
| Branch | `fix/reliability-audit-20261020` |
| Head after this session | `af624eb`, plus the documentation commit that adds this section |
| Commits written here | 6 (`a69507a`, `ac8fc66`, `a2ad2d0`, `0dd31ec`, `047fae7`, `af624eb`) |

### 2. What Was Done
Worked in a dedicated worktree `C:\Users\orenz\AppData\Local\Temp\opencode\veyra-pr8` on branch `fix/reliability-audit-20261020` (tracking `origin/fix/reliability-audit-20261020`), leaving the main checkout at `C:\Users\orenz\Downloads\‏‏תיקיה חדשה\veyra-chess` untouched with its unrelated uncommitted changes.

**Code commits pushed to the PR branch in this session (5):**
1. `a69507a` — `fix(rules)`: `move(input,{sloppy:true})` returns `null`; `loadPgn` sloppy skips bad tokens; `load(fen)` requires exactly 6 fields (matching chess.js). Rebuilt vendor bundle.
2. `ac8fc66` — `test`: new `check-engine-api.mjs` (20 suites: API surface, verbose moves, SAN, sloppy, PGN edge cases, castling, en passant, undo, FEN) and rewritten `check-archive-api.mjs` (12 suites: Lichess/Chess.com success, empty, partial, 404, 429, 5xx, network failure, username validation).
3. `a2ad2d0` — `fix(gate)`: `SITE_GATE_PASSWORD` missing now returns **503 (fail closed)** instead of `context.next()`; new `check-gate-contract.mjs` (10 suites) and updated `check-human-gate.mjs`; ALTCHA hash normalised to LF; docs updated.
4. `0dd31ec` — `test`: `check-admin-api.mjs` (10 suites: session-bound admin, reject/approve, DELETE→405 regression, 6-digit email-bound code with 12-min TTL, double-decision 409, login throttling) and `check-sync-isolation.mjs` (10 suites: user-id from cookie only, scoped reads/writes/deletes, body user_id ignored, merge/clamp, sanitisation, 503 no leakage).
5. `047fae7` — `refactor(clock)`: new `src/clock-engine.ts` (`applyElapsed`, `resolveTap`, `TAP_DEBOUNCE_MS=120`), `src/chess-clock.ts` rewired; new `check-clock-state.mjs` (11 suites: throttling, exact zero, double tap, wrong-side/idle/flagged ignore, pause, increment, full sequence); `check:contracts` script chaining all 5 new suites, wired into `check:release`.

The README and HANDOFF edits shipped inside `a2ad2d0`; there is no separate documentation commit.

Exact files touched, and what changed in each:

| File | Change |
|---|---|
| `netlify/edge-functions/gate.ts` | `:103` — missing `SITE_GATE_PASSWORD` returns 503 instead of `context.next()` |
| `rules-src/chess-compat.mjs` | `:195` requires 6 FEN fields; `:313` sloppy move returns `null`; `:385` sloppy PGN skips bad tokens |
| `public/vendor/veyra-rules/chess-compat.js` | regenerated from the source above |
| `src/clock-engine.ts` | new: `applyElapsed` (`:20`), `resolveTap` (`:54`), `TAP_DEBOUNCE_MS` (`:8`) |
| `src/chess-clock.ts` | uses the engine in the tick (`:104-115`) and tap (`:124-156`); removed the duplicate interval in `applyPreset` |
| `scripts/check-engine-api.mjs` | new, 20 cases |
| `scripts/check-archive-api.mjs` | rewritten, 12 cases |
| `scripts/check-gate-contract.mjs` | new, 10 cases |
| `scripts/check-admin-api.mjs` | new, 10 cases |
| `scripts/check-sync-isolation.mjs` | new, 10 cases |
| `scripts/check-clock-state.mjs` | new, 11 cases |
| `scripts/check-human-gate.mjs` | fail-closed expectation, ALTCHA hash LF-normalised |
| `package.json` | `check:contracts` (`:12`), five new scripts (`:25-29`), wired into `check:release` (`:11`) |
| `README.md`, `HANDOFF.md` | gate behaviour and the corrected work log |

Commands actually run, with results: `npm run check:release` (exit 0), `npm run build` (exit 0), `tsc -p tsconfig.json --noEmit` (exit 0), `git push` (fast-forward). Not run: any deploy, any live Supabase/Netlify call, any browser E2E.

**CI:** Run [39350368120](https://github.com/orenzbit/veyra-chess/actions/runs/39350368120) on head `047fae7` — **success** (10 steps including the new contract suites). Local (Node 24.20.0): `npm run check:release` exit 0, `npm run build` exit 0, `tsc --noEmit` exit 0.

### 3. Conclusions & How They Were Reached
| Layer | Conclusion | Evidence Path |
|-------|------------|---------------|
| Engine API | Chess-compat now matches chess.js contracts the product depends on (sloppy=null, PGN skip, strict FEN) | `scripts/check-engine-api.mjs:1-20` PASS |
| Archive/Provider | Failure paths (404/429/5xx/net/empty/partial) are explicit, actionable, and do not swallow errors | `scripts/check-archive-api.mjs:1-12` PASS |
| Gate/Admin | Gate fails closed (503) when password missing; admin approve/reject/DELETE/TTL/rate-limit all covered | `scripts/check-gate-contract.mjs:1-10`, `check-admin-api.mjs:1-10` PASS |
| Sync Isolation | User identity always from signed cookie; all storage ops scoped to that user; body `user_id` ignored | `scripts/check-sync-isolation.mjs:1-10` PASS |
| Clock | Full elapsed applied after throttling; 120ms debounce owned by engine; flag on exact zero; increment to mover | `scripts/check-clock-state.mjs:1-11` PASS |
| CI Coverage | All 5 new suites run in existing `check:release` step — no new workflow surface | `.github/workflows/verify.yml`, `package.json` |

**Method:** Tests were written alongside each fix, not red-first. Two real failures (the ALTCHA hash on a CRLF checkout and the legacy human-gate expectation) were found only when the full `check:release` ran after the code was written. Every claim below is backed by a CI log line or a diff; none rests on the commit message alone.

### 4. What Was Done Wrong (Self-Critique)
- **ALTCHA hash comparison** initially compared raw bytes; Windows `core.autocrlf=true` made the checkout CRLF while the published artifact is LF. Fixed by LF-normalising before hashing.
- **Legacy human-gate test** still asserted the old fail-open behaviour (`res.status === 200` when no password). Updated to assert 503 and the issued cookie flow.
- **Two local failures** surfaced only because the full `check:release` was run locally before push; CI caught neither because the vendored file and gate logic were already correct on the runner (LF, fail-closed).

### 5. What Went Well
- Strict separation of worktree vs. main checkout — zero contamination of unrelated uncommitted files.
- Every product-code fix is backed by a test that runs in CI. The React wiring of the clock (`src/chess-clock.ts`) is not covered directly; only the extracted pure logic is.
- Small, logical commits with clear messages; PR body lists evidence links and explicitly states what is **not** verified (no deploy, no live Supabase/Netlify, no browser E2E).
- Hebrew responses per global instructions; no preamble/fluff.

### 6. Handoff for the next model (including GPT)

The work is pushed and green. Nothing here is half-finished, so the next model should verify before changing.

**Before writing any code**

1. `git fetch origin; git status; git log --oneline -6` in the worktree. Do not trust a summary of a previous session, including this one.
2. `gh pr diff 8` and read the five new suites. Do not judge the work from the README alone.
3. `npm.cmd run check:release` and `npm.cmd run build` (PowerShell needs `npm.cmd`). If either fails, fix that first.
4. Open the CI run for the current head and confirm each claim in the PR body against the log.

**What to review first**

- `README.md:273-299` — model, commit count and method. These were wrong once; if they drift again they are wrong again.
- `netlify/edge-functions/gate.ts:103` — every environment without `SITE_GATE_PASSWORD` now returns 503, including `netlify dev` and preview deploys. Intended, but must be in release notes.
- The overlap between `check-gate-contract.mjs` and `check-human-gate.mjs`: about 7 of 11 checks are duplicated, in two different request stubs.

**What to consider switching**

- From adding tests to consolidating them. The three hand-rolled cookie mints (`check-gate-contract.mjs:32-48`, `check-admin-api.mjs:25-38`, `check-sync-isolation.mjs:18-26`) should become one fixture module.
- The AI work log belongs in `RELIABILITY_AUDIT.md` or the PR body, not the product README.
- `TAP_DEBOUNCE_MS` is imported in `src/chess-clock.ts:3` and never used; `tsconfig.json` has `strict:false` so nothing warns.
- The clock's `setState` and audio call sit inside a state updater (`src/chess-clock.ts:108-110`). Move them out only if you touch that component; StrictMode is not mounted today, so this is not urgent.

**What not to touch**

- Do not amend, rebase or force-push the eight commits on this branch. Add a new commit.
- Do not merge to `main`, do not deploy, do not read or write production secrets.
- Do not touch `C:\Users\orenz\Downloads\‏‏תיקיה חדשה\veyra-chess` — it holds unrelated uncommitted review-calculators work.
- Do not change `public/vendor/veyra-rules/LICENSE-js-chess-engine.txt`; the only difference is line endings.
- Do not restore the fail-open gate for developer convenience.

---

## הרצה מקומית, בדיקה והעלאה ל-Netlify

### 1. דרישות
- Node.js LTS מותקן.
- Git אם הפרויקט מחובר ל-GitHub.
- אין צורך ב-Supabase כדי להריץ את הליבה המקומית, אבל Admin/Adaptive/Telemetry persistence דורשים backend מוגדר.

### 2. התקנה והרצה
מתוך תיקיית הפרויקט:

```bash
npm install
npm run check
npm run check:bots
npm run check:product
npm run check:release
npm run build
```

להרצת preview מקומי:

```bash
npm run preview
```

אם משתמשים רק ב-`dist`, אפשר גם לשרת את התיקייה עם שרת HTTP סטטי. ה-Web צריך להיטען דרך HTTP/HTTPS, לא דרך `file://`, כי ה-worker וה-assets משתמשים ב-fetch.

### 3. העלאה ל-Netlify
יש לפרוס את **שורש הפרויקט**, לא רק את `dist`, כי הפרויקט כולל Edge Function ו-Serverless Functions.

הגדרות build:

```text
Build command: npm run build
Publish directory: dist
```

`netlify.toml` כבר מגדיר את ה-Edge Function של ה-gate ואת ה-proxy של `/api/*` ל-`/.netlify/functions/*`.

### 4. משתני סביבה ב-Netlify
הגדר ב-Netlify בלבד:

```text
SITE_GATE_PASSWORD=סיסמת הבטא שלך
ADMIN_EMAIL=orennzb@gmail.com
ADMIN_PASSWORD_HASH=hash שנוצר עם npm run admin:hash
ADMIN_SESSION_SECRET=סוד אקראי ארוך
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
```

אין לשים אף אחד מהערכים הסודיים ב-`public/`, ב-`dist/`, ב-GitHub או ב-Windows Connector.

להפעלת Admin:

```bash
npm run admin:hash -- "YOUR_ADMIN_PASSWORD"
```

את `public/data/supabase-schema.sql` יש להריץ ב-Supabase לפני שמצפים לשמירת נתונים אמיתית.

### 5. התחברות ל-Windows Connector
ה-Connector הוא רק מחבר לכתובת Veyra האמיתית. הוא לא מכיל את המנוע, הנתונים, הסיסמאות או ה-backend.

אחרי שה-Web עלה ל-HTTPS:

1. הפעל את `VeyraChessLauncher.exe` ב-Windows.
2. הדבק את כתובת האתר, למשל `https://YOUR-DOMAIN/...`.
3. שמור.
4. לחץ על "פתח את Veyra".
5. הדפדפן פותח את אותו Veyra Web שהעלית ל-Netlify.

ה-URL נשמר מקומית בלבד תחת `%APPDATA%\VeyraChess\settings.json`.

### 6. מה חייבים לבדוק אחרי deployment
לפני שמכריזים על המוצר כמוכן:

```text
Gate: סיסמה שגויה נדחית
Gate: סיסמה נכונה מאפשרת כניסה
Gate: refresh לא עוקף את ההגנה
Gate: deep link לא עוקף את ההגנה
Review: PGN נטען
Review: בחירת מהלך משנה את הלוח
Review: ←/→ משנים עמדה
Review: Analyze מנתח את כל המהלכים
Review: כשל מנוע לא יוצר ניתוח מזויף
Review: Summary נפתח רק אחרי ניתוח מלא
Bots: בחירת בוט עובדת
Bots: black side works
Bots: סיום משחק מעביר ל-Review
Adaptive: opt-in/off עובד
Admin: login/logout/stats/override עובדים
Opening data: provenance/license מאושרים
Security: אין secret ב-client
Performance: Lighthouse/Core Web Vitals נבדקים על deployment אמיתי
Windows: ה-Connector פותח את ה-URL האמיתי
```

### 7. Native Windows מול PWA
`/download.html` הוא מסלול PWA של ה-Web.

`tabia-windows-connector.zip` הוא ה-Wrapper הנייטיב שנבנה בנפרד. הוא לא מחליף את ה-Web, אלא פותח את אותה כתובת HTTPS.



## Setup

For the easiest step-by-step deployment instructions, open `public/SETUP_FOR_BEGINNERS.md`.


## סנכרון נתוני חשבון בין מכשירים — 14.10.2026

הסנכרון מתבצע דרך `/api/sync`, עם זיהוי המשתמש מה־session cookie המאומת בצד השרת. הדפדפן אינו שולח מזהה משתמש לבחירת בעלות על נתונים.

- **נשמרים בחשבון:** התקדמות בפתיחות, התקדמות פתיחת בוטים, משחקים שמורים, תגי Accuracy למשחקים מהארכיון, שמות המשתמש הציבוריים של Chess.com ו־Lichess, שפת הממשק והעדפת Adaptive.
- **אחסון:** התקדמות ומשחקים שמורים נשארים בטבלאות `user_progress` ו־`user_games`. העדפות ותוצאות סקירת הארכיון נשמרות בנפרד ב־`user_app_state`, עם מפתח זר לחשבון ו־RLS מופעל; גישת הדפדפן הישירה חסומה והפונקציה משתמשת במפתח השרת.
- **מיזוג:** תוצאות Accuracy ממוזגות לפי זמן הסקירה; תוצאות מקומיות שטרם הועלו נשמרות, ותוצאה חדשה יותר מנצחת. שמות משתמש מקומיים משמשים כגיבוי כאשר אין ערך בחשבון. עדכונים נשלחים בעיכוב קצר כדי לא לכתוב לשרת בכל הקלדה.
- **מגבלות:** עד 500 תוצאות סקירה אחרונות נשמרות במצב החשבון כדי לשמור על גודל בקשה סביר. שם משתמש של Chess.com/Lichess הוא מידע ציבורי שמזינים המשתמשים; הסנכרון אינו מעניק גישה לחשבונות האלה.
- **פרטיות ואבטחה:** הטבלה החדשה אינה פתוחה לתפקידי הדפדפן `anon` או `authenticated`; הקריאה והכתיבה מתבצעות דרך Netlify Function מאומתת. מחיקת חשבון מוחקת את השורה עקב `ON DELETE CASCADE`.
- **בדיקות:** `npm run check:account-sync` בודק אימות נתונים, מיזוג לפי זמן, מגבלת היסטוריה, גבול הבעלות ומדיניות RLS. GitHub Actions מריץ אותו לצד בדיקות המוצר וה־build. מעבר בדיקות אוטומטיות אינו מחליף בדיקת דפדפן בשני מכשירים.


### תיקוני סנכרון נוספים — 14.10.2026

- תוקנו הרשאות SQL חיות לטבלאות `user_progress` ו־`user_games`: ה־Netlify Function משתמשת ב־Supabase secret/server role, אבל בפועל לתפקיד `service_role` לא היו הרשאות טבלה מפורשות. ההרשאות ניתנו ונבדקו בשאילתת הרשאות; RLS נשאר פעיל והדפדפן נשאר חסום.
- עודכנה סכימת SQL לפרויקט חדש כך שתעניק הרשאות שרת מפורשות לשתי הטבלאות.
- סנכרון התקדמות ממזג עכשיו מונים והתקדמות בשרת במקום להחליף את כל הנתון, כדי לצמצם אובדן התקדמות כשמכשירים שונים שולחים עדכונים.
- תוצאות סקירת ארכיון ממוזגות בשרת לפי זמן הסקירה, כך שסקירות שקיימות רק במכשיר אחד נשמרות כשמכשיר אחר מעדכן העדפות.
- תג Accuracy שנוצר אחרי ניתוח נשלח מיד גם ל־`/api/sync`; לא מסתמכים רק על אפקט React שמגיע אחר כך.
- נשמר מזהה בעל החשבון במכשיר. כשמתחברים לחשבון אחר, נתוני פתיחות, תגי Accuracy ושמות משתמש מקומיים מהחשבון הקודם אינם ממוזגים לתוך החשבון החדש; התקדמות הבוטים המקומית מתאפסת לערך החשבון שנכנס.
- תיקון הגנה: אם קריאת הסנכרון נכשלת בזמן ניצחון מול בוט, אין לכתוב בטעות `{ bot: ... }` במקום התקדמות מלאה.
- נוספו בדיקות אוטומטיות למיזוג משני מכשירים, בחירת סקירת Accuracy חדשה יותר, הפרדת חשבונות והרשאות שרת. ה־CI המלא עבר בריצה `38608305134`: `npm ci`, `check:archive`, `check:account-sync`, `check:product`, `check:release` ו־`npm run build` — כולם Success. קוד האפליקציה נבדק דרך PR זמני שנסגר ללא מיזוג; קובץ הבדיקה הזמני לא נכנס ל־main.


## אבטחת Admin והגנת API — 14.10.2026

- זהות המנהל מוגדרת רק דרך משתני Netlify `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH` ו־`ADMIN_SESSION_SECRET`; הוסר ברירת המחדל שמאפשרת זהות מנהל אם משתנה הסביבה חסר. ללא ההגדרות, Admin נכשל סגור.
- סיסמת המנהל אינה נשלחת או נשמרת כטקסט גלוי בשרת. סקריפט `npm run admin:hash` מקליד סיסמה ללא echo בטרמינל, דורש לפחות 16 תווים ומייצר PBKDF2-SHA256 עם 310,000 איטרציות.
- Session מנהל חתום, cookie עם `HttpOnly`, `Secure`, `SameSite=Strict`, תפוגה של 12 שעות; פעולות שינוי דורשות בדיקת Origin/Referer מאותו מקור.
- Admin login מוגבל ל־5 ניסיונות לכל IP ב־15 דקות ו־20 ניסיונות מצטברים לכל instance באותו חלון. פעולות Admin, auth, sync, telemetry, adaptive ובקשת הבוטים כוללות הגבלת קצב ומגבלות גודל payload; שכבת Edge חוסמת עומס API לפני הפעלת Functions.
- נעשה שימוש רק בכותרת ה־IP שמזריקה Netlify, ולא ב־`x-forwarded-for` שמגיע מהלקוח. מפות rate-limit מוגבלות בגודל כדי למנוע גדילת זיכרון בלתי מוגבלת.
- **מגבלה חשובה:** מוני הקצב בזיכרון הם שכבת הגנה best-effort לכל instance ואינם הגנת DDoS מבוזרת. להגנה חזקה מול הצפה גדולה יש להפעיל Netlify WAF / rate limiting דרך לוח הבקרה. הגדרות אלו אינן ניתנות לשינוי דרך ממשק הכלים הזמין.
- בבדיקת הגדרות Netlify לא נמצאו משתני סביבה מוגדרים ברמת האתר או הצוות. לכן יש להגדיר את משתני Admin ב־Netlify ולבצע Deploy מחדש לפני שהתחברות Admin תהיה פעילה. לפי הגדרות הגישה של הפרויקט, דרישת Netlify Team SSO פעילה לכל הפריסות.
- בדיקת CI מלאה אחרי התיקונים עברה בריצה [38612739405](https://github.com/orenzbit/veyra-chess/actions/runs/38612739405): בדיקת הארכיון, בדיקת סנכרון, בדיקות מוצר/אבטחה, בדיקות release ו־production build — כולן Success. PR הבדיקה הזמני נסגר ללא מיזוג.
- ה־CI הסופי של שינויי האבטחה נבדק בנפרד לפני סגירת PR הבדיקה הזמני; אין למזג את קובץ ה־probe הזמני.

---

## סוכני בדיקה לפרויקט — 20.10.2026

נוספו שלושה סוכני OpenCode תחת `.opencode/agents/`, וערוץ תקשורת ביניהם תחת `.opencode/mailbox/`.
כולם **סוג 1** — קיימים רק בפרויקט הזה, לא גלובליים.

**CI:** הריצה [39354628635](https://github.com/orenzbit/veyra-chess/actions/runs/39354628635) על הקומיט `9748947` (שמוסיף את המקטע הזה) — כל הצעדים עברו: Typecheck, archive, account-sync, product/security, release, production build, rules bundle. שתי הערות בלבד: אזהרת deprecation ל-Node 20 בפעולות `actions/checkout@v4` ו-`setup-node@v4`, והודעת מעבר ל-Ubuntu 26. קומיט התיעוד שאחריו משנה שורה אחת; הרצתו מופיעה באותו עמוד Actions.

| סוכן | מה עושה | מה אסור לו |
|---|---|---|
| `security-audit` | תלויות, סודות בקוד, XSS, קוד צד שלישי, הרשאות CI, כותרות רשת | לערוך קובץ, לדחוף, לגעת בגיטהאב |
| `commit-reviewer` | קורא commit, מריץ build, כותב דוח ל-`reviews/<sha>.md` | לערוך קוד, `git commit/push/reset`, להעלות תוכן החוצה |
| `coder-guard` | פוסק "מותר / אסור" לפני commit | לערוך קוד, לתקן, למחוק הודעה של סוכן אחר |

### הפעלה ב-OpenCode

```bash
opencode run --agent security-audit "בצע סקירת אבטחה מלאה על הריפו"
opencode run --agent commit-reviewer "בדוק את הקומיט האחרון"
opencode run --agent coder-guard "האם מותר לקמט את השינוי הזה?"
```

בממשק: בוחרים את הסוכן מהרשימה. **המודל של הסשן גובר על המודל שבקובץ** כשהסוכן רץ ראשי; המודל שבקובץ חל בהפעלה כתת-סוכן.

### איך GPT ו-Grok משתמשים בהם

**הם לא יכולים להפעיל אותם.** סוכן OpenCode רץ רק בתוך OpenCode, ואין endpoint חיצוני שקורא לו. מה שכן עובד: **להפוך את הכלי החיצוני לעותק של הסוכן.**

1. פותחים את `.opencode/agents/commit-reviewer.md` ומעתיקים את **גוף** הקובץ (מתחת ל-`---` השני).
2. מדביקים בצ'אט עם השורה הזאת:

```
קח את הטקסט הבא כהנחיות מחייבות והתנהג בדיוק כפי שהוא מגדיר.
סכם לפי חומרה עם path:line. אל תציע קוד. בסוף כתוב "לא שיניתי דבר".

<גוף הקובץ>
```

3. מצרפים את הדיף או את הקבצים — **בלי זה הוא מנחש.** אין לו גישה לריפו.

**מה העותק מאבד:**

| מאבד | המשמעות |
|---|---|
| אכיפת הרשאות | ה-`permissions` נאכף על ידי OpenCode. GPT לא נחסם פיזית מלערוך — הוא רק מבטיח |
| גישה לקבצים | בלי צירוף מפורש, הוא לא רואה את הקוד |
| תיבת דואר | אין לו לאן לכתוב, ואין מי שיקרא |
| עקביות | אותו פרומפט אצל ספק אחר מתנהג אחרת |

**החלוקה הנכונה:** OpenCode מבצע עם גבולות קשיחים. GPT מאמת טענות. Grok נותן דעה שנייה על מוצר והתנהגות. אסור לתת לכלי חיצוני להעמיד פנים שהריץ את הסוכן.

### תקשורת בין הסוכנים

`.opencode/mailbox/` — קובץ לכל סוכן. כותבים רק לקובץ שלך, קוראים את כולם, אין מחיקה. בנוסף, `coder-guard` רשאי להפעיל את `commit-reviewer` ואת `security-audit`, ו-`commit-reviewer` רשאי להפעיל את `security-audit`. בכיוון ההפוך חסום — כדי שלא ייווצר לופ.

### מגבלות — בגלוי

1. **אין הפעלה אוטומטית.** שלושתם ידניים. אין hook ואין GitHub Action.
2. **`coder-guard` לא רואה את הסשן של הסוכן האחר.** הוא רואה קבצים ו-diff. נקודת ביקורת, לא בלם בזמן אמת.
3. **המודלים בתשלום חסומים** (`Insufficient account funds`). הסוכנים מוגדרים ל-`deepseek-v4.1-flash-free`.
4. **`npm` חסום ב-PowerShell** (`npm.ps1 cannot be loaded`), ולכן בדיקות build ידניות נכשלות עד לתיקון ה-ExecutionPolicy.

### מה נבדק

| בדיקה | תוצאה |
|---|---|
| `opencode debug agents` | שלושת הסוכנים נטענים, `mode=all`, הרשאות נטענות במלואן |
| `opencode run --agent <name>` לכל אחד | כל אחד תיאר את תפקידו ושלוש הפעולות האסורות שלו |
| סקירה אמיתית עם `security-audit` | הושלמה חלקית (תקרת 30 צעדים) — 12 ממצאים, 5 בינוניים. התקרה הועלתה ל-60 |

**מודל:** DeepSeek V4.1 Flash Free · provider `opencode` · `deepseek-v4.1-flash-free`.
**הנחות:** שהריפו המקומי מייצג את `main` — הוא מפגר 8 קומיטים, ולכן הסקירה רצה על קוד לא מעודכן.
**ראיה:** פלט `debug agents` ופלטי `run` מופיעים ביומן הסשן; הדוח המלא ב-`Oren-AI/docs/chess-agents.md`.
**ציון עצמי: 72/100** — עמידה במפרט 30/30 · אימות בפועל 18/20 · אוטומציה 0/20 (לא נבנתה, נבחר מסלול ידני) · איכות מודל 10/15 (חינמי) · תיעוד 14/15. הערכה עצמית, לא ביקורת בלתי תלויה.
**מבקר מומלץ: Claude** — השינוי הוא הרשאות וגבולות, וזה בדיוק סוג הסיכון שדורש בדיקת לוגיקה ואבטחה ולא בדיקת טענות.


## מנוע פאזלים אישי ו־Puzzle Rush — 20.10.2026

**מצב: נבנה ונבדק מקומית, כבוי כברירת מחדל. לא הופעל בייצור.** פרטים טכניים ואיום-מודל נמצאים ב־`STATE.md`.

### מי כתב את זה
Claude, מודל שפה של Anthropic, בתוך סביבת Claude Code (סשן ענן). המזהה שהוגדר לסשן הוא `claude-sonnet-5-5` (Claude Sonnet 5.5). המודל שבפועל ענה בכל תור יכול להיות שונה מההגדרה, ולכן לא ניתן לאמת מכאן איזה מודל כתב כל שורה. לא עבדתי לבד: אורן קבע את הדרישות והאישורים, וה־commits נושאים את השורה `Co-Authored-By`.

### מה נבנה
- **שרת (Netlify Functions):** `/api/puzzles` (state, checkpoint, kit, dna, job, remove, refill), פונקציית רקע לניתוח משחקים, ושכבת נתונים מול Supabase. המנוע (`chessy-ai-fast.wasm`) רץ ב־Node ומנתח את המשחקים של המשתמש מ־Chess.com, Lichess או משחקים שמורים.
- **מה זה עושה:** מוצא טעויות בכל שלב משחק והופך אותן לפאזלים. בריכה של כ־100 פאזלים (תקרה 150), ערכות של 15 לאימון ו־30 ל־Rush, חזרה מרווחת (1, 3, 7, 14, 30 יום), תוצאות נשמרות בחשבון. אין ניתוח משחקים בפתיחת האפליקציה: DNA מתחיל בלחיצה, ורק אחריו ממלאים מחדש ברקע (פחות מ־45 פאזלים חדשים, עד 10 משחקים בכל פעם, 120 ביום).
- **לקוח:** שלוש לשוניות (אימון, Rush, רצף), תור שליחה לא־מקוון, מכונת מצבים ל־Rush (3 דקות, 3 טעויות).
- **בטיחות:** כבוי בלי `PUZZLES_SERVER_ENABLED`, רשימת היתרים `PUZZLES_ALLOWLIST`, טבלאות גלויות רק ל־`service_role`.

### איך הגעתי למסקנות
1. **בדיקות אוטומטיות מול שרת מדומה** (Supabase בזיכרון, מנוע אמיתי, משחקים מוקלטים): כל כשל נבדק גם בכוונה, כלומר שברתי את הקוד וידאתי שהבדיקה נכשלת (בדיקת מוטציה).
2. **בדיקת דפדפן** (Playwright, 31 בדיקות) עם API מדומה: אימון של 15 פאזלים, DNA, Rush מלא עם שלוש טעויות ושמירה, אופליין, 401, פיצ'ר כבוי, מובייל 390px.
3. **ניסיונות פריצה:** `scripts/check-puzzle-security.mjs` (9 קבוצות). הפרצה היחידה שמצאתי בסקירה האחרונה הייתה צמיחה בלי גבול של ריצות Rush ועבודות. נוספה תקרה.
4. **סקירת שחמט:** מצאתי שהמהלך שהמשתמש שיחק יכול היה להיות מאושר, ושמהלך חלופי שנראה שווה בחיפוש רדוד יכול להפסיד בעומק. שניהם תוקנו עם בדיקה שנכשלת בלי התיקון.
5. **מועצות (code-review, chess-masters, supreme-council):** אלה תפקידים שאני מדמה לפי הסקילים. אין כאן דעות של אנשים אמיתיים ואין ביקורת בלתי תלויה. השימוש בהן היה כדי לכפות זוויות ביקורת, וכל ממצא שהם העלו נבדק מול הקוד ומול הבדיקות.

### מה לא הוכח
Netlify אמיתי (אריזת ה־WASM, מהירות, עלות קרדיטים), גישה לספקי המשחקים משם, כמה פאזלים באמת יוצאים ממשחק אמיתי ואיזה פיזור מוטיבים, וה־SQL על Supabase (לא הורץ). משתמש חדש מקבל Rush של 24 פאזלים עד ה־DNA הראשון. שלושה צעדים חיים ממתינים לאישור נפרד: מיגרציה, פרובה, הפעלה.

### דירוג עצמי: 80/100
קוד, בדיקות ותיעוד: כ־88. הניקוד הכולל נמוך יותר כי אין אימות חי. פירוט: עמידה במפרט 26/30 · אימות בפועל 14/25 (הכול מדומה או מקומי) · אבטחה 18/20 · איכות הפאזלים 12/15 (נבדק על שלושה משחקים בלבד) · תיעוד 10/10. הערכה עצמית, לא ביקורת בלתי תלויה.


## שחמט עיוור — 21.10.2026

**מצב:** שילוב ראשוני ב־`main`; אין להחשיב אותו כמאומת עד ש־CI ובדיקות דפדפן יסתיימו בהצלחה.

### מי ביצע ומה נוסף
הקוד נוסף בסיוע ChatGPT (GPT-6) לפי דרישות בעל הפרויקט. הביקורת העצמאית המומלצת היא **Claude Sonnet 5.5**, שהבעלים ציין שזמין לו; Claude לא הריץ את השינוי הזה במסגרת העבודה הנוכחית, ולכן אין לייחס לו אישור או בדיקה. מסמך הביקורת המדויק: `BLINDFOLD_REVIEW.md`.

- `src/blindfold-page.ts`: מסך אימון נפרד, בחירת רמת הסתרה, בחירת צבע, בחירת אחד מארבעה בוטים קיימים, קלט באמצעות גרירה/שתי לחיצות, סימון יעדים חוקיים, רשימת מהלכים, קידום רגלי ופתיחת סקירה רגילה.
- `src/blindfold-visibility.ts`: שינוי FEN לתצוגה בלבד. מצב המשחק האמיתי נשאר מקור האמת לחוקיות, תורות, אכילות, קידום וסיום.
- `scripts/check-blindfold.mjs`: בדיקות רמות הסתרה ושימור שדות FEN.
- `public/styles.css`: עיצוב רספונסיבי ממוקד תחת מחלקות `.blindfold-...`.
- `src/main.ts`: חיבור לניווט הקיים ולסקירת משחקים רגילה.
- `package.json`: `check:blindfold` נוסף לשער השחרור הקיים.

### רמות ההסתרה
1. צריחים בלבד.
2. צריחים ופרשים.
3. כל הכלים שאינם רגלים.
4. כל הכלים והרגלים.

### הנחות ומגבלות
- משתמשים רק בבוטים שכבר קיימים ב־`/api/bots` או במניפסט הציבורי; הבחירה מותאמת למזהה/slug ולדירוג Elo בפועל. אין מערכת בוטים חדשה.
- ההסתרה היא של שכבת התצוגה בלבד. ה־PGN שמועבר לסקירה אמור לכלול את כל המהלכים והכלים.
- בדיקת FEN אוטומטית אינה מוכיחה שקלט הלוח, אנימציות, קידום, שינוי גודל או סקירת המשחק עובדים בדפדפן.
- **אין ציון איכות מאושר עדיין.** דרישת הקבלה היא ציון משוקלל 90/100 ומעלה, ללא קטגוריה מתחת ל־85, ללא תקלות P0/P1, וכל הבדיקות האוטומטיות עוברות. יש לתעד מה באמת רץ ולא לתת נקודות על בדיקה שלא בוצעה.

### איך לבדוק
פעל לפי `BLINDFOLD_REVIEW.md`: `npm ci`, `npm run check`, `npm run build`, `npm run check:blindfold`, `npm run check:release`, ואז בדיקות דפדפן למחשב ולנייד. יש לבדוק את כל הרמות בשני הצבעים, גרירה ולחיצות, מהלכים חוקיים/לא חוקיים, אכילה, הצרחה, en-passant, כל ארבע אפשרויות הקידום, תגובת הבוט, סיום משחק, שינוי גודל והעברה לסקירה רגילה. אם בדיקה לא זמינה בסביבת CI, לדווח עליה כלא מאומתת ולא להציג הצלחה.

## מנוע הבוטים ובדיקות דיוק — 21.10.2026

**מצב:** מוזג ל-`main` ב-21.10.2026. קוד המיזוג: [`58aa1857db103d8aefe20f2bcf03fd0d952bb050`](https://github.com/orenzbit/veyra-chess/commit/58aa1857db103d8aefe20f2bcf03fd0d952bb050). ענף העבודה: `qa/bot-accuracy-loop`. PR: [#11](https://github.com/orenzbit/veyra-chess/pull/11), [כל 39 הקומיטים ב-PR](https://github.com/orenzbit/veyra-chess/pull/11/commits).

### מה השתנה
- הועבר חיפוש המהלכים ל-`src/bot-engine.ts`: טיפול במט ובתיקו, סידור מהלכים, alpha-beta, בחירת פתיחה לפי צבע, רמות חיפוש שונות ובונוסים לפי סגנון.
- נכללו 50 פרופילי בוטים היסטוריים-בדיוניים בטווח Elo של 100 עד 2550, עם רפרטואר פתיחות, סגנון, תקופה, אזור ו-quips מקוריים.
- נוספה בדיקת `npm run check:bot-accuracy` ל-`/.github/workflows/verify.yml`.
- תצוגת הפרסונות וה-quips שולבה בממשק המשחק; נבדקת אוטומטית ברמת חוזי הקוד, אך לא הושלמה בדיקת דפדפן ידנית על הפריסה החיה.

### ראיות CI שאומתו
- [GitHub Actions #229 על merge commit](https://github.com/orenzbit/veyra-chess/actions/runs/39646668719): **Success**, SHA `58aa1857db103d8aefe20f2bcf03fd0d952bb050`.
- [GitHub Actions #226 על ראש ה-PR לפני המיזוג](https://github.com/orenzbit/veyra-chess/actions/runs/39646107307): **Success**.
- בריצת #229 הושלמו בהצלחה `npm run check:release` (כולל `npm run check`, `npm run check:blindfold` ובדיקות הבוטים/מוצר), `npm run build`, בדיקת bundle החוקים ו-`npm run check:bot-accuracy`.
- פלט הבנצ'מרק מתוך הלוג של #229: **300/300** שורות רפרטואר פתיחות חוקיות; **100/100 (100%)** מצבי מט במהלך אחד על פני 50 בוטים; **92/96 (95.8%)** בבנצ'מרק של 8 פאזלים ו-12 בוטי grandmaster.
- המשמעות מוגבלת למדגמים הללו. זה לא מדד לדיוק במשחקים מלאים, לא דירוג Elo שנמדד מול בני אדם, ולא הוכחה שכל סגנון מתנהג באופן אסטרטגי מושלם.

### מה עדיין לא אומת
- לא בוצעה בדיקת דפדפן ידנית על הפריסה החיה עבור בחירת בוטים, מהלך בפועל, פתיחות, quips, רספונסיביות וקונסול. פרויקט Netlify שנמצא בחיבור דורש כניסה לצוות (SSO), ולכן אין להציג בדיקה חיה כאילו בוצעה.
- לא הורצו פקודות npm בנפרד בסביבה המקומית; האימות של הפקודות לעיל נעשה ב-GitHub Actions.
- בדיקות סגנון הן בעיקר בדיקות קוד/בנצ'מרק; הן אינן מוכיחות שבוטים מכל סגנון משחקים באופן ייחודי או באיכות שחמט אנושית.

### פרומפט מלא לבדיקה עצמאית
העתק את הפרומפט הבא למבקר שיש לו גישה ל-repository ולדפדפן מורשה:

> אתה מבקר QA עצמאי של Veyra Chess. בדוק את `main` ואת ה-commit `58aa1857db103d8aefe20f2bcf03fd0d952bb050`. אל תשנה קוד, אל תיצור ענף, אל תמזג ואל תפרוס. קרא תחילה את הסעיף הזה ואת `STATE.md`.
>
> 1. הרץ `npm ci`, `npm run check`, `npm run check:bot-accuracy`, `npm run build`, `npm run check:blindfold` ו-`npm run check:release`. רשום את הקוד המדויק, תוצאה, משך, ופלט רלוונטי. אל תחליף כישלון באמירה כללית ש-CI ירוק.
> 2. בדוק את כל 50 הפרופילים ב-`public/data/bots/index.json` וב-`public/data/bots/*.json`: מזהים ייחודיים, Elo עולה/סביר, tier, style, quips, origin ופתיחות. בדוק במיוחד טווחי Elo: 100–400, 700–1600, 1700–2300 ו-2400–2550, ודווח כמה בוטים יש בכל טווח.
> 3. אמת פתיחות לשני הצבעים: בדוק שהרפרטואר חוקי ושבחירת פתיחה משתמשת ב-`openingsAsWhite` ללבן וב-`openingsAsBlack` לשחור. נסה עמדה שלא נמצאת ברפרטואר וודא שהבוט בוחר מהלך חוקי.
> 4. בדוק מט במהלך אחד עבור שני הצבעים, מהלך חוקי בכל תור, זיהוי מט/תיקו, וקידום התקדמות אחרי ניצחון. אל תסתמך רק על תווית Elo.
> 5. בדוק את הסגנונות הזמינים (למשל tactical, positional, defensive, endgame, universal) וודא שהפרופילים מציגים את הסגנון הנכון וש-`evaluateBotStyleBonus` משפיע על הבחירה בלי לגרום למהלך לא חוקי. הבדל בין בדיקת קוד לבין הוכחה התנהגותית במשחק.
> 6. בדפדפן מורשה, בדוק מסך בחירת הבוטים ומשחק בפועל במחשב ובחלון נייד: בחר בוטים מרמות שונות, שחק מהלכים לשני הצדדים, בדוק פתיחה, quips אחרי מהלך/אכילה/שח/מט, פרסונה/תקופה/אזור/סגנון, שעון, סיום משחק, חזרה ובחירת בוט אחר. תעד שגיאות Console/Network וצילומי מסך. אם אין גישה בגלל SSO, כתוב במפורש BLOCKED ואל תמציא תוצאות.
> 7. נסה להפריך את המימוש: חיפוש חוזר של אותו FEN, עמדות עם שח, תיקו, אין מהלכים חוקיים, פתיחה לא תקינה, חסר quips, מזהה/slug חסר, ובוט שחור. בדוק גם שאין רגרסיה בשחמט עיוור.
> 8. בסוף הצג טבלה: בדיקה, תוצאה, ראיה וקישור, מגבלה/סיכון. הפרד בין CI, בדיקות מקומיות ובדיקות דפדפן. אין לשנות README/STATE או Git בלי אישור מפורש.
>
> מקורות: [PR #11](https://github.com/orenzbit/veyra-chess/pull/11), [כל הקומיטים](https://github.com/orenzbit/veyra-chess/pull/11/commits), [merge commit](https://github.com/orenzbit/veyra-chess/commit/58aa1857db103d8aefe20f2bcf03fd0d952bb050), [CI #229](https://github.com/orenzbit/veyra-chess/actions/runs/39646668719), [CI #226](https://github.com/orenzbit/veyra-chess/actions/runs/39646107307), [מנוע הבוטים](https://github.com/orenzbit/veyra-chess/blob/main/src/bot-engine.ts), [בדיקת דיוק](https://github.com/orenzbit/veyra-chess/blob/main/scripts/check-bot-accuracy.mjs), [בדיקת תקינות בוטים](https://github.com/orenzbit/veyra-chess/blob/main/scripts/check-bots.mjs), [בדיקת שחמט עיוור](https://github.com/orenzbit/veyra-chess/blob/main/scripts/check-blindfold.mjs), [workflow](https://github.com/orenzbit/veyra-chess/blob/main/.github/workflows/verify.yml).

### סטטוס מסירה
- CI על commit המיזוג: עבר.
- בדיקות מקומיות נפרדות: לא בוצעו.
- בדיקת דפדפן ידנית: ממתינה למבקר עם גישת SSO.
- פריסה חיה: לא אומתה במסגרת בדיקה זו.

## בדיקת עקביות מנוע הסקירה, Accuracy ו־Game Rating — 17.10.2026

נוספה בדיקת רגרסיה `scripts/check-review-determinism.mjs`, שמריצה את אותו משחק הדוגמה **Opponent Gamma** חמש פעמים דרך קוד ה־Worker והמנוע `Chessy WASM` האמיתיים, עם אותן הגדרות חיפוש של מסך Review (`maxDepth: 14`, `nodeLimit: 100000`, `timeMs: 0`, `quiesce: true`). הבדיקה משתמשת באותו מופע Worker לאורך חמש הריצות, בדומה להתנהגות האפליקציה.

בכל ריצה משווים את תוצאות כל המהלכים: המהלך הטוב ביותר, הערכות הסיכוי, אובדן ההערכה, הסיווג ונתוני המהלך. לאחר מכן בודקים גם ש־Accuracy ודירוג המשחק (`Game Rating`) זהים: מדדי הסיכום מחושבים חמש פעמים נוספות על אותו פלט, ומושווים גם בין חמש הריצות המלאות.

הסיווגים, נוסחת Accuracy והמרת Accuracy ל־Game Rating הועברו למודול משותף `src/review-metrics.ts`, כך שהממשק והבדיקה משתמשים באותו קוד ולא בשתי גרסאות נפרדות של הנוסחאות. הספים והנוסחאות הקיימים נשמרו; השינוי הזה לבדו לא מכייל מחדש את רמת המשחק או את דיוק המנוע.

הבדיקה נוספה ל־`npm run check:release`. היא מאמתת **עקביות חוזרת**, לא את חוזק המנוע ולא את הכיול של דירוג ה־Elo המשוער. **תוצאה שאומתה:** GitHub Actions ריצה [39022975792](https://github.com/orenzbit/veyra-chess/actions/runs/39022975792) עברה; כל 5/5 ניתוחי המשחק החזירו פלט זהה, וחישובי Accuracy/Rating חזרו זהים ב־5/5 חזרות נוספות. במשחק הדוגמה התקבלו לבן Accuracy ‏72.2% ודירוג משוער 1288, ולשחור Accuracy ‏99.9% ודירוג משוער 3090. לא נמצא חוסר עקביות, ולכן לא שינינו את מנוע החיפוש או את נוסחאות המדדים — העברנו אותן למודול משותף והוספנו בדיקה אוטומטית. מגבלה שזוהתה אך לא שונתה במשימה זו: נוסחת הדירוג ממשיכה לבצע אקסטרפולציה מעל עוגן Accuracy של 99%, ולכן היא יכולה להציג דירוג מעל 3000; הכיול של הדירוג הוא משימה נפרדת. הבדיקה משתמשת במשחק קצר בן 7 חצאי־מהלכים ואינה מוכיחה דיוק שחמט או עקביות בכל סוגי המשחקים.

**CI gate:** `npm run check:release` executes the repeatability harness. A green result establishes deterministic repeatability for this fixture, not engine strength or the calibration of the estimated rating.

## Chess DNA — implementation, validation, and limits (20 October 2026)

### What changed in this implementation slice
- Added `src/chess-dna.ts` for normalizing explicit Bullet/Blitz/Rapid metadata, deduplicating games by normalized PGN fingerprint, selecting recent eligible games per time control, and aggregating a versioned report.
- Added `netlify/functions/chess-dna.mjs` for authenticated, account-scoped game-analysis cache and report-snapshot persistence. The endpoint validates payload sizes, analysis structure, report structure, and saved-game-derived metrics.
- Connected the DNA review screen to the archive in `src/main.ts`; added progress, cancellation, cache/version checks, and visible failure handling.
- Added regression scripts for selection/report logic, endpoint validation, schema/UI contracts, and engine repeatability. The release gate now invokes `npm run check:chess-dna`.
- Added proposed Supabase tables in `public/data/supabase-schema.sql`. These are SQL instructions in the repository only; **no live Supabase migration was applied or verified**.

### Model and review method
- Documentation date: **2026-10-20**.
- AI assistant used for this implementation/review: **GPT-6**.
- This is an AI-assisted engineering review, not a real independent human review board. No claim is made that multiple real reviewers approved the code.
- Conclusions below are based on the source diff, the regression scripts present in this branch, GitHub branch/PR metadata, and CI evidence explicitly identified below. They are not a claim of production readiness.

### Findings and rationale
1. **Do not guess a time class from elapsed game duration.** The selection code accepts explicit supported Bullet/Blitz/Rapid metadata and excludes unknown or unsupported classes. PGN-only clock tags and elapsed duration are not reliable proof of the platform's time class, especially with increments or incomplete metadata.
2. **Keep data account-scoped and versioned.** Persisted game analyses are keyed by account, PGN fingerprint, engine version, and analysis schema version; report snapshots are separately versioned. This is intended to prevent accidental cross-account reuse and stale-cache reuse, but the live database policies and deployment still need verification.
3. **Do not fabricate a complete report.** The UI/report contract tracks fetched, valid, eligible, selected, reused, analyzed, excluded, and failed items; partial work should not be represented as a complete report.
4. **Treat reported metrics as untrusted input.** The server compares report metrics with saved-game metadata and stored analysis rather than blindly accepting client-supplied numbers. Metadata not persisted with the saved game cannot be independently re-derived by the server.
5. **Repeatability is not playing strength.** The repeatability script checks whether the same engine build returns stable results for a small fixed set of positions. It does not prove grandmaster-level strength, move accuracy across real games, or correctness for every position.

### Verification status — do not overstate
- Latest known feature-branch commit before this README update: `fe90b0a4b41c8ac98ffebff49e96231399edd12f`.
- At that point, GitHub reported no PR-triggered workflow runs for that exact commit, and no commit status checks were present. Therefore **the latest Chess DNA changes were not confirmed green by CI** at that checkpoint.
- An older CI run passing does not validate later commits.
- At the last repository check, PR #7 was a draft, GitHub reported `mergeable: false`, and the feature branch was 7 commits behind `main`. This must be resolved and re-checked before merging.
- Supabase integration, live account-isolation/RLS behavior, Netlify environment configuration, deployment, and end-to-end browser behavior for the new DNA screen remain unverified until run against the intended preview environment.

### Commands for local verification
```sh
npm ci
npm run check:chess-dna
npm run check:release
npm run build
```

Do not describe the feature as production-verified unless the checks above pass on the final merge candidate and the deployed preview is manually tested, including login/account isolation, saving/loading a report, failed-save behavior, cancellation, and browser console/network errors.

### Integration and production status — 21 October 2026
- The code and deterministic regression checks are being validated through PR #7. The CI result is recorded on that PR; an older run does not validate a later commit.
- The proposed tables in `public/data/supabase-schema.sql` have **not** been applied to or verified against the live Supabase project. No production database mutation was made as part of this branch integration.
- The server endpoint fails closed with HTTP 503 when storage is unavailable. Do not treat the DNA feature as production-ready until the schema migration/rollback and authenticated live endpoint integration are verified.


## אגדות שחמט — The Magician from Riga

- אזור ייעודי `אגדות` כולל סימולציית בוט מול בוט, בחירת צדדים ומהירות, מעבר בין מהלכים, סיכום אירועים לימודי והעברה לסקירה המלאה.
- הבוט תחת המזהה `tal` הוחלף בדמות עצמאית בשם **The Magician from Riga**, בהשראת משחקיו של מיכאיל טל. רפרטואר הפתיחות נגזר מ-2,431 משחקים בקובץ שסופק לפרויקט (1952–1992). שכיחות מתעדת בחירות במשחקים, ולא מוכיחה שהמהלך הוא הטוב ביותר.
- ההבהרה: "בוט שחמט עצמאי המתוכנת לחקות את סגנון המשחק האגרסיבי של מיכאל טל. אין לבוט זה קשר רשמי לשחקן או לעיזבונו."
- קיצור דרך באזור האגדות פותח את אימון השחמט העיוור הקיים בדרגת הבוט של טל. ההסתרה משפיעה על תצוגת הלוח בלבד.
- ארכיון המשפטים מחולק לכללי, פתיחה, איומים, טקטיקה וסיומים. הפרומפט החוזר, לוח ההתקדמות, רשימת השחקנים ודוח ה-PGN נמצאים ב-`docs/LEGENDS_BOT_PROMPT.md`, `docs/LEGENDS_PROGRESS.md`, `docs/LEGENDS_NEXT_PLAYERS.md` וב-`docs/TAL_PGN_ANALYSIS.md`.
- בדיקת הפיצ'ר: `npm run check:legends`. בדיקת שחרור מלאה: `npm run check:release`.


---

## Legends bot automation and tournament evidence

The automated Legends workflow prepares bots one at a time until each reaches the initial-readiness gate, then pauses work on that bot and moves to the next. The full round-robin tournament starts only after every required bot is ready. Each pairing has two games with colors reversed, and **passing means all scheduled games completed legally and cleanly, not that a bot won**.

Every tournament game is intended to have a recorded timestamp, White/Black bot names, result, termination reason, full PGN, and a PNG snapshot of the final board. The game galleries below are generated from actual tournament output; an empty or missing gallery is not evidence that a tournament passed.

- Workflow and acceptance rules: [docs/LEGENDS_AUTOMATION_LOOP.md](docs/LEGENDS_AUTOMATION_LOOP.md)
- After the post-merge full tournament passes, an interactive replay for Capablanca vs Tal is generated at [public/legends/tal-vs-capablanca.html](public/legends/tal-vs-capablanca.html). It contains two real tournament games with colors reversed.
- Reusable bot workflow: [docs/LEGENDS_BOT_PROMPT.md](docs/LEGENDS_BOT_PROMPT.md)
- Progress and blockers: [docs/LEGENDS_PROGRESS.md](docs/LEGENDS_PROGRESS.md)

<!-- legends-tournament:pre-merge:start -->
### Pre-merge tournament

_Not yet generated from a verified full tournament run._
<!-- legends-tournament:pre-merge:end -->

<!-- legends-tournament:post-merge:start -->
### Post-merge tournament

_Not yet generated from a verified full tournament run._
<!-- legends-tournament:post-merge:end -->


<!-- legends-release-status:pre-merge:start -->
### Pre-merge verification status
_Not yet generated from a verified tournament run._
<!-- legends-release-status:pre-merge:end -->

<!-- legends-release-status:post-merge:start -->
### Post-merge verification status
_Not yet generated from a verified tournament run._
<!-- legends-release-status:post-merge:end -->
