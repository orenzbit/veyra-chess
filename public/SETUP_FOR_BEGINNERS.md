# Veyra Chess — מדריך התקנה פשוט

## מה אנחנו עושים?

המטרה היא: להעלות את Veyra ל-Netlify בחינם, לחבר Supabase לחשבונות, להפעיל אימיילים, ולהוסיף אישור ידני לכל חשבון חדש.

### שלב 1 — להעלות ל-Netlify

1. צור חשבון Netlify.
2. בחר להוסיף אתר חדש.
3. העלה את תיקיית הפרויקט או חבר את ה-Git repository.
4. Build command: `npm run build`
5. Publish directory: `dist`
6. אחרי הפריסה תקבל כתובת חינמית של Netlify. לא צריך לקנות דומיין בשלב הזה.

### שלב 2 — ליצור Supabase project

1. צור Project חדש.
2. פתח Authentication → Providers → Email.
3. ודא ש-Email provider פעיל.
4. ודא ש-Confirm email פעיל.
5. הגדר את Site URL לכתובת ה-Netlify שקיבלת.
6. הוסף את אותה כתובת ב-Redirect URLs אם Supabase מבקש.

בגרסת הבטא משתמשים בספק האימייל המובנה של Supabase. יש לו מגבלת שליחה נמוכה, ולכן הוא מתאים לבטא קטנה ולא לשימוש המוני.

### שלב 3 — להוסיף Environment Variables ב-Netlify

Settings → Environment variables. הוסף:

```text
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SECRET_KEY=YOUR_SUPABASE_SECRET_KEY
AUTH_SESSION_SECRET=מחרוזת-אקראית-ארוכה-לפחות-32-תווים
SITE_URL=https://YOUR-SITE.netlify.app
SITE_GATE_PASSWORD=הסיסמה של שער הבטא
ADMIN_EMAIL=orennzb@gmail.com
RESEND_API_KEY=המפתח של Resend
ACCESS_CODE_FROM=onboarding@resend.dev
ADMIN_PASSWORD_HASH=ה-hash של סיסמת האדמין
ADMIN_SESSION_SECRET=מחרוזת-אקראית-נפרדת
```

**לעולם אל תשים את ה-SECRET KEY בתוך `public`, GitHub או קוד JavaScript של הדפדפן.**

### שלב 4 — ליצור את טבלאות Veyra

1. פתח Supabase → SQL Editor.
2. פתח את הקובץ `public/data/supabase-schema.sql`.
3. העתק את כולו.
4. הדבק ב-SQL Editor.
5. לחץ Run.

### שלב 5 — ליצור סיסמת Admin

במחשב שלך בתוך תיקיית הפרויקט:

```bash
npm install
npm run admin:hash -- "YOUR_ADMIN_PASSWORD"
```

העתק את ה-hash שקיבלת ל-`ADMIN_PASSWORD_HASH` ב-Netlify.

### שלב 6 — להפעיל את אישור הגישה הידני

לפני שמשתמש חדש יכול ליצור חשבון: 

1. המשתמש מכניס את האימייל שלו.
2. Veyra שולח בקשת גישה ל-`orennzb@gmail.com`.
3. אם אתה מאשר אותו, אתה מעביר לו את קוד 6 הספרות שקיבלת במייל.
4. הקוד תקף 12 דקות בלבד ופעם אחת בלבד.
5. אחרי 12 דקות המשתמש חוזר למסך בקשת קוד.

הקוד נשלח דרך Resend. התוכנית החינמית של Resend כוללת כרגע עד 3,000 מיילים בחודש ועד 100 ביום, כך שהיא מתאימה לבטא קטנה.

### שלב 7 — Redeploy

אחרי ששינית Environment Variables, בצע Deploy מחדש ב-Netlify.

### שלב 8 — בדיקת משתמש

1. פתח את כתובת ה-Netlify.
2. היכנס עם סיסמת שער הבטא.
3. קרא את דף ההסבר.
4. לחץ "יצירת חשבון / כניסה".
5. נסה ליצור חשבון עם משתמש בן פחות מ-18 — הוא צריך להיחסם.
6. צור חשבון אמיתי בגיל 18 ומעלה.
7. סמן את אישור תנאי השימוש ומדיניות הפרטיות.
8. בדוק שהאימייל נשלח.
9. לחץ על קישור האימות באימייל.
10. חזור ל-Veyra והתחבר.
11. בדוק Review, Coach, Bots ו-Adaptive.
12. פתח "חשבון" ובדוק שמחיקת החשבון דורשת אישור.

### שלב 9 — בדיקת בטא פרטית

אל תשלח את הקישור לכולם. בשלב הזה המטרה היא רק בדיקות פרטיות.

## חשוב

אורן זביט אינו עורך דין. תנאי השימוש ומדיניות הפרטיות הם מסמכי מוצר כלליים ואינם תחליף לייעוץ משפטי מקצועי.
## Private beta account setup

Required in Netlify Environment variables:

```text
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SECRET_KEY=YOUR_SECRET_KEY
ADMIN_EMAIL=orennzb@gmail.com
ADMIN_PASSWORD_HASH=YOUR_PBKDF2_HASH
ADMIN_SESSION_SECRET=YOUR_ADMIN_SESSION_SECRET
SITE_URL=https://YOUR-SITE.netlify.app
```

`RESEND_API_KEY` is optional. Without it, signup requests stay pending and the Admin page can manually issue the six-digit access code. The issued code is valid for 12 minutes and single-use.


## Admin approval flow

The browser never selects the admin identity. The server determines the operator from `ADMIN_EMAIL` and verifies the password against `ADMIN_PASSWORD_HASH`.

Every new signup starts as `pending`. No account is created until the operator explicitly approves the request in Admin. Approval then generates a one-time six-digit code valid for 12 minutes. The applicant can create an account only after verifying that operator-issued code.
