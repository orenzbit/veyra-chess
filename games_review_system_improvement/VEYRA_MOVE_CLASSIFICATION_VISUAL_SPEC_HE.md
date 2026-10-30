# מפרט חזותי: סיווג מהלכים ב־Veyra Chess

**סטטוס:** מימוש הועלה ל־main; נדרשת בדיקת CI ובדיקה חזותית בפריסה.
**מטרה:** להתאים את סמלי סיווג המהלכים לשפה החזותית של Chess Analyzer בלי לשנות את מנוע הסיווג.

## מיפוי סמלים וצבעים

| סיווג | נכס SVG | צבע |
|---|---|---|
| Brilliant | `brilliant.svg` | `#00D4AA` |
| Great Move | `great_find.svg` | `#4CACEB` |
| Best Move | `best_v2.svg` | `#3AAA55` |
| Excellent | `excellent.svg` | `#6BBF3E` |
| Good | `good.svg` | `#57A055` |
| Book | `book.svg` | `#B8956E` |
| Inaccuracy | `inaccuracy.svg` | `#F1C40F` |
| Mistake | `mistake.svg` | `#E67E22` |
| Miss | `missed_win.svg` | `#FF5252` |
| Blunder | `blunder.svg` | `#D02030` |

כל עשרת קובצי ה־SVG נמצאים ב־`public/classification-icons/`. הם משתמשים בעיצוב משושה, מסגרת לבנה וסמל לבן. גודל התצוגה שהוגדר: 22px ברשימת המהלכים ו־32px בכותרת המאמן. הסיווג `forced` אינו מקבל סמל של קטגוריה אחרת.

## קבצים ששונו

- `src/main.ts`: מיפוי מרכזי של סיווג לנכס SVG; הסמל מוצג ברשימת המהלכים ובכותרת המאמן.
- `public/styles.css`: מידות ותצוגת SVG.
- `public/credits.html`: ייחוס למאגר המקור ורישיון MIT.
- `public/classification-icons/*.svg`: עשרת נכסי הסיווג המקוריים.

## מה לא השתנה

`src/review-metrics.ts`, ספי הסיווג, מנוע הניתוח, ניתוח PGN והסברי המאמן לא שונו. הצבע הוא ייצוג חזותי בלבד ואינו קובע את הסיווג.

## בדיקות קבלה

1. כל עשרת הסיווגים ממופים לקובץ SVG הנכון.
2. אותו מיפוי משמש ברשימת המהלכים ובכותרת המאמן.
3. לכל סמל יש `alt` ו־`title` עם שם הסיווג.
4. `forced` אינו מוצג בטעות כ־Good.
5. בדיקות TypeScript/Build ו־CI עוברות.
6. נדרשת בדיקה חזותית בדפדפן כדי לאשר את התוצאה בפריסה החיה.

## רישוי וייחוס

הסמלים נלקחו מ־[imutkarsht/Chess_analyzer](https://github.com/imutkarsht/Chess_analyzer). קובץ [CREDITS.md](https://github.com/imutkarsht/Chess_analyzer/blob/master/CREDITS.md) של המקור מציין רישיון MIT לנכסים ב־`assets/images/`. הייחוס נוסף ל־`public/credits.html`.
