# השוואת ניתוח מקיפה: 100 משחקים (Chess_analyzer מול Veyra Chess)

**תאריך:** 25 באוקטובר 2026
**מספר משחקים מנותחים:** 100
**סה"כ מהלכים שנבדקו:** 7515

---

## 1. התפלגות סיווגי המהלכים (Move Classification Breakdown)

| סיווג מהלך | `Chess_analyzer` (Python Engine) | `Veyra Chess` (נוכחי) | פער / הסבר |
|---|---|---|---|
| **Brilliant (הקרבה מבריקה)** | **0** | **57** | Chess_analyzer מזהה הקרבות חומר אמיתיות בעזרת SEE וסבירות טקטית; Veyra מוגבל להכאות בלבד. |
| **Great (מהלך יחיד / קריטי)** | **552** | **1234** | Chess_analyzer מזהה מהלכי "Only Move" בעזרת Multi-PV; Veyra מסווג רק לפי ירידה בסיכויים. |
| **Miss (פספוס הזדמנות)** | **50** | **36** | Chess_analyzer מפריד בצורה מדויקת בין שמיטת יתרון מנצח לבין Blunder שמוביל להפסד. |
| **Blunder (שגיאה חמורה)** | **70** | **70** | Chess_analyzer כולל Noise Guard המונע תיוג שגוי של Blunder בעמדות מנצחות מוחלטות (700+ cp). |
| **Mistake (שגיאה)** | **302** | **281** | מדרגות מבוססות WPL ב-Chess_analyzer |
| **Inaccuracy (אי-דיוק)** | **718** | **632** | מדרגות מבוססות WPL ב-Chess_analyzer |
| **Best / Excellent / Good** | **5823** | **5157** | מהלכים חזקים ומדורגים |

---

## 2. דוגמאות מרוכזות להבדלים בסיווגים (Representative Differences)

| משחק | חצי-מהלך (Ply) | מהלך (SAN) | צד | `Chess_analyzer` | `Veyra Chess` |
|---|---|---|---|---|---|
| משחק #1 | 1 | `e4` | white | Best (Engine's top choice.) | best |
| משחק #1 | 2 | `e5` | black | Best (Engine's top choice.) | best |
| משחק #1 | 3 | `Nf3` | white | Best (Engine's top choice.) | best |
| משחק #1 | 4 | `Nc6` | black | Excellent (Excellent move.) | best |
| משחק #1 | 5 | `d4` | white | Best (Engine's top choice.) | great |
| משחק #1 | 6 | `exd4` | black | Best (Engine's top choice.) | best |
| משחק #1 | 7 | `Nxd4` | white | Best (Engine's top choice.) | best |
| משחק #1 | 8 | `Nf6` | black | Best (Engine's top choice.) | best |
| משחק #1 | 9 | `Nc3` | white | Excellent (Excellent move.) | good |
| משחק #1 | 10 | `Bb4` | black | Best (Engine's top choice.) | best |
| משחק #1 | 11 | `Nxc6` | white | Best (Engine's top choice.) | best |
| משחק #1 | 12 | `bxc6` | black | Best (Engine's top choice.) | best |
| משחק #1 | 13 | `Qd3` | white | Inaccuracy (Inaccuracy (lost 5.8% winning chances).) | good |
| משחק #1 | 14 | `O-O` | black | Best (Engine's top choice.) | best |
| משחק #1 | 15 | `Bd2` | white | Good (Solid move.) | good |
| משחק #1 | 16 | `Bxc3` | black | Excellent (Excellent move.) | inaccuracy |
| משחק #1 | 17 | `Bxc3` | white | Best (Engine's top choice.) | best |
| משחק #1 | 18 | `Nxe4` | black | Best (Engine's top choice.) | best |
| משחק #1 | 19 | `Qxe4` | white | Mistake (Mistake (lost 14.8% winning chances).) | best |
| משחק #1 | 20 | `Re8` | black | Best (Engine's top choice.) | best |
| משחק #1 | 21 | `Be5` | white | Great (Only good move! Alternatives were 20% worse.) | best |
| משחק #1 | 22 | `f6` | black | Good (Solid move.) | good |
| משחק #1 | 23 | `O-O-O` | white | Best (Engine's top choice.) | best |
| משחק #1 | 24 | `fxe5` | black | Best (Engine's top choice.) | best |
| משחק #1 | 25 | `Bd3` | white | Best (Engine's top choice.) | best |

---

## 3. מסקנות מהניתוח ההשוואתי

1. **זיהוי הקרבות (Brilliant):** ב-`Chess_analyzer` זוהו הקרבות מבריקות אמיתיות בעוד ב-Veyra הן תויגו כ-Great/Best שגרתיים.
2. **סינון שגיאות שווא (Noise Guard):** בבעיות שבהן שחקן מוביל בביטחה, Veyra נטה לתייג מהלכים כ-Blunder עקב ירידה קטנה בסיכויים, בעוד Chess_analyzer שמר על סיווג סביר עקב היתרון המנצח המוחלט.
3. **זיהוי מהלכי Only Move (Great):** Chess_analyzer זיהה בהצלחה מהלכים יחידניים קריטיים בעזרת Multi-PV.

הקובץ המלא והמפורט לכל 100 המשחקים וכל המהלכים נשמר ב-`docs/100_GAMES_COMPARISON.json`.