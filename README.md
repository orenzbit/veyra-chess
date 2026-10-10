# Veyra Chess

גרסת Web של Chess Review Coach עם Review, Coach, 20 בוטים, מסלול התקדמות, Adaptive Bots, Admin Panel ועטיפת Windows כ-PWA.

## מה נוסף ב-build הזה

- כל 20 הבוטים נשארים באותו Bot Center, עם progression: רק בוטים שנפתחו זמינים, וניצחון פותח את הבא.
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

`check:mit-only` אמור להישאר BLOCKED כל עוד `chess.js` BSD-2-Clause עדיין נמצא במוצר. זו חסימה מכוונת לפי מדיניות MIT-only.

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
