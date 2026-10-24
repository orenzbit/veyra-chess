# תוכנית בוט: Karpov / Anatoly Karpov

- מזהה: `karpov`
- קובץ פרופיל: [`public/data/bots/karpov.json`](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/public/data/bots/karpov.json)
- מקור: `Karpov.pgn`
- משחקים לפי הפרופיל: 3525
- אימון: 3173
- holdout: 352
- גרסת מחולל נוכחית: 3
- קטגוריית סגנון נוכחית: `positional`
- פתיחות שמורות בפרופיל: 12 ללבן ו-12 לשחור

## מצב מאומת

Current profile is generator version 3; no Karpov-specific failure is verified in reviewed logs.

### ראיות רוחביות שמשפיעות על הבוט

- [דוח התקדמות](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/docs/LEGENDS_PROGRESS.md)
- [קוד בחירת המהלך](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/src/bot-engine.ts)
- [בדיקת holdout](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/scripts/check-historical-holdout.mjs)
- [בדיקת איכות Stockfish](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/scripts/check-historical-stockfish.mjs)
- [workflow המלא](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/.github/workflows/legends-full-loop.yml)

## סיכונים שצריך לבדוק

A coarse positional bonus could produce generic play rather than Karpov-like prophylaxis and conversion; historical move overlap is only a style proxy.

אלה סיכונים לבדיקה, לא כשלים מאומתים.

## תוכנית טיפול

Regenerate as v4; sample positions with quiet improvements, restriction of counterplay, and endgame conversion; compare choices to source games and engine evaluations before tuning.

## קריטריוני מעבר

1. המקור, ה-hash, ספירת המשחקים וחלוקת אימון/holdout תקינים.
2. הפרופיל נבנה בהצלחה בגרסת המחולל הנוכחית וה-manifest תואם ל-runtime.
3. כל מהלך שנבחר חוקי בכל עמדות הבדיקה.
4. דוח holdout כולל עמדות פתיחה, אמצע וסיום; תוצאות חסרות מסומנות ככשל.
5. Stockfish משלים את כל החיפושים המוגדרים, או שהכשל מתועד ומונע מעבר. אין להתעלם מ-timeout.
6. מבחני ההפתעה מתועדים בנפרד מהמשחקים ההיסטוריים.
7. בדיקות הביצועים וה-CI הרלוונטיות עוברות.
8. בדיקות רגרסיה לבוטים ההיסטוריים האחרים עוברות.

## סטטוס נוכחי

- מחקר קבצים: הושלם לקריאה בלבד.
- בדיקות חדשות בבוט הזה: טרם הורצו במסגרת מחזור העבודה הנוכחי.
- תיקוני קוד: טרם בוצעו.
- החלטת מוכנות: **ממתין לתוצאות בדיקות עדכניות**.
