# תוכנית בוט: Anderssen / The Immortal Gambit

- מזהה: `anderssen`
- קובץ פרופיל: [`public/data/bots/anderssen.json`](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/public/data/bots/anderssen.json)
- מקור: `Anderssen.pgn`
- משחקים לפי הפרופיל: 680
- אימון: 611
- holdout: 69
- גרסת מחולל נוכחית: 3
- קטגוריית סגנון נוכחית: `attacking`
- פתיחות שמורות בפרופיל: 12 ללבן ו-12 לשחור

## מצב מאומת

Current profile is generator version 3; no bot-specific failure for Anderssen is established by the reviewed workflow logs because the latest loop stopped earlier at Marshall.

### ראיות רוחביות שמשפיעות על הבוט

- [דוח התקדמות](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/docs/LEGENDS_PROGRESS.md)
- [קוד בחירת המהלך](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/src/bot-engine.ts)
- [בדיקת holdout](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/scripts/check-historical-holdout.mjs)
- [בדיקת איכות Stockfish](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/scripts/check-historical-stockfish.mjs)
- [workflow המלא](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/.github/workflows/legends-full-loop.yml)

## סיכונים שצריך לבדוק

The configured searchDepth 5 can exceed practical runtime; attack/gambit style may be overrepresented in heuristics.

אלה סיכונים לבדיקה, לא כשלים מאומתים.

## תוכנית טיפול

Regenerate and validate as v4, measure depth-5 runtime, compare sacrifices against Stockfish and held-out historical games, then adjust only the demonstrated source of error.

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
