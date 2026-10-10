# Veyra Chess - Start Here

אתה נמצא עכשיו במסך `Create a new project` של Supabase.

## שלב 1 - Supabase

1. Organization: `Veyra Chess`
2. Project name: `Veyra Chess`
3. GitHub: לא חייבים לחבר.
4. Database password: לחץ `Generate a password`.
5. Region: בחר `Central EU (Frankfurt)` / `eu-central-1`.
6. `Enable Data API`: ON.
7. `Automatically expose new tables`: OFF.
8. `Enable automatic RLS`: ON.
9. לחץ `Create new project`.

אל תשלח לאף אחד את Database password.

## שלב 2 - אחרי שהפרויקט נוצר

פתח Supabase Dashboard.
שמור לעצמך את:
- Project URL
- Publishable/anon key המתאים לקליינט
- Secret key המתאים לשרת בלבד

את ה-Secret key לא מכניסים לקוד דפדפן ולא שולחים בצ'אט.

## שלב 3 - Database

ב-Supabase פתח `SQL Editor` -> `New query`.
פתח את:
`public/data/supabase-schema.sql`
העתק את כולו והדבק ב-SQL Editor.
הרץ אותו.

## שלב 4 - Authentication

ב-Supabase Authentication הפעל Email / password authentication.
הפעל Email confirmation.
הגדר את כתובת האתר אחרי שיש לך את כתובת ה-Netlify.

## שלב 5 - Netlify

העלה/חבר את הפרויקט.
Build command:
`npm run build`
Publish directory:
`dist`

## שלב 6 - Environment variables

צריך להגדיר ב-Netlify את משתני השרת של הפרויקט, כולל:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SECRET_KEY`
- `AUTH_SESSION_SECRET`
- `RESEND_API_KEY`
- `ACCESS_CODE_FROM`
- `SITE_URL`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD_HASH`
- `ADMIN_SESSION_SECRET`

לעולם לא מכניסים את הסודות לקוד לקוח.

## שלב 7 - Email

למערכת אישור המשתמשים Veyra משתמש ב-Supabase Auth.
לבקשת גישה לבטא הפרטית, Veyra משתמש ב-Resend כדי לשלוח את קוד האישור למפעיל.

`ACCESS_CODE_FROM` אפשר להתחיל עם `onboarding@resend.dev` לצורך הבדיקה הראשונית. לשימוש מסודר יותר מומלץ לאמת דומיין משלך אצל ספק האימייל.

## שלב 8 - בדיקה

בדוק בסדר הזה:
1. בקשת חשבון -> מגיע אליך אימייל אישור.
2. קוד אישור בן 6 ספרות -> פג אחרי 12 דקות.
3. קוד שגוי 5 פעמים -> ננעל.
4. מילוי הרשמה.
5. Email confirmation.
6. Login.
7. Review.
8. Bot Center.
9. Coach.
10. Adaptive.
11. Account deletion.
12. Hebrew/English toggle.
