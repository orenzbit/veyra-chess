# תוכנית בוט: Morphy / Paul Morphy

- מזהה: `morphy`
- קובץ פרופיל: [`public/data/bots/morphy.json`](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/public/data/bots/morphy.json)
- מקור: `Morphy.pgn`
- משחקים לפי הפרופיל: 211
- אימון: 189
- holdout: 22
- גרסת מחולל נוכחית: 3
- קטגוריית סגנון נוכחית: `attacking`
- פתיחות שמורות בפרופיל: 12 ללבן ו-12 לשחור

## מצב מאומת

Current profile is generator version 3 and has the smallest source sample among these 12 profiles: 211 games, 22 holdout games. No Morphy-specific run failure is verified.

### ראיות רוחביות שמשפיעות על הבוט

- [דוח התקדמות](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/docs/LEGENDS_PROGRESS.md)
- [קוד בחירת המהלך](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/src/bot-engine.ts)
- [בדיקת holdout](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/scripts/check-historical-holdout.mjs)
- [בדיקת איכות Stockfish](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/scripts/check-historical-stockfish.mjs)
- [workflow המלא](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/.github/workflows/legends-full-loop.yml)

## סיכונים שצריך לבדוק

Small source and holdout sample may make fidelity scores unstable; the 136 White vs 75 Black game split is uneven.

אלה סיכונים לבדיקה, לא כשלים מאומתים.

## תוכנית טיפול

Regenerate as v4, verify source identity and per-color/phase coverage, report uncertainty explicitly, and expand data only from verified PGNs if coverage is insufficient. Never use holdout positions for tuning.

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
