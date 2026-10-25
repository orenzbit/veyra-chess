# סקירה מקיפה: השוואה והמלצות לשילוב מנגנוני הניתוח מ-`Chess_analyzer` ב-Veyra Chess

**תאריך:** 25 באוקטובר 2026
**מחבר:** Jules (AI Software Engineer)
**נשוא הסקירה:** [imutkarsht/Chess_analyzer](https://github.com/imutkarsht/Chess_analyzer)
**יעד האינטגרציה:** Veyra Chess (`src/review-metrics.ts`, `public/engine-worker.js`, `src/main.ts`)

---

## 1. תקציר מנהלים ותשובות לשאלות הליבה

### ❓ האם כדאי להשתמש ב-repo זה כדי לאמן/לשפר את מערכת הניתוח של Veyra Chess?
**כן, מומלץ מאוד – ברמה הרעיונית, האלגוריתמית והלוגית (מבלי להעתיק את הקוד כמות שהוא).**

המאגר `imutkarsht/Chess_analyzer` מכיל מימוש מקיף, איכותי ומודרני מאוד של אלגוריתמי ניתוח שחמט ב-Python, המבוססים על העקרונות והסטנדרטים של Chess.com ו-Lichess.

> **חשוב להבחין:**
> - `Chess_analyzer` הינו יישום שולחני (Desktop App) שנכתב ב-**Python 3.10+** ו-**PyQt6** המשתמש ב-Stockfish נייטיב דרך פרוטוקול UCI.
> - `Veyra Chess` הינה אפליקציית **Web / PWA** המבוססת על **TypeScript**, **WASM (Chessy Engine)** ו-**Web Workers**.
>
> לכן, **אין מדובר בהעתקת קבצים (Copy-Paste) או הרצת Python בדפדפן**, אלא ב-**Porting (תרגום) של האלגוריתמים, ההוריסטיקות והנוסחאות הסטטיסטיות מ-Python ל-TypeScript**.

---

### 💡 למה כדאי? (הערך והיתרונות ל-Veyra Chess)

1. **זיהוי מהלכי "הקרבה מבריקה" (Brilliant Move Detection) ברמה מקצועית:**
   כיום ב-Veyra הסיווג ל-Brilliant נסמך על הוריסטיקה פשטנית בלבד (הכאת כלי בשילוב ירידה נמוכה בסיכויים). ב-`Chess_analyzer` יש מנגנון מורכב הבודק הקרבת חומר אמיתית (Sacrifice Detection) תוך שימוש ב-Static Exchange Evaluation (SEE), וידוא שההקרבה סבירה (Sound) ולא הפסד חומר סתמי, ובדיקת הקשר המשחק (למשל, האם היתרון כבר מוחץ).
2. **סיווג מהלכים מתקדם (Great, Miss, Best, Blunder):**
   - **Great Move:** זיהוי מהלך יחידני שמציל משחק או שומר על יתרון, ע"י השוואת Multi-PV (בדיקה שכל החלופות גרועות ב-15%+).
   - **Miss:** הבחנה מדויקת בין Blunder (שגורם להפסד ישיר) לבין Miss (פספוס הזדמנות ניצחון מובהקת כאשר המשחק נשאר שקול/מוביל).
   - **Noise Guard:** מניעת תיוג שגוי של Blunder/Mistake כאשר השחקן נמצא בעמדה מנצחת לחלוטין (למשל, יתרון של 700+ סנטיפדונים / מעל +7).
3. **ניתוח טקטיקה ושלבי משחק (Tactical Motifs & Phase Analytics):**
   זיהוי תבניות טקטיות (Forks, Pins, Skewers, Hanging Pieces), וחישוב מדדי דיוק מופרדים לפי פתיחה (Opening), מציע (Middlegame) וסיום (Endgame).
4. **מאמן AI מבוסס LLM (AI Coach Summaries):**
   אינטגרציה של פרומפטים מובנים ותמיכה בספקי LLM (כגון Groq / LM Studio / MiniMax / OpenAI compatible) לייצור דוחות ניתוח מילוליים ומותאמים אישית בסיום המשחק.

---

### 📜 האם ה-repo ברישיון MIT?
**כן.** המאגר `imutkarsht/Chess_analyzer` מוגדר תחת **MIT License**, דבר התואם לחלוטין את מדיניות הרישוי המוחלטת של Veyra Chess (`npm run check:mit-only`).

*הערת זהירות לגבי נכסי צד שלישי:* גרפיקת כלי השחמט במאגר המקורי (`assets/pieces/`) מגיעה מתמונות Cburnett ומוגדרת תחת CC BY-SA 3.0. ב-Veyra Chess אין צורך לייבא תמונות אלו מפני ול-Veyra יש כבר לוח ותצוגת כלים משלה (`cm-chessboard`).

---

## 2. השוואה טכנית מפורטת: `Chess_analyzer` מול `Veyra Chess`

| פיצ'ר / אלגוריתם | `Veyra Chess` (מצב נוכחי) | `Chess_analyzer` (המאגר שנבחן) | הפער והזדמנות השיפור עבור Veyra |
|---|---|---|---|
| **שפת פיתוח וסביבה** | TypeScript (Web / WASM Worker) | Python 3.10+ (Desktop PyQt6 + python-chess) | תרגום לוגי ל-TypeScript ללא תלויות שרת/Python |
| **זיהוי מהלך Brilliant** | הוריסטיקה בסיסית של הכאה/תנועה במודול `src/review-metrics.ts` | אלגוריתם `_detect_sacrifice` עם בדיקת SEE, יציבות העמדה (WPL ≤ 0.05) וגדר היסטורית | מעבר לזיהוי הקרבה אמיתי (לא רק הכאה) ומניעת Brilliant מזויף בעמדות מנצחות |
| **זיהוי מהלך Great** | מרווח קבוע של ירידה ≤ 1% בסיכויים | השוואת Multi-PV (המהלך השני בטיבו גרוע ב-15%+ בסיכויי הזכייה), ומניעת תגובת "מהלך שגרתי" / recapture | שילוב Multi-PV במנוע ה-Worker וזיהוי מהלכי "Only Move" קריטיים |
| **זיהוי מהלך Miss** | ירידה בסיכויים מ-68%+ ל-55%- | מנגנון `is_missed_opportunity`: שחקן עם יתרון ניכר (≥70%) שלא מצא את העונש אך נשאר בתיקו/יתרון קל | הבחנה ברורה בין פריקת יתרון (Miss) לבין נפילה להפסד (Blunder) |
| **הגנת עמדה מנצחת (Noise Guard)** | ללא סינון עמדה מוחצת | אם הציון לאחר המהלך הוא עדיין 700+ cp (או -700 לשחור), המהלך לא יסווג כ-Blunder/Mistake | מניעת תסכול של משתמשים המקבלים "שגיאה חמורה" כשהם כבר בצירוף מנצח מוחלט |
| **חישוב סיכויי זכייה (Win Probability)** | נוסחת Sigmoid CAPS מותאמת ב-`src/review-metrics.ts` | נוסחה מבוססת Logistic ($50 + 50 \cdot (\frac{2}{1 + e^{-0.00368208 \cdot cp}} - 1)$) | כיול מדויק של עקומת סיכויי הניצחון ב-Veyra בהתאם לסטנדרט Chess.com |
| **שקלול תנודתיות (Volatility Weighting)** | חלון של 4 מהלכים עם נורמליזציה של סטיית תקן | סטיית תקן נעה עם הבלגה בין 0.5 ל-12.0 (כמו ב-Lichess) | יישור קו עם מנגנון המשקולות ב-`math_utils.py` |
| **ניתוח טקטי (Tactical Motifs)** | לא קיים כרגע ב-Veyra | מודול `src/backend/analysis/tactics/` (זיהוי המזלג, הריתוק, השיפוד וכלים תלויים) | הוספת לשונית / רכיב ניתוח טקטיקות ב-Veyra |
| **AI Coach / סיכום מילולי** | טקסטים מובנים וסטטיים | מודול `groq_service.py` עם Prompt Engineering לייצור סיכום מילולי אוטומטי ב-LLM | חיבור אפשרות ל-AI Coach דינמי דרך API ב-Veyra |

---

## 3. אלגוריתמי הליבה מ-`Chess_analyzer` (מפרט טכני)

### א. אלגוריתם סיווג המהלכים (`move_classifier.py`)

הלוגיקה ב-`Chess_analyzer` עובדת לפי סדר עדיפויות קשיח (Priority Pipeline):

1. **Book Move & Forced Move:**
   אם המהלך בספר הפתיחות $\rightarrow$ `"Book"`.
   אם יש רק מהלך חוקי יחיד בעמדה $\rightarrow$ `"Forced"`.

2. **Crushing Position Maintenance (שמירה על יתרון מוחץ):**
   אם השחקן החזיק בעמדת מט/יתרון מוחץ ונשאר בעמדת מט/יתרון מוחץ $\rightarrow$ `"Best"`.

3. **Check for Best Move:**
   אם המהלך ששוחק שווה ל-`best_move`:
   - **Brilliant Detection:**
     1. בדיקת הקרבה (`_detect_sacrifice`): האם שחקן ויתר על כלי (פרש, רץ, צריח, מלכה) או הניח אותו במקום שבו הוא מותקף ע"י כלי נמוך יותר בערכו.
     2. סבירות טקטית: תוספת אובדן סיכויים $WPL \le 0.05$.
     3. סיכויים לאחר המהלך: $WinProb_{after} \ge 0.40$.
     4. גדר הקשר (Context Gating): אם העמדה לפני הייתה $WinProb_{before} < 0.95$, ההקרבה מאושרת כ-Brilliant. אם העמדה הייתה כבר מובילה בבירור ($WinProb_{before} \ge 0.95$), נדרש שההקרבה תוביל למט כפוי או שלפי Multi-PV החלופות היו נחותות משמעותית.
   - **Great Detection:**
     1. המהלך אינו recapture (הכאה חוזרת) ואינו הכאה שגרתית.
     2. לפי Multi-PV, המהלך השני בטיבו גרוע ב- $15\%$ ומעלה בסיכויי הזכייה ($diff \ge 0.15$).

4. **Miss Detection (פספוס הזדמנות):**
   אם $WinProb_{before} \ge 0.70$ והשחקן שמט יתרון כך ש-$WPL \ge 0.15$ אך עדיין $WinProb_{after} \ge 0.42$ $\rightarrow$ `"Miss"`.

5. **Blunder Detection:**
   אם $WPL \ge 0.25$ ו-$WinProb_{after} < 0.60$, **או** $WPL \ge 0.20$ ו-$WinProb_{after} < 0.35$ (כל עוד הציון אינו נשאר 700+ cp) $\rightarrow$ `"Blunder"`.

6. **Standard Expected Points Tiers (מדרגות רגילות):**
   - $WPL \ge 0.10 \rightarrow$ `"Mistake"`
   - $WPL \ge 0.05 \rightarrow$ `"Inaccuracy"`
   - $WPL \ge 0.02 \rightarrow$ `"Good"`
   - $WPL < 0.02 \rightarrow$ `"Excellent"`

---

### ב. מנגנון זיהוי הקרבה (Sacrifice Detection Logic)

ב-`Chess_analyzer` המנגנון בודק:
1. **שינוי במאזן החומר הסטטי:** השוואת ערך הכלים של השחקן לפני המהלך ואחרי המהלך.
2. **SEE (Static Exchange Evaluation):** בדיקה האם המשבצת אליה נע הכלי מותקפת ע"י כלי יריב בערך נמוך יותר, או האם הכלי שהוזז הושאר כעת כנעזב/מותקף ללא הגנה מספקת.
3. **הבחנה בין טרייד שווה לבין הקרבה:** אם הערך שהוקרב הוחזר מיד באותו מהלך (למשל, הכאת מלכה ע"י מלכה), זהו טרייד ולא הקרבה.

---

## 4. תוכנית עבודה מעשית לשילוב ב-Veyra Chess ("איך לעשות את זה")

להלן מפת דרכים מפורטת למימוש השיפורים בתוך קוד Veyra Chess:

### שלב 1: שדרוג מודול סיווג המהלכים (`src/review-metrics.ts`)

1. **הוספת פונקציית זיהוי הקרבה ב-TypeScript:**
   ניצור פונקציית עזר `detectSacrifice(beforeFen: string, playedUci: string, capturedPiece?: string)` בתוך `src/review-metrics.ts`.
   הפונקציה תבצע הערכת ערכי כלים (P=1, N=3, B=3, R=5, Q=9) ותבדוק האם המהלך מציע כלי שערכו גבוה מזה של הכלי שהוכה, תוך בדיקת הגנת הכלים.

2. **עדכון `classifyReviewMove` לתמיכה במדרגות `Chess_analyzer`:**
   נשדרג את הפונקציה ב-`src/review-metrics.ts` להכיל את הלוגיקה והסדר הבאים:
   ```typescript
   // 1. Noise Guard - Crushing position protection
   const stillCrushing = moverChanceAfter >= 92; // equivalent to cp >= 700

   // 2. Brilliant calculation with sacrifice validation
   if (isBest && isSacrifice && isSound && (!isCrushingBefore || leadsToMate)) {
     return "brilliant";
   }

   // 3. Great move calculation (using multi-PV delta if available)
   if (isBest && !isRecapture && secondBestDelta >= 0.15) {
     return "great";
   }

   // 4. Miss calculation
   if (moverChanceBefore >= 70 && drop >= 0.15 && moverChanceAfter >= 42 && !stillCrushing) {
     return "miss";
   }

   // 5. Blunder & standard tiers with Noise Guard
   if (!stillCrushing) {
     if ((drop >= 0.25 && moverChanceAfter < 60) || (drop >= 0.20 && moverChanceAfter < 35)) {
       return "blunder";
     }
     if (drop >= 0.10) return "mistake";
     if (drop >= 0.05) return "inaccuracy";
   } else {
     if (drop >= 0.20) return "inaccuracy"; // Demote blunders in crushing positions
   }
   ```

---

### שלב 2: שילוב Multi-PV במנוע ה-Worker (`public/engine-worker.js`)

כדי שניתן יהיה לזהות **Great Moves** בצורה אמינה:
1. נעדכן את ה-Worker ב-`public/engine-worker.js` לתמוך בפרמטר `multiPv: 2` במידת הצורך (או חישוב מהיר של ה-PV השני במידה והזמן מאפשר).
2. אם ה-PV השני מוחזר, נעביר את הערכת הסיכויים שלו (`secondBestChance`) לחישוב ב-`analyzeGameMoves` ב-`src/review-metrics.ts`.

---

### שלב 3: אינטגרציית AI Coach דינמי ב-Veyra (`src/ai-coach.ts`)

1. ב-`Chess_analyzer` קיים פרומפט מובנה המפרק את המשחק ל:
   - סיכום כללי (Overall Summary)
   - נקודת המפנה (Turning Point)
   - תבניות חזורות (Tactical / Positional Motifs)
   - המלצה ממוקדת לשיפור (Key Takeaway)
2. ב-Veyra ניתן להוסיף מודול קל משקל `src/ai-coach-service.ts` שמאפשר למשתמש להזין מפתח API של Groq / OpenAI / Ollama בהגדרות, ולייצר ניתוח מילולי מעיל בצד הלקוח.

---

### שלב 4: אימות והרצת בדיקות רגרסיה (Verification & Benchmarking)

1. **עדכון בדיקות היחידה וה-Benchmark:**
   ב-Veyra קיים סקריפט בנצ'מרק ייעודי: `scripts/review-benchmark/games.json` המופעל ע"י `npm run bench:review`.
2. לאחר עדכון הנוסחאות ב-`src/review-metrics.ts`, נריץ את הבנצ'מרק כדי לוודא שזיהוי המהלכים משתפר ודיוק הסיווג עולה.
3. נריץ את כל בדיקות האיכות המובנות:
   ```bash
   npm run check
   npm run bench:review
   npm run check:release
   ```

---

## 5. סיכום ומסקנות סופיות

1. **המלצה חד משמעית:** **כדאי מאוד** לאמץ את העקרונות והאלגוריתמים מ-`imutkarsht/Chess_analyzer`.
2. **אינטגרציה קלה ובטוחה:** הרישיון הוא **MIT**, והאינטגרציה מבוצעת ע"י כתיבה מחדש (Porting) ב-TypeScript, כך שאין שום סיכון אבטחתי, שום תלות ב-Python ושום פגיעה בביצועי הדפדפן.
3. **הערך המוסף המיידי:** שדרוג חווית הסקירה ב-Veyra Chess לרמה של Chess.com/Lichess – זיהוי הקרבות מבריקות (Brilliant), מהלכים יחידניים (Great), והסרת התראות שווא (Noise Guard).
