## מצב שילוב נוכחי, 16.10.2026

- חוקי השחמט משתמשים כעת בשכבת תאימות MIT של Veyra מעל `js-chess-engine`; תיקיית המקור של `chess.js` הוסרה מהפרויקט.
- נוספה בדיקת אנושיות ALTCHA המתארחת באתר, לפני שער הסיסמה ולפני גישה לממשקי API רגישים. הגדר ב-Netlify את `BOT_CHALLENGE_SECRET` כמחרוזת אקראית ארוכה (לפחות 32 תווים) לפני פריסה. בלי המשתנה, האתר ייחסם בכוונה עם HTTP 503.
- בדיקות אוטומטיות מוגדרות ב-`npm run check:release`, `npm run check:mit-only` ו-`npm run build`. הן עדיין צריכות לרוץ בפועל בסביבת Node/Netlify; לא בוצעה כאן בדיקת דפדפן או פריסה חיה.

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
- מצב ה־Accuracy נשמר בדפדפן בלבד; הוא אינו פרופיל שרת משותף.
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
- `check:mit-only` verifies that documented runtime dependencies use MIT licenses. chess.js has been removed and replaced by Veyra's MIT compatibility layer over `js-chess-engine`.ns התקנת תלויות נעולה, בדיקות מוצר, בדיקות release ו־production build בכל Push ל־`main` ובכל Pull Request.
- הבדיקה `check:mit-only` verifies that documented runtime dependencies use MIT licenses. chess.js has been removed and replaced by Veyra's MIT compatibility layer over `js-chess-engine`.nter, עם progression: רק בוטים שנפתחו זמינים, וניצחון פותח את הבא.
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

הסיסמה עצמה לא נמצאת בקוד. ה-gate מחזיר cookie חתום ולא מסתפק ב-cookie קבוע שניתן לזייף בצד הלקוח.

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

`check:mit-only` verifies that documented runtime dependencies use MIT licenses. chess.js has been removed and replaced by Veyra's MIT compatibility layer over `js-chess-engine`.nly.

## Status

ה-build הזה הוא **sandbox / implementation pass**, לא חתימת release. עדיין נדרשים חיבור backend אמיתי, browser QA, deployment verification, security second-pass, performance verification, ורישוי מלא לפני publication.

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
