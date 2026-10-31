# מדריך לאורן: פריסה אוטומטית ל-Netlify + תצוגה מקדימה לכל PR

המטרה:
1. כל PR שממוזג ל-`main` עולה לאתר החי לבד (Continuous Deployment).
2. כל PR פתוח מקבל קישור תצוגה מקדימה (Deploy Preview) — על **מסד נתונים נפרד לבדיקות**, כדי שבדיקות לא ייגעו במשתמשים אמיתיים.

אין שינוי קוד. הכול הגדרות ב-Netlify, ב-Supabase וב-GitHub. זמן משוער: כשעה וחצי.

> **כלל ברזל:** סודות מוזנים **רק** במסך משתני הסביבה של Netlify (עם סימון "secret"). לא בצ'אט, לא ב-GitHub, לא בקוד ולא ב-`public/`.
>
> שמות הכפתורים ב-Netlify וב-Supabase עשויים להשתנות מעט בין גרסאות הממשק.

---

## מה כבר קיים

| רכיב | מצב |
|---|---|
| `netlify.toml` | מגדיר build (`npm run build` → `dist`), את ה-Edge Function `gate` על `/*`, ואת `/api/*` → Functions |
| אתר Netlify | `veyra-chess` קיים (לפי `HANDOFF.md`), אבל לא מחובר ל-GitHub — אין פריסה אוטומטית |
| CI ב-GitHub | `verify.yml` רץ על כל PR ועל `main` ("Typecheck and product checks") |
| שער גישה | `gate.ts` **נכשל סגור**: בלי `SITE_GATE_PASSWORD` או `BOT_CHALLENGE_SECRET` כל האתר מחזיר 503 |

---

## שלב 0 — לפני שמתחילים (5 דקות)

- [ ] ב-Netlify → **Billing / Usage**: לבדוק כמה פריסות ודקות build בחודש כלולות בתוכנית החינמית שלך. כל מיזוג ל-`main` = פריסה אחת, וכל עדכון של PR פתוח = Deploy Preview אחד.
- [ ] להכין סודות אקראיים (כל אחד שונה). אפשר לייצר במחשב עם Node:
  ```powershell
  node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
  ```
- [ ] Hash לסיסמת ה-Admin (בתיקיית הפרויקט):
  ```powershell
  npm run admin:hash -- "YOUR_ADMIN_PASSWORD"
  ```

---

## שלב 1 — חיבור ה-repo לאתר (פריסה אוטומטית)

1. Netlify → האתר `veyra-chess` → **Site configuration → Build & deploy → Continuous deployment → Link repository**.
2. לבחור GitHub → `orenzbit/veyra-chess`, ענף ייצור: **`main`**.
3. הגדרות build (אמורות להיקרא מ-`netlify.toml`, רק לוודא):
   - Base directory: ריק (שורש הפרויקט — **לא** `dist`, כי יש Functions ו-Edge Function)
   - Build command: `npm run build`
   - Publish directory: `dist`
4. **לא** ללחוץ Deploy עדיין — קודם משתני הסביבה (שלב 2), אחרת האתר יעלה ויחזיר 503.

מעכשיו כל מיזוג ל-`main` יפעיל build ופריסה לבד.

---

## שלב 2 — משתני סביבה

Netlify → **Site configuration → Environment variables**. לכל משתנה: לסמן **Contains secret values** כשמדובר בסוד, ולבחור **Different value for each deploy context** כשהטבלה אומרת שהערך שונה בתצוגה המקדימה.

| משתנה | חובה? | Production | Deploy Previews |
|---|---|---|---|
| `NODE_VERSION` | מומלץ | `24` (כמו ב-CI) | `24` |
| `SITE_GATE_PASSWORD` | **חובה** | סיסמת הבטא | סיסמה **אחרת** לבדיקות |
| `BOT_CHALLENGE_SECRET` | **חובה** | סוד אקראי | סוד אקראי **אחר** |
| `SUPABASE_URL` | **חובה** | פרויקט הייצור | פרויקט **הבדיקות** (שלב 4) |
| `SUPABASE_ANON_KEY` | **חובה** | של הייצור | של **הבדיקות** |
| `SUPABASE_SECRET_KEY` | **חובה** | של הייצור (`sb_secret_...`) | של **הבדיקות** |
| `AUTH_SESSION_SECRET` | מומלץ מאוד | סוד אקראי | סוד אקראי **אחר** |
| `ADMIN_EMAIL` | חובה ל-Admin | המייל שלך | אותו מייל |
| `ADMIN_PASSWORD_HASH` | חובה ל-Admin | ה-hash משלב 0 | אפשר אותו hash |
| `ADMIN_SESSION_SECRET` | חובה ל-Admin | סוד אקראי | סוד אקראי **אחר** |
| `SITE_URL` | מומלץ | הכתובת הסופית של האתר | **לא להגדיר** (ראו הערה) |
| `RESEND_API_KEY` | לשליחת מיילים | המפתח שלך | **לא להגדיר** |
| `ACCESS_CODE_FROM` | אופציונלי | כתובת השולח | — |

הערות:
- **למה סודות שונים בתצוגה המקדימה?** כדי שעוגייה או סשן שנוצרו בתצוגה מקדימה לא יעבדו באתר החי.
- **`SITE_URL`**: הקוד משתמש בו לקישורים במיילים, ואם הוא חסר — בכתובת שממנה הגיעה הבקשה. בתצוגה מקדימה עדיף לא להגדיר אותו, כדי שקישורים יובילו לתצוגה המקדימה ולא לאתר החי. אם הממשק לא מאפשר להשאיר הקשר ריק — קישורים במיילים מהתצוגה המקדימה יובילו לאתר החי.
- **`RESEND_API_KEY` בתצוגה מקדימה**: בלי מפתח לא יישלחו מיילים אמיתיים מבדיקות. לבדיקות משתמשים במשתמש בדיקה שנוצר מראש (שלב 4).
- לפי `HANDOFF.md` כבר הוגדרו: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SITE_URL`, `ADMIN_EMAIL`, `AUTH_SESSION_SECRET`. שאר החובה עדיין חסרים — לוודא במסך.

---

## שלב 3 — פריסה ראשונה ופתיחת הגישה

1. Netlify → **Deploys → Trigger deploy → Deploy site**. לחכות ל-"Published".
2. לפתוח את האתר: אמור להופיע מסך בדיקת אדם ואז שער הסיסמה. אם מופיע **503** — חסר `SITE_GATE_PASSWORD` או `BOT_CHALLENGE_SECRET` (שלב 2).
3. רק אחרי שהשער עובד: **Site configuration → Access & security → Visitor access** — לכבות את **SSO team login**. (סדר הפוך = אתר סגור לגמרי או פתוח לכולם.)
4. אם עדיין לא הוגדר: לסמן את הכתובת הסופית ב-`SITE_URL` (Production) ולהריץ פריסה נוספת.

---

## שלב 4 — מסד נתונים נפרד לבדיקות (Supabase)

1. Supabase → **New project** (פרויקט שני, חינמי). שם מוצע: `veyra-staging`.
2. **SQL Editor** → להדביק ולהריץ את `public/data/supabase-schema.sql` מה-repo.
3. את `supabase/migrations/20261022000000_daily_streak.sql` — להריץ **רק** אם רוצים לבדוק את הרצף היומי החי בתצוגות מקדימות. זו החלטה נפרדת; לא להריץ בייצור כחלק מהמדריך הזה.
4. **Project Settings → API**: להעתיק URL, anon key ו-secret key → ישר לעמודת **Deploy Previews** בשלב 2.
5. ליצור משתמש בדיקה אחד (Authentication → Users → Add user, עם אימייל מאומת) ולשמור את פרטיו אצלך בלבד.

---

## שלב 5 — תצוגה מקדימה לכל PR

1. Netlify → **Site configuration → Build & deploy → Continuous deployment → Deploy Previews**: לבחור **Any pull request against your production branch**.
2. Branch deploys: **None** (לא צריך).
3. מעכשיו כל PR מקבל ב-GitHub סטטוס/תגובה עם קישור `deploy-preview-<מספר>--<שם-האתר>.netlify.app`, מאחורי שער הסיסמה של הבדיקות.

---

## שלב 6 — הגנה: מיזוג רק אחרי CI ירוק (מומלץ)

Netlify פורס כל מיזוג ל-`main` בלי לחכות ל-CI. לכן ה-CI צריך לעבור **לפני** המיזוג:

GitHub → `orenzbit/veyra-chess` → **Settings → Branches** (או Rules → Rulesets) → כלל על `main`:
- [ ] Require a pull request before merging
- [ ] Require status checks to pass → לבחור **Typecheck and product checks**
- [ ] Block force pushes

---

## בדיקת קבלה (מה נחשב "גמור")

- [ ] מיזוג PR קטן ל-`main` → תוך דקות ב-Netlify **Deploys** מופיעה פריסה חדשה עם אותו commit, והאתר החי מתעדכן.
- [ ] האתר החי: בדיקת אדם → שער סיסמה → כניסה → ארכיון, סקירה, משחק מול בוט, מובייל.
- [ ] PR פתוח מקבל קישור Deploy Preview; כניסה עם משתמש הבדיקה עובדת; **אין** משתמש חדש בפרויקט Supabase של הייצור.
- [ ] בלי הסיסמה — אף אחד מהאתרים לא נפתח.

---

## חזרה לגרסה קודמת (Rollback)

Netlify → **Deploys** → לבחור פריסה תקינה קודמת → **Publish deploy**. זה מיידי ולא משנה את git.
כדי לעצור פריסות אוטומטיות זמנית: **Deploys → Stop auto publishing** (ולהחזיר אחר כך).
תיקון בקוד — תמיד ב-PR רגיל או `git revert`, **אף פעם לא force-push**.

---

## תקלות נפוצות

| סימפטום | סיבה סבירה |
|---|---|
| כל האתר מחזיר 503 | חסר `SITE_GATE_PASSWORD` או `BOT_CHALLENGE_SECRET` בהקשר הזה (Production / Deploy Previews) |
| ה-build נכשל ב-Netlify אבל עובר ב-CI | גרסת Node — לוודא `NODE_VERSION=24` |
| הרשמה/כניסה לא עובדות, האתר מבקש הגדרה | חסר אחד ממשתני Supabase או `AUTH_SESSION_SECRET` |
| Admin לא נפתח | חסר `ADMIN_PASSWORD_HASH` או `ADMIN_SESSION_SECRET` |
| תצוגה מקדימה כותבת למשתמשים אמיתיים | ערכי Supabase של Deploy Previews מצביעים לייצור — לתקן בשלב 2 |
