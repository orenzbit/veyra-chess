# תוכנית בוט: Capablanca / Cuban Endgame Maestro

- מזהה: `capablanca`
- קובץ פרופיל: [`public/data/bots/capablanca.json`](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/public/data/bots/capablanca.json)
- מקור: `Capablanca.pgn`
- משחקים לפי הפרופיל: 597
- אימון: 537
- holdout: 60
- גרסת מחולל נוכחית: 3
- קטגוריית סגנון נוכחית: `endgame`
- פתיחות שמורות בפרופיל: 12 ללבן ו-12 לשחור

## מצב מאומת

A prior run 39732399007 passed a set of CI checks on an older commit; the current profile is generator version 3, so that historical run does not certify the current profile. No current Capablanca failure is verified.

### ראיות רוחביות שמשפיעות על הבוט

- [דוח התקדמות](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/docs/LEGENDS_PROGRESS.md)
- [קוד בחירת המהלך](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/src/bot-engine.ts)
- [בדיקת holdout](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/scripts/check-historical-holdout.mjs)
- [בדיקת איכות Stockfish](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/scripts/check-historical-stockfish.mjs)
- [workflow המלא](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/.github/workflows/legends-full-loop.yml)

## סיכונים שצריך לבדוק

Prior successful CI can be mistaken for current full-loop proof; the endgame label may not translate into reliable conversion decisions.

אלה סיכונים לבדיקה, לא כשלים מאומתים.

## תוכנית טיפול

Regenerate as v4 and rerun current build, holdout, Stockfish and endgame/surprise checks. Keep old run as historical evidence only.

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
