# תוכנית בוט: Fischer / Bobby Fischer

- מזהה: `fischer`
- קובץ פרופיל: [`public/data/bots/fischer.json`](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/public/data/bots/fischer.json)
- מקור: `Fischer.pgn`
- משחקים לפי הפרופיל: 825
- אימון: 742
- holdout: 83
- גרסת מחולל נוכחית: 3
- קטגוריית סגנון נוכחית: `positional`
- פתיחות שמורות בפרופיל: 12 ללבן ו-12 לשחור

## מצב מאומת

Current profile is generator version 3; no Fischer-specific workflow failure is verified in reviewed runs.

### ראיות רוחביות שמשפיעות על הבוט

- [דוח התקדמות](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/docs/LEGENDS_PROGRESS.md)
- [קוד בחירת המהלך](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/src/bot-engine.ts)
- [בדיקת holdout](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/scripts/check-historical-holdout.mjs)
- [בדיקת איכות Stockfish](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/scripts/check-historical-stockfish.mjs)
- [workflow המלא](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/.github/workflows/legends-full-loop.yml)

## סיכונים שצריך לבדוק

The profile's positional label may not capture Fischer's full style; 12 White and 12 Black repertoire lines are not by themselves proof of broad historical fidelity.

אלה סיכונים לבדיקה, לא כשלים מאומתים.

## תוכנית טיפול

Regenerate as v4, validate source and phase-balanced holdout positions, inspect missed historical moves and surprise responses, and revise style model only if repeatable evidence shows a mismatch.

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
