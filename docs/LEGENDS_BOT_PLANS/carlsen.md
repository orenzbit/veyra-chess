# תוכנית בוט: Carlsen / השחקן הטוב בכל הזמנים

- מזהה: `carlsen`
- קובץ פרופיל: [`public/data/bots/carlsen.json`](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/public/data/bots/carlsen.json)
- מקור: `Carlsen.pgn`
- משחקים לפי הפרופיל: 7815
- אימון: 7035
- holdout: 780
- גרסת מחולל נוכחית: 4
- קטגוריית סגנון נוכחית: `universal`
- פתיחות שמורות בפרופיל: 12 ללבן ו-12 לשחור

## מצב מאומת

Carlsen is generator version 4. Run 39988893612 tested Marshall, Anand, and Carlsen but failed during the Stockfish gate after a depth-8 search exceeded 30 seconds on a FEN; the failure is gate-level, not proof that Carlsen caused it. The profile's current display name is Hebrew and is asserted explicitly by check-legends.

### ראיות רוחביות שמשפיעות על הבוט

- [דוח התקדמות](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/docs/LEGENDS_PROGRESS.md)
- [קוד בחירת המהלך](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/src/bot-engine.ts)
- [בדיקת holdout](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/scripts/check-historical-holdout.mjs)
- [בדיקת איכות Stockfish](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/scripts/check-historical-stockfish.mjs)
- [workflow המלא](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/.github/workflows/legends-full-loop.yml)

## סיכונים שצריך לבדוק

The Stockfish timeout may recur; the alias and expected identity must remain consistent; generic universal heuristics may not capture Carlsen's conversion/endgame style.

אלה סיכונים לבדיקה, לא כשלים מאומתים.

## תוכנית טיפול

Bound and diagnose Stockfish search cost and persist partial per-position diagnostics; rerun separately per bot. Keep the approved display alias consistent and assess Carlsen's practical conversion and endgame decisions on holdout positions.

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
