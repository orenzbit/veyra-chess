# תוכנית בוט: Marshall / The Tactical Hammer

- מזהה: `marshall`
- קובץ פרופיל: [`public/data/bots/marshall.json`](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/public/data/bots/marshall.json)
- מקור: `Marshall.pgn`
- משחקים לפי הפרופיל: 1024
- אימון: 921
- holdout: 103
- גרסת מחולל נוכחית: 4
- קטגוריית סגנון נוכחית: `attacking`
- פתיחות שמורות בפרופיל: 12 ללבן ו-12 לשחור

## מצב מאומת

Run 40029785021 explicitly completed 90 plies in the Marshall-vs-Tal qualifier, then exited 124 at the 120-second timeout. Run 40028170906 also failed in the Marshall qualifier. This is the strongest currently confirmed bot-specific failure.

### ראיות רוחביות שמשפיעות על הבוט

- [דוח התקדמות](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/docs/LEGENDS_PROGRESS.md)
- [קוד בחירת המהלך](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/src/bot-engine.ts)
- [בדיקת holdout](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/scripts/check-historical-holdout.mjs)
- [בדיקת איכות Stockfish](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/scripts/check-historical-stockfish.mjs)
- [workflow המלא](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/.github/workflows/legends-full-loop.yml)

## סיכונים שצריך לבדוק

The capped search may still be too slow; style bonuses may favor checks/captures without enough tactical justification.

אלה סיכונים לבדיקה, לא כשלים מאומתים.

## תוכנית טיפול

Measure time per move and phase, verify the timeout and checkpoint behavior, reduce cost at the root cause (search branching/depth/quiescence) rather than faking completion, then rerun Marshall vs Tal and its holdout/Stockfish gates.

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
