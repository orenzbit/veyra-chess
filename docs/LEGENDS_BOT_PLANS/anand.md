# תוכנית בוט: Anand / The Lightning Strategist

- מזהה: `anand`
- קובץ פרופיל: [`public/data/bots/anand.json`](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/public/data/bots/anand.json)
- מקור: `Anand.pgn`
- משחקים לפי הפרופיל: 4253
- אימון: 3828
- holdout: 425
- גרסת מחולל נוכחית: 4
- קטגוריית סגנון נוכחית: `universal`
- פתיחות שמורות בפרופיל: 12 ללבן ו-12 לשחור

## מצב מאומת

Run 40029785021 reached Anand qualification and completed 1/1 game as a draw after 70 plies; this is a successful qualification game, not proof of full bot quality. The latest full-loop run later failed on Marshall before the full holdout/Stockfish gates.

### ראיות רוחביות שמשפיעות על הבוט

- [דוח התקדמות](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/docs/LEGENDS_PROGRESS.md)
- [קוד בחירת המהלך](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/src/bot-engine.ts)
- [בדיקת holdout](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/scripts/check-historical-holdout.mjs)
- [בדיקת איכות Stockfish](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/scripts/check-historical-stockfish.mjs)
- [workflow המלא](https://github.com/orenzbit/veyra-chess/blob/player-data-batch/.github/workflows/legends-full-loop.yml)

## סיכונים שצריך לבדוק

Opening position matching, historical move overlap, and whether the small Anand-specific style bonuses improve fidelity without harming chess quality.

אלה סיכונים לבדיקה, לא כשלים מאומתים.

## תוכנית טיפול

Re-run the current holdout sample by phase, add the surprise-move scenarios, compare bot vs historical move and Stockfish separately, and keep Anand-specific tuning only if evidence supports it.

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
