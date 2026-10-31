(() => {
  "use strict";
  const catalog = [
    ["home", "בית", "Home", "חוויה קולנועית והיכרות", "Cinematic introduction", "01", "product"],
    ["archive", "ארכיון", "Archive", "כל המשחקים, במקום אחד", "All your games in one place", "02", "product"],
    ["review", "סקירת משחק", "Game review", "לוח, מסעים והסבר", "Board, moves and explanations", "03", "product"],
    ["dna", "Chess DNA", "Chess DNA", "הסיפור שמאחורי המדדים", "The story behind the metrics", "04", "product"],
    ["bots", "בוטים", "Bots", "בחירת יריב וכניסה למשחק", "Choose an opponent and play", "05", "product"],
    ["legends", "אגדות", "Legends", "שני סגנונות נפגשים על הלוח", "Two styles meet on the board", "06", "product"],
    ["blindfold", "שחמט עיוור", "Blindfold", "לראות את הלוח בזיכרון", "See the board in your mind", "07", "product"],
    ["puzzles", "פאזלים", "Puzzles", "אימון קצר וממוקד", "Short, focused practice", "08", "product"],
    ["openings", "פתיחות", "Openings", "מהבחירה אל העמדה", "From a choice to a position", "09", "product"],
    ["clock", "שעון שחמט", "Chess clock", "רק הזמן והמסע הבא", "Only the time and the next move", "10", "product"],
    ["account", "חשבון", "Account", "זהות, גישה וסנכרון", "Identity, access and sync", "11", "product"],
    ["adaptive", "התאמה אישית", "Adaptive", "הבחירה נשארת אצלך", "The choice stays yours", "12", "secondary"],
    ["download", "הורדה למחשב", "Desktop", "אותה חוויה, כניסה אחרת", "Same experience, another entry point", "13", "secondary"],
    ["help", "מרכז עזרה", "Help", "הצעה חדשה לספריית הסברים", "Proposed guidance library", "14", "secondary"],
    ["legal", "מדיניות", "Policies", "מידע ברור, בלי רעש", "Clear information, no noise", "15", "secondary"],
    ["credits", "קרדיטים", "Credits", "המקורות שמאחורי המוצר", "The sources behind the product", "16", "secondary"],
    ["admin", "ניהול", "Admin", "תצוגת אזור תפעולי, לא מערכת הרשאות", "Operations preview, not access control", "17", "admin"]
  ];
  const positions = {
    start: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR",
    e4: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR",
    e5: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR",
    nf3: "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R",
    nc6: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R",
    italian: "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R",
    spanish: "r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R",
    scotch: "r1bqkbnr/pppp1ppp/2n5/4p3/3PP3/5N2/PPP2PPP/RNBQKB1R",
    puzzle: "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR",
    solved: "r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR"
  };
  const escape = value => String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
  const sequence = ["start", "e4", "e5", "nf3", "nc6", "italian"];
  const notation = ["", "e4", "e5", "Nf3", "Nc6", "Bc4"];
  const prompts = [
    {
      title: ["מעבדת מסע אחד", "The One-Move Observatory"],
      use: ["רעיון עתידי לסקירת משחק", "Future game-review concept"],
      text: [
        "עצב חוויית סקירת שחמט בשם One-Move Observatory עבור Veyra. הרעיון המרכזי: להפריד בין מה שקרה, מה שהמנוע מציע ומה שהשחקן רוצה לבדוק. האווירה היא חדר מחקר אפל ושקט, לא משחק ארקייד. השתמש ברקע שחור עמוק עם זוהר כתום חלש מאחורי אזור ההסבר, טיפוגרפיה גדולה בתחילת החוויה וצפיפות מדויקת בזמן העבודה.\n\nבפתיחה, ציר מסעים דק נחשף לאורך המסך. בגלילה אחת מתמקדים ברגע מתוך משחק לדוגמה: הלוח נשאר שטוח ויציב; שלושה כרטיסים נכנסים בסדר 'מה שיחקת', 'מה אפשר לבדוק', 'למה זה משנה'. המעבר אינו משנה עמדה ללא בחירה מפורשת. בזמן חקירה, עצור את כל התנועה הדקורטיבית. אפשר לסמן חלופה, להשוות שתי עמדות ולחזור למסע המקורי בלי לאבד מקום.\n\nאין להמציא ציוני מנוע, הסברים אישיים או הבטחות שיפור. סמן דוגמה וחלופות שטרם נותחו. השתמש רק ב־cm-chessboard ובכלים הרשמיים; ללא תלת־ממד בלוח. במובייל הצג לוח, מסע נבחר ואז הסבר; לא שלושה טורים מכווצים. תמוך ב־RTL/LTR, מקלדת, מוקד גלוי ותנועה מופחתת. תוצר: HTML מקומי עובד עם משחק קבוע, פתיחת הסבר, מעבר מסעים, איפוס ומצבי טעינה/שגיאה. שילוב מנוע והסתעפויות הוא שלב נפרד, לא יכולת שהאב־טיפוס מבטיח.",
        "Design One-Move Observatory for Veyra: a chess review experience separating what happened, what an engine suggests, and what the player wants to investigate. The atmosphere is a quiet, dark research room, never an arcade. Use deep black layers, a faint orange glow behind the explanation area, bold introductory typography and deliberate information density during analysis.\n\nOpen with a fine move timeline. One scroll focuses on a moment from a clearly labeled sample game. Keep the board flat and still while three panels arrive in order: Played, Explore, Why it matters. Decorative transitions must never change the position without an explicit choice. Stop all ambient movement once the user begins analysis. Offer alternative selection, position comparison and a return to the original move without losing context.\n\nNever fabricate engine scores, personal explanations or improvement promises. Label unanalysed alternatives. Use the actual cm-chessboard with official standard pieces, no 3D gameplay board. Mobile order: board, selected move, explanation; never three compressed columns. Support RTL/LTR, keyboard access, visible focus and reduced motion. Deliver offline HTML with a fixed game, working explanations, navigation, reset and loading/error states. Engine integration and branching analysis are a separate future implementation, not capabilities implied by the prototype."
      ]
    },
    {
      title: ["אטלס פתיחות חי", "The Opening Atlas"],
      use: ["רעיון עתידי לחקר פתיחות", "Future opening exploration concept"],
      text: [
        "עצב עבור Veyra אטלס פתיחות שנראה כמו מפה מדויקת, לא תרשים עמוס. הרקע שחור עמוק; מסלול כתום אחד הוא מוקד הקשב, ושאר הענפים דקים ואפורים. המטפורה: כל מסע הוא צומת, כל פתיחה היא דרך לבנות עמדה. אל תציג מנצח מובטח או שיעורי הצלחה ללא מקור.\n\nפתח בתצוגה רחבה של שלושה מסלולים לדוגמה. כאשר בוחרים מסלול, שאר המסלולים נחלשים, הנתיב מתקרב והלוח השטוח נפתח לצדו. בחירת צומת מעדכנת עמדה, מסע ורעיון קצר יחד. הוסף פירורי דרך קבועים וכפתור 'חזרה לצומת הקודם'. תנועת מצלמה היא מטפורה לממשק בלבד; הלוח עצמו אינו מסתובב או מתפרק. אל תשתמש בגרירה כדרך היחידה להתקדם.\n\nבמובייל המפה הופכת לרשימת צעדים אנכית עם מסלול נבחר אחד. לכל צומת תווית טקסט נגישה; אין הסתמכות על צבע בלבד. תמוך בעברית ובאנגלית, מקלדת ותנועה מופחתת. הדגם שלוש פתיחות אמיתיות עם FEN תואם לכל צעד. הוסף חיפוש, מצב ללא תוצאות ותיאור ברור של גבולות המדגם. 'הרפרטואר שלי', המלצות אישיות וחזרה מרווחת יסומנו כרעיונות עתידיים. תוצר: HTML מקומי; ללא הורדת נתוני משתמש, ללא תוספים כבדים וללא אנימציה מתמשכת בזמן קריאה.",
        "Design an Opening Atlas for Veyra that feels like a precise map, not a crowded diagram. Deep black is the ground; one orange path carries attention while other branches remain fine and grey. Each move is a junction and each opening is a route toward a position. Never imply guaranteed wins or display unsourced success rates.\n\nBegin with three sample routes. Selecting one dims the others, brings its path into focus and reveals a flat board beside it. A node selection updates the position, move and brief strategic idea together. Keep breadcrumbs and a Previous junction action visible. Camera choreography is a UI metaphor only: the chessboard must not rotate, explode or tilt. Dragging must never be the only navigation method.\n\nOn mobile, turn the map into a vertical sequence showing one selected route. Provide text labels, keyboard controls, visible focus, Hebrew/English and reduced motion. Model three real openings with matching FEN positions at every step. Include search, no-results feedback and clear sample boundaries. My repertoire, personalised recommendations and spaced repetition are future ideas, not working features. Deliver offline HTML with no user-data downloads, heavy plugins or perpetual animation while reading."
      ]
    },
    {
      title: ["טקס אימון של חמש דקות", "The Five-Minute Training Ritual"],
      use: ["רעיון עתידי לחיבור בין DNA לאימון", "Future DNA-to-training concept"],
      text: [
        "בנה קונספט אימון ל־Veyra שבו המשתמש בוחר מטרה קטנה ומסיים עם תובנה אחת, לא עם עוד מסך ניקוד. שפה חזותית: שחור עמוק, כתום מאופק, מספרים גדולים ומשטחי עבודה רגועים. שלושת המצבים הם 'בוחרים מטרה', 'מנסים על הלוח', 'מבינים מה קרה'. בלי לחץ מלאכותי, התראות מאשימות או טענות לשיפור דירוג.\n\nהפתיחה מציגה כרטיס מטרה, זמן משוער והסבר מדוע התרגיל רלוונטי. מעבר ממוקד חושף לוח שטוח; כל רעשי הרקע נעלמים. אחרי תשובה, הצג הסבר לפני הציון. אפשר לבקש רמז, לנסות שוב או לסיים. הסיכום מציג מה תורגל, מה נשאר פתוח וכפתור לחזרה לעמדה. שעון הוא בחירה, לא כפייה, ואין לאפס עבודה כאשר החלון מאבד מיקוד.\n\nאם האימון נבחר מתוך DNA, הצג מקור ראיה ממשי וקישור למשחק. אם אין חיבור כזה, כתוב 'תרגיל לדוגמה' ואל תיצור התאמה אישית מדומה. במובייל הפקדים נגישים מתחת ללוח; במחשב פרטי האימון בצד. תמוך בעברית/אנגלית, קוראי מסך, מקלדת ותנועה מופחתת. תוצר: אב־טיפוס HTML עם תרגיל קבוע שנבדק, תשובה נכונה ושגויה, רמז, ניסיון נוסף וסיכום. מנוע המלצות, רצפים וסנכרון נשארים מחוץ להיקף הראשוני.",
        "Create a Veyra training concept where the player chooses one small objective and leaves with one insight, not another score screen. Use deep black, restrained orange, large numerals and calm working surfaces. Three phases: Choose a goal, Try on the board, Understand the outcome. No artificial urgency, guilt-based notifications or rating-improvement claims.\n\nThe introduction presents a goal, estimated duration and an explanation of relevance. A focused transition reveals a flat chessboard and removes ambient distractions. After an answer, explain before scoring. Offer a hint, retry or finish. The summary records what was practised, what remains unresolved and a return-to-position action. Timing is optional; do not reset work when the window loses focus.\n\nIf training comes from Chess DNA, show real supporting evidence and a game link. Without that integration, say Sample exercise instead of inventing personalisation. Put reachable controls below the mobile board and supporting details beside the desktop board. Support Hebrew/English, screen readers, keyboard access and reduced motion. Deliver offline HTML with one verified fixed exercise, correct/incorrect answers, hint, retry and summary. Recommendations, streak persistence and sync remain outside the first prototype."
      ]
    }
  ];

  function render(page, context) {
    const { t, path, boardMarkup } = context;
    const meta = catalog.find(item => item[0] === page);
    const button = (label, action, style = "ghost") => `<button type="button" class="button ${style}" data-action="${action}">${label}</button>`;
    const link = (label, destination, style = "ghost") => `<a class="button ${style}" href="${path(destination)}">${label}</a>`;
    const part = (id, label) => `<h2 class="pg-part"><span>${id}</span>${label}</h2>`;
    const panel = (label, content, className = "") => `<section class="pg-panel ${className}"><h2>${label}</h2>${content}</section>`;
    const note = text => `<p class="pg-note">${text}</p>`;
    const demo = `<aside class="pg-demo">${t("תצוגת עיצוב מקומית. נתוני דוגמה בלבד; אין מנוע, חיבור לחשבון או שמירה לשרת.", "Local design preview. Sample data only; no engine, account connection or server storage.")}</aside>`;
    const board = (position = "nc6", hidden = false) => `<div class="pg-board-wrap${hidden ? " pieces-hidden" : ""}"><div class="pg-player"><span>${t("שחור · דוגמה", "Black · sample")}</span><bdi>05:00</bdi></div><div class="pg-position">${boardMarkup(position)}</div><div class="pg-player"><span>${t("לבן · דוגמה", "White · sample")}</span><bdi>05:00</bdi></div></div>`;
    const moveControls = `<div class="pg-actions">${button(t("התחלה", "Start"), "first")}${button(t("הקודם", "Previous"), "prev")}${button(t("הבא", "Next"), "next", "accent")}</div>`;
    const moves = `<ol class="pg-moves">${notation.slice(1).map((move, index) => `<li><button type="button" data-action="move" data-index="${index + 1}" aria-pressed="${index === 3}"><span>${index + 1}</span><bdi>${move}</bdi></button></li>`).join("")}</ol>`;
    const status = `<p class="pg-feedback" role="status" aria-live="polite"></p>`;
    let content = "";
    if (page === "studio") {
      content = `<header class="pg-intro studio-intro"><div class="eyebrow">VEYRA / DESIGN COLLECTION</div><h1>${t("אותה תחושה.<br><em>כל עמוד, לעצמו.</em>", "One feeling.<br><em>A purpose for every page.</em>")}</h1><p>${t("כל העמודים המקומיים במקום אחד. פתח עמוד, בדוק את החלקים הממוספרים, ותגיד מה לשמור ומה לשנות.", "Every local page in one place. Open a page, inspect its numbered sections, and decide what to keep or change.")}</p><div class="pg-actions"><a class="button accent" href="#collection">${t("לכל העמודים", "Browse all pages")}</a><a class="button ghost" href="#ideas">${t("רעיונות ופרומפטים", "Ideas & prompts")}</a></div></header>${demo}
      <section id="collection">${part("01", t("מפת התצוגות", "The preview collection"))}<div class="studio-grid">${catalog.map(item => `<a class="studio-card ${item[6]}" href="${path(item[0])}"><span class="pg-index">${item[5]} / ${item[0].toUpperCase()}</span><h3>${t(item[1], item[2])}</h3><p>${t(item[3], item[4])}</p><span class="studio-open">${t("פתיחת HTML", "Open HTML")} ↗</span></a>`).join("")}</div></section>
      <section id="ideas">${part("02", t("שלושה כיוונים שאפשר לפתח", "Three directions to explore"))}${note(t("אלה רעיונות חדשים, לא יכולות קיימות או שינוי שאושר. לכל רעיון בריף שניתן להעתיק ולהשתמש בו בנפרד.", "These are new ideas, not existing or approved features. Each includes a reusable creative brief."))}<div class="prompt-grid">${prompts.map((prompt, index) => `<article class="pg-panel prompt-card"><span class="eyebrow">CONCEPT 0${index + 1}</span><h3>${t(...prompt.title)}</h3><p>${t(...prompt.use)}</p><details><summary>${t("לפתוח את הפרומפט המלא", "Read the full prompt")}</summary><textarea id="prompt-${index}" readonly aria-label="${t(...prompt.title)}">${escape(t(...prompt.text))}</textarea>${button(t("העתקת הפרומפט", "Copy prompt"), `copy-${index}`)}</details></article>`).join("")}</div>${status}</section>
      <section>${part("03", t("איך נבדוק ביחד", "How we review this"))}<div class="pg-three">${panel(t("לשמור", "Keep"), note(t("מה מרגיש נכון ושימושי?", "What feels right and useful?")))}${panel(t("לשנות", "Change"), note(t("איזה חלק צפוף, ריק או לא ברור?", "Which section is crowded, empty or unclear?")))}${panel(t("להסיר", "Remove"), note(t("רק אחרי שמבינים איזו יכולת תיפגע.", "Only after understanding which capability would be affected.")))}</div></section>`;
    } else {
      content = `<header class="pg-intro"><a class="pg-back" href="${path("studio")}">${t("כל התצוגות", "All previews")} / ${meta[5]}</a><div class="eyebrow">VEYRA / ${page.toUpperCase()}</div><h1>${t(meta[1], meta[2])}<span>.</span></h1><p>${t(meta[3], meta[4])}</p></header>${demo}`;
      if (page === "review") content += `${part("01", t("סביבת החקירה", "The investigation workspace"))}<div class="pg-workspace"><section>${board()}${moveControls}</section><aside>${panel(t("המשחק לדוגמה", "Sample game"), `<p class="pg-kicker">WHITE / BLACK · OPEN GAME</p>${moves}<div class="pg-selected"><span>${t("מסע נבחר", "Selected move")}</span><strong class="pg-current">2... Nc6</strong></div>`)}${panel(t("מה רואים כאן?", "What is happening?"), `<p class="pg-explanation">${t("השחור מפתח את הפרש ל־c6 ומגן על הרגלי ב־e5. זהו הסבר לדוגמה, לא פלט מנוע.", "Black develops the knight to c6 and protects the e5 pawn. This is sample commentary, not engine output.")}</p>${button(t("פתיחת סיכום", "Open summary"), "summary")}`)}${status}</aside></div>${part("02", t("לשמור את ההקשר", "Keep the context"))}<div class="pg-three">${panel(t("מקור המשחק", "Game source"), note(t("כאן יוצגו פרטי הייבוא, התאריך והקצב.", "Import source, date and time control belong here.")))}${panel(t("הערכה", "Evaluation"), `<strong class="pg-stat">—</strong>${note(t("אין מנוע פעיל בתצוגה; לא מוצג ציון מדומה.", "No engine is running; no fabricated score is shown."))}`)}${panel("Chess DNA", note(t("המשך מהמשחק הבודד לתמונה הרחבה.", "Move from one game to the broader picture.")) + link(t("פתיחת הדוח לדוגמה", "Open sample report"), "dna"))}</div>`;
      if (page === "bots") content += `${part("01", t("בוחרים יריב", "Choose your opponent"))}${note(t("שמות וסגנונות להמחשת העיצוב בלבד; אינם נתוני הקמפיין האמיתי.", "Names and styles illustrate the layout only; they are not actual campaign data."))}<div class="bot-roster">${[["01", t("הסבלני", "The Patient"), t("לבנות עמדה לפני שמתקיפים", "Build before attacking")], ["02", t("הנועז", "The Bold"), t("לבדוק את הגבולות של המרכז", "Challenge the centre")], ["03", t("המדויק", "The Precise"), t("לשחק עם פחות מקום לטעות", "Play with less room for error")]].map((item, index) => `<button type="button" class="bot-card" data-action="opponent" data-name="${item[1]}" aria-pressed="${index === 0}"><span class="bot-emblem">${item[0]}</span><h3>${item[1]}</h3><p>${item[2]}</p><small>${t("בחירה לדוגמה", "Sample choice")}</small></button>`).join("")}</div>${part("02", t("המשחק שלך", "Your game"))}<div class="pg-setup">${panel(t("תנאי הפתיחה", "Starting conditions"), `<p>${t("נבחר:", "Selected:")} <strong id="opponent-name">${t("הסבלני", "The Patient")}</strong></p><label>${t("הצד שלך", "Your side")}<select id="bot-side"><option value="white">${t("לבן", "White")}</option><option value="black">${t("שחור", "Black")}</option></select></label><label>${t("קצב לדוגמה", "Sample time control")}<select><option>5 + 0</option><option>10 + 0</option><option>15 + 10</option></select></label>${button(t("פתיחת מסך המשחק", "Open game layout"), "bot-start", "accent")}${status}`)}<section class="pg-game-preview" hidden>${board("start")}<div class="pg-actions">${button(t("מסע לדוגמה", "Sample move"), "next")}${link(t("לעבור לסקירה", "Go to review"), "review")}</div>${note(t("תצוגת המשחק בלבד — אין יריב פעיל או שעון רץ.", "Game layout only — no active opponent or running clock."))}</section><div class="pg-quiet-card"><span>PLAY WITH INTENT</span><strong>01 → 02 → 03</strong><p>${t("להתקדם בקצב שלך. ההתקדמות כאן מומחשת בלבד.", "Progress at your own pace. Progression here is illustrative only.")}</p></div></div>`;
      if (page === "legends") content += `${part("01", t("שני סגנונות, לוח אחד", "Two styles, one board"))}<div class="legends-versus"><label>${t("צד לבן — סגנון לדוגמה", "White — sample style")}<select><option>${t("התקפי", "Attacking")}</option><option>${t("עמדתי", "Positional")}</option></select></label><strong>VS</strong><label>${t("צד שחור — סגנון לדוגמה", "Black — sample style")}<select><option>${t("עמדתי", "Positional")}</option><option>${t("התקפי", "Attacking")}</option></select></label></div><div class="pg-workspace"><section>${board()}${moveControls}</section><aside>${panel(t("לצפות. לעצור. להבין.", "Watch. Pause. Understand."), `<p>${t("התצוגה מדגימה בקרת צפייה על פתיחה קבועה. בחירת הסגנון אינה מפעילה בוט או משנה את רצף הדוגמה.", "This preview demonstrates playback controls over a fixed opening. Style choices do not run bots or alter the sample sequence.")}</p>${button(t("הפעלה אוטומטית", "Auto-play"), "playback")}<strong class="pg-current">2... Nc6</strong>${moves}${status}`)}${panel(t("להמשיך מהעמדה", "Continue from here"), `<div class="pg-actions">${link(t("סקירת משחק", "Game review"), "review")}${link(t("תרגול עיוור", "Blindfold practice"), "blindfold")}</div>${note(t("קישורים בין תצוגות — העמדה אינה מועברת למנוע.", "Links between previews — no position is transferred to an engine."))}`)}</aside></div>`;
      if (page === "blindfold") content += `${part("01", t("העמדה בראש שלך", "The position in your mind"))}<div class="pg-workspace blindfold-layout"><section>${board("nc6", true)}<div class="pg-actions">${button(t("לחשוף כלים", "Reveal pieces"), "reveal")}${button(t("לחשוף מסע לדוגמה", "Reveal sample move"), "next")}</div></section><aside>${panel(t("מה אתה זוכר?", "What do you remember?"), `<p class="pg-large">${t("הפרש השחור האחרון<br>נחת ב־…", "The last black knight<br>landed on…")}</p>${note(t("רצף הדוגמה: 1. e4 e5 2. Nf3 Nc6", "Sample sequence: 1. e4 e5 2. Nf3 Nc6"))}<div class="pg-actions">${button("c6", "recall-c6")}${button("f6", "recall-f6")}${button("d7", "recall-d7")}</div>${status}`)}${panel(t("אימון, בלי רעש", "Practice without noise"), note(t("כאן ההסתרה היא של הכלים בלבד. מסע הבא מוגבל לפתיחה קבועה; אין בוט פעיל.", "Here only the pieces are hidden. Next move uses a fixed opening; no bot is running.")) + link(t("חזרה לסקירה", "Back to review"), "review"))}</aside></div>`;
      if (page === "puzzles") content += `${part("01", t("איך תרצה להתאמן?", "How would you like to practise?"))}<div class="pg-tabs" role="group" aria-label="${t("מצב אימון", "Training mode")}">${[["daily",t("תרגיל לדוגמה", "Sample")],["personal","Personal"],["rush","Rush"]].map(([key,label],i)=>`<button type="button" data-action="puzzle-mode" data-mode="${key}" aria-pressed="${i===0}">${label}</button>`).join("")}</div><p id="puzzle-mode-note" class="pg-note">${t("מט במסע אחד. לבן משחק. אותה דוגמה בכל המצבים.", "Mate in one. White to move. All modes use the same sample.")}</p><div class="pg-workspace"><section>${board("puzzle")}</section><aside>${panel(t("למצוא את המסע", "Find the move"), `<span class="pg-index">SAMPLE / MATE IN ONE</span><h3 class="pg-large">${t("מלכה ורץ.<br>רעיון אחד.", "Queen and bishop.<br>One idea.")}</h3><div class="pg-answer-list">${button("Qxf7#", "answer-correct", "accent")}${button("Qxe5+", "answer-wrong")}${button("Bxf7+", "answer-wrong")}</div><div class="pg-actions">${button(t("רמז", "Hint"), "hint")}${button(t("לנסות מחדש", "Try again"), "puzzle-reset")}</div>${status}`)}${panel(t("למה זה עובד?", "Why does it work?"), note(t("ההסבר נפתח לאחר תשובה. בלי דירוג אישי, רצף מומצא או הבטחת שיפור.", "Explanation appears after an answer. No personal rating, invented streak or improvement promise.")))}</aside></div>`;
      if (page === "openings") content += `${part("01", t("בחר דרך להיכנס למשחק", "Choose a way into the game"))}<div class="opening-layout"><aside class="pg-panel opening-library"><label>${t("חיפוש פתיחה", "Find an opening")}<input id="opening-search" type="search" placeholder="${t("שם או מסע…", "Name or move…")}"></label>${[["italian",t("הפתיחה האיטלקית", "Italian Game"),"Bc4"],["spanish",t("הפתיחה הספרדית", "Ruy Lopez"),"Bb5"],["scotch",t("הפתיחה הסקוטית", "Scotch Game"),"d4"]].map(([key,name,move],i)=>`<button type="button" class="opening-option" data-action="opening" data-opening="${key}" aria-pressed="${i===0}"><span>0${i+1}</span><strong>${name}</strong><bdi>3. ${move}</bdi></button>`).join("")}<p id="opening-empty" hidden role="status">${t("אין התאמה בדוגמאות. נסה שם אחר.", "No matching sample. Try another name.")}</p></aside><section>${board("italian")}<div class="opening-route"><span>1. e4 e5</span><span>2. Nf3 Nc6</span><strong id="opening-move">3. Bc4</strong></div>${panel(t("הרעיון של המסע", "The idea behind the move"), `<p id="opening-idea">${t("הרץ מתפתח ל־c4 ומכוון לאלכסון f7. זו עמדה לדוגמה, לא המלצה מותאמת אישית.", "The bishop develops to c4 and points toward f7. A sample position, not a personalised recommendation.")}</p>`)}</section></div>`;
      if (page === "clock") content += `${part("01", t("הזמן בידיים שלך", "Time in your hands"))}${note(t("זהו שעון מקומי שעובד בתצוגה. בחירת קצב או איפוס מתחילים זמן חדש; אין חיבור למשחק או שמירה.", "This local preview clock works. A preset or reset starts fresh time; no game connection or storage."))}<div class="pg-tabs" role="group" aria-label="${t("קצב משחק", "Time control")}">${[1,3,5,10].map(minutes=>`<button type="button" data-action="clock-preset" data-minutes="${minutes}" aria-pressed="${minutes===5}">${minutes} + 0</button>`).join("")}</div><div class="clock-duo" dir="ltr"><button type="button" class="clock-face" data-action="clock-tap" data-side="0"><span>${t("לבן", "White")}</span><strong id="clock-0">05:00</strong><small>${t("לחיצה מעבירה תור", "Tap to switch turn")}</small></button><button type="button" class="clock-face" data-action="clock-tap" data-side="1"><span>${t("שחור", "Black")}</span><strong id="clock-1">05:00</strong><small>${t("לחיצה מעבירה תור", "Tap to switch turn")}</small></button></div><div class="pg-actions clock-actions">${button(t("התחלה", "Start"), "clock-toggle", "accent")}${button(t("איפוס", "Reset"), "clock-reset")}</div>${status}<p class="pg-note">${t("תצוגת הפתיחה אינה מתחילה לספור אוטומטית. אפשר להשתמש ב־Tab וב־Enter על כל פקד.", "The clock does not start automatically. Every control supports Tab and Enter.")}</p>`;
      if (page === "account") content += `${part("01", t("מקום אחד לחשבון שלך", "One place for your account"))}<div class="account-layout"><section class="account-promise"><span class="eyebrow">YOUR CHESS / YOUR SPACE</span><h2>${t("להמשיך.<br>מהמקום שלך.", "Continue.<br>From where you left off.")}</h2><p>${t("טופס נקי בכניסה; מידע ברור ושליטה כשכבר מחוברים.", "A focused entry form; clear information and control once signed in.")}</p><div class="account-orbit" aria-hidden="true"><span>V</span></div></section><section class="pg-panel"><div class="pg-tabs" role="group" aria-label="${t("מסך חשבון", "Account screen")}">${[["login",t("כניסה", "Sign in")],["signup",t("הרשמה", "Sign up")],["verify",t("אימות", "Verify")],["profile",t("החשבון", "Account")]].map(([key,label],i)=>`<button type="button" data-action="account-tab" data-tab="${key}" aria-pressed="${i===0}">${label}</button>`).join("")}</div><div id="account-form">${accountForm("login", t)}</div>${status}</section></div>`;
      if (page === "adaptive") content += `${part("01", t("התאמה אישית, בהסכמה", "Personalisation with consent"))}<div class="consent-layout"><section class="pg-panel consent-primary"><span class="pg-status-dot"></span><h2>${t("אתה מחליט.", "You decide.")}</h2><p>${t("דוגמת ממשק להסכמה ברורה. הפעלת המתג אינה שולחת נתונים ואינה משנה את ההגדרה באתר.", "A clear consent interface study. This switch sends no data and does not change the live setting.")}</p><label class="consent-toggle"><input type="checkbox" id="adaptive-toggle"><span>${t("להדגים מצב מופעל", "Preview enabled state")}</span></label>${status}</section><div>${panel(t("מה צריך להסביר לפני הפעלה", "Explain before enabling"), `<ul class="pg-list"><li>${t("איזה מידע נדרש ולשם מה.", "Which information is needed and why.")}</li><li>${t("כיצד מפסיקים את ההתאמה האישית.", "How to turn personalisation off.")}</li><li>${t("מה נשמר בפועל ומה אינו נאסף.", "What is actually stored and what is not collected.")}</li></ul>${note(t("הניסוח הסופי חייב להתאים למימוש ולמדיניות הקיימת; כאן לא נקבעה מדיניות חדשה.", "Final wording must match implementation and existing policy; this preview defines no new policy."))}`)}${link(t("למסמכי המדיניות", "Policy documents"), "legal")}</div></div>`;
      if (page === "download") content += `${part("01", t("Veyra, גם על שולחן העבודה", "Veyra, on your desktop"))}<div class="download-layout"><section><div class="pg-platform">WINDOWS / DESKTOP</div><h2 class="pg-large">${t("פחות חיפוש.<br>יותר שחמט.", "Less searching.<br>More chess.")}</h2><p>${t("עמוד אחד להתקנה, הסבר ודרישות. לא עוד שני יעדים לאותה הורדה.", "One destination for installation, guidance and requirements. No duplicate download pages.")}</p><div class="pg-actions">${button(t("לראות את מסלול ההתקנה", "Preview installation steps"), "install", "accent")}<a class="button ghost" href="../public/download.html">${t("עמוד ההורדה הקיים", "Existing download page")}</a></div>${note(t("התצוגה אינה מורידה קובץ ואינה מבטיחה עבודה ללא אינטרנט. פרטי ההתקנה המאומתים בעמוד הקיים.", "This preview downloads nothing and makes no offline promise. Verified installation information belongs to the existing page."))}</section><div class="desktop-frame"><div><i></i><i></i><i></i><span>VEYRA</span></div>${board("italian")}</div></div>`;
      if (page === "help") content += `${part("01", t("מה תרצה להבין?", "What would you like to understand?"))}${note(t("עמוד עזרה מוצע — אינו קיים כעמוד בממשק שנבדק.", "Proposed help page — not an existing screen in the inspected UI."))}<div class="help-layout"><nav class="help-topics"><a href="#help-import">${t("הבאת משחקים", "Bringing games")}</a><a href="#help-review">${t("סקירת משחק", "Game review")}</a><a href="#help-dna">Chess DNA</a></nav><section class="faq-list">${[["import",t("מאיפה מביאים משחקים?", "Where do games come from?"),t("במוצר קיימים מסלולים ל־Chess.com, ל־Lichess ולטעינת PGN. בתצוגות כאן משתמשים בדוגמאות קבועות בלבד.", "The product includes Chess.com, Lichess and PGN paths. These previews use fixed samples only.")],["review",t("מה ההבדל בין מסע להסבר?", "How do moves and explanations relate?"),t("בחירת מסע מציגה עמדה מסוימת. הסבר צריך להתייחס לאותה עמדה ולציין אם מקורו בניתוח או בדוגמה.", "A selected move identifies a position. Commentary should refer to that position and distinguish analysis from sample content.")],["dna",t("האם דוח DNA כאן הוא הדוח שלי?", "Is this DNA report my personal report?"),t("לא. זו הדגמה מסומנת. לא נטענו משחקים אישיים ולא חושבו מסקנות עליך.", "No. It is a labeled example. No personal games were loaded or conclusions drawn about you.")]].map(([id,q,a])=>`<details id="help-${id}"><summary>${q}</summary><p>${a}</p></details>`).join("")}${link(t("חזרה לארכיון", "Back to archive"), "archive")}</section></div>`;
      if (page === "legal") content += `${part("01", t("המסמכים, בצורה ברורה", "The documents, clearly"))}${note(t("זהו עיצוב לאינדקס המסמכים, לא נוסח משפטי חדש. הקישורים פותחים את המסמכים הקיימים ללא שינוי.", "This is a document-index design, not new legal wording. Links open existing documents unchanged."))}<div class="policy-grid">${[["privacy",t("פרטיות", "Privacy")],["terms",t("תנאי שימוש", "Terms")],["cookies",t("עוגיות", "Cookies")],["refunds",t("החזרים", "Refunds")],["accessibility",t("נגישות", "Accessibility")]].map(([key,label],i)=>`<a class="pg-panel policy-link" href="../public/legal/${key}.html"><span class="pg-index">0${i+1}</span><h2>${label}</h2><span>${t("למסמך הקיים", "Read existing document")} ↗</span></a>`).join("")}</div>`;
      if (page === "credits") content += `${part("01", t("נותנים קרדיט למקור", "Credit the source"))}<div class="credits-layout">${panel("cm-chessboard", `<span class="pg-license">MIT / LIBRARY</span><p>${t("ספריית הלוח שמציגה את עמדות המשחק.", "The board library displaying the game positions.")}</p><a class="pg-text-link" href="https://github.com/shaack/cm-chessboard" target="_blank" rel="noopener">${t("למאגר המקור", "Source repository")} ↗</a>`)}${panel(t("איורי הכלים הרשמיים", "Official standard artwork"), `<span class="pg-license">CC BY-SA 3.0 / ARTWORK</span><p>Cburnett · Rfc1394<br>Stefan Haack</p>${note(t("האיורים ללא שינוי; רישיון האיורים נפרד מרישיון קוד הספרייה.", "Artwork is unchanged; its license is separate from the library code license."))}`)}</div><a class="button ghost" href="../public/credits.html">${t("כל הקרדיטים והייחוסים הקיימים", "All existing credits and attributions")}</a>`;
      if (page === "admin") content += `${part("01", t("תמונת מצב תפעולית", "Operational overview"))}<aside class="pg-warning">${t("הדגמת עיצוב ציבורית בלבד. אין כאן אימות הרשאות, נתונים אמיתיים או פעולות ניהול פעילות.", "Public design sample only. No authorisation, real data or active administrative operations.")}</aside><div class="pg-three">${panel(t("בקשות לדוגמה", "Sample requests"), '<strong class="pg-stat">03</strong>')}${panel(t("שירותים", "Services"), `<strong class="pg-stat">—</strong>${note(t("לא נבדק חיבור", "Connection not checked"))}`)}${panel(t("פעולות אמיתיות", "Real operations"), `<strong class="pg-stat">00</strong>`)}</div>${part("02", t("תור בקשות לדוגמה", "Sample request queue"))}<div class="pg-table-scroll"><table class="pg-table"><thead><tr><th>${t("בקשה", "Request")}</th><th>${t("סוג", "Type")}</th><th>${t("מצב", "State")}</th><th>${t("פרטים", "Details")}</th></tr></thead><tbody>${["A01","A02","A03"].map((id,i)=>`<tr><td>${id}</td><td>${t("בקשת גישה לדוגמה", "Sample access request")}</td><td><span class="pg-chip">${t(i===2?"נבדקה":"ממתינה",i===2?"Reviewed":"Pending")}</span></td><td>${button(t("פתיחת פרטים", "Inspect"),"admin-detail")}</td></tr>`).join("")}</tbody></table></div>${note(t("עריכת בוטים, הרשאות ונתוני אמת יישארו במערכת המוגנת; אינם מחוברים לתצוגה זו.", "Bot editing, permissions and real data remain in the protected system; they are not connected to this preview."))}`;
    }
    return `<div class="pg-page pg-${page}" data-preview-page="${page}">${content}</div>`;
  }

  function accountForm(tab, t) {
    if (tab === "profile") return `<div class="profile-sample"><span class="profile-avatar">V</span><h2>${t("חשבון לדוגמה", "Sample account")}</h2><p>${t("מצב סנכרון: לא מחובר בתצוגה", "Sync status: not connected in preview")}</p><button type="button" class="button ghost" data-action="account-info">${t("פרטיות ומחיקה", "Privacy & deletion")}</button></div>`;
    if (tab === "verify") return `<form class="pg-form" data-demo-form><h2>${t("אימות לדוגמה", "Sample verification")}</h2><label>${t("קוד דוגמה — לא קוד אמיתי", "Sample code — not a real code")}<input inputmode="numeric" pattern="[0-9]{6}" maxlength="6" required placeholder="123456" autocomplete="off"></label><button class="button accent" type="submit">${t("בדיקת הממשק", "Test the interface")}</button><p class="pg-note">${t("לא נשלח קוד ולא מתבצע אימות.", "No code is sent and no verification takes place.")}</p></form>`;
    return `<form class="pg-form" data-demo-form><h2>${t(tab === "signup" ? "פותחים מקום חדש" : "טוב שחזרת", tab === "signup" ? "Make room for your chess" : "Welcome back")}</h2><label>${t("כתובת לדוגמה בלבד", "Sample email only")}<input type="email" placeholder="player@example.com" required autocomplete="off"></label><label>${t("טקסט לדוגמה — לא להזין סיסמה אמיתית", "Sample text — do not enter a real password")}<input type="text" minlength="4" placeholder="demo-only" required autocomplete="off"></label><button class="button accent" type="submit">${t("בדיקת הטופס", "Test the form")}</button><p class="pg-note">${t("המידע אינו נשמר או נשלח. זהו עיצוב טופס, לא מערכת התחברות.", "Nothing is stored or submitted. This is a form study, not authentication.")}</p></form>`;
  }

  function wire(page, context) {
    const { app, t, listen, showDialog, mountBoards, boardMarkup, setBoardPosition, flipBoard } = context;
    if (!app.querySelector(".pg-page")) return () => {};
    let moveIndex = page === "bots" ? 0 : 4;
    let playback;
    let clockTimer;
    let clockMinutes = 5;
    let times = [300000, 300000];
    let activeSide = 0;
    let running = false;
    let lastTick = 0;
    let solved = false;
    const feedback = message => {
      const target = app.querySelector(".pg-feedback");
      if (target) target.textContent = message;
    };
    const setPosition = key => {
      const host = app.querySelector(".pg-position .preview-board");
      if (host) setBoardPosition(host, key);
    };
    function selectMove(index) {
      moveIndex = Math.max(0, Math.min(sequence.length - 1, index));
      setPosition(sequence[moveIndex]);
      app.querySelectorAll('[data-action="move"]').forEach(button => button.setAttribute("aria-pressed", String(Number(button.dataset.index) === moveIndex)));
      const current = app.querySelector(".pg-current");
      if (current) current.textContent = moveIndex ? `${Math.ceil(moveIndex / 2)}${moveIndex % 2 ? "." : "..."} ${notation[moveIndex]}` : t("עמדת פתיחה", "Starting position");
      const explanation = app.querySelector(".pg-explanation");
      if (explanation) explanation.textContent = t([
        "העמדה הראשונית. כל הכלים נמצאים בערוגות הפתיחה.",
        "הרגלי מתקדם ל־e4 ומפנה דרך לרץ ולמלכה.",
        "השחור משיב ב־e5 ומציב רגלי במרכז.",
        "הפרש הלבן מתפתח ל־f3 ותוקף את הרגלי ב־e5.",
        "השחור מפתח את הפרש ל־c6 ומגן על הרגלי ב־e5.",
        "הרץ הלבן מתפתח ל־c4 ומכוון לאורך האלכסון ל־f7."
      ][moveIndex], [
        "Starting position. Every piece is on its original square.",
        "The pawn advances to e4, opening paths for the bishop and queen.",
        "Black replies with e5, placing a pawn in the centre.",
        "The white knight develops to f3 and attacks the e5 pawn.",
        "Black develops the knight to c6 and protects the e5 pawn.",
        "The white bishop develops to c4 and points along the diagonal toward f7."
      ][moveIndex]) + " " + t("הסבר קבוע לדוגמה.", "Fixed sample commentary.");
    }
    function paintClock() {
      times.forEach((time, side) => {
        const total = Math.ceil(time / 1000);
        const display = document.getElementById(`clock-${side}`);
        if (display) display.textContent = `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
      });
      app.querySelectorAll(".clock-face").forEach(button => {
        button.classList.toggle("running", running && Number(button.dataset.side) === activeSide);
        button.disabled = !running || Number(button.dataset.side) !== activeSide;
      });
      const toggle = app.querySelector('[data-action="clock-toggle"]');
      if (toggle) toggle.textContent = t(running ? "השהיה" : "התחלה", running ? "Pause" : "Start");
    }
    function tick() {
      if (!running) return;
      const now = performance.now();
      times[activeSide] = Math.max(0, times[activeSide] - (now - lastTick));
      lastTick = now;
      if (times[activeSide] === 0) {
        running = false;
        clearInterval(clockTimer);
        feedback(t("הזמן נגמר. אפשר לאפס ולהתחיל מחדש.", "Time is up. Reset to start again."));
      }
      paintClock();
    }
    function resetClock() {
      clearInterval(clockTimer);
      running = false;
      times = [clockMinutes * 60000, clockMinutes * 60000];
      activeSide = 0;
      paintClock();
    }
    listen(app, "submit", event => {
      if (!event.target.matches("[data-demo-form]")) return;
      event.preventDefault();
      feedback(t("בדיקת הממשק הסתיימה. לא נשלחו נתונים ולא נוצר חשבון.", "Interface test complete. No data was sent and no account was created."));
      event.target.reset();
    });
    listen(app, "click", event => {
      const target = event.target.closest("[data-action]");
      if (!target) return;
      const action = target.dataset.action;
      if (action === "first") selectMove(0);
      if (action === "prev") selectMove(moveIndex - 1);
      if (action === "next") {
        selectMove(moveIndex + 1);
        if (moveIndex === sequence.length - 1) feedback(t("זהו המסע האחרון בדוגמה.", "This is the final sample move."));
      }
      if (action === "move") selectMove(Number(target.dataset.index));
      if (action === "summary") showDialog(t("סיכום לדוגמה", "Sample summary"), `<div class="pg-panel"><h3>${t("חמישה חצאי־מסע. בסיס אחד לחקירה.", "Five plies. One starting point for exploration.")}</h3><p>${t("הדוגמה מדגימה פיתוח כלים ושליטה במרכז. אין ציון דיוק או דירוג מהלכים ללא ניתוח אמיתי.", "The sample illustrates development and central control. No accuracy or move-quality scores are shown without real analysis.")}</p></div>`);
      if (action === "opponent") {
        app.querySelectorAll('[data-action="opponent"]').forEach(button => button.setAttribute("aria-pressed", String(button === target)));
        document.getElementById("opponent-name").textContent = target.dataset.name;
      }
      if (action === "bot-start") {
        app.querySelector(".pg-game-preview").hidden = false;
        app.querySelector(".pg-quiet-card").hidden = true;
        selectMove(0);
        const host = app.querySelector(".pg-position .preview-board");
        flipBoard(host, document.getElementById("bot-side").value);
        feedback(t("נפתח מסך המשחק לדוגמה. אין מנוע יריב פעיל.", "Sample game layout opened. No opponent engine is running."));
        window.dispatchEvent(new Event("resize"));
      }
      if (action === "playback") {
        if (playback) { clearInterval(playback); playback = undefined; }
        else {
          if (moveIndex === sequence.length - 1) selectMove(0);
          playback = setInterval(() => {
            selectMove(moveIndex + 1);
            if (moveIndex === sequence.length - 1) {
              clearInterval(playback); playback = undefined;
              target.textContent = t("הפעלה אוטומטית", "Auto-play");
              feedback(t("רצף הדוגמה הסתיים.", "Sample playback finished."));
            }
          }, 1200);
        }
        target.textContent = playback ? t("השהיה", "Pause") : t("הפעלה אוטומטית", "Auto-play");
      }
      if (action === "reveal") {
        const hidden = app.querySelector(".pg-board-wrap").classList.toggle("pieces-hidden");
        target.textContent = hidden ? t("לחשוף כלים", "Reveal pieces") : t("להסתיר כלים", "Hide pieces");
      }
      if (action.startsWith("recall-")) feedback(action === "recall-c6" ? t("נכון. המסע האחרון בדוגמה הוא Nc6.", "Correct. The last sample move is Nc6.") : t("נסה שוב: הפרש יצא מ־b8. אפשר לחשוף את הכלים.", "Try again: the knight left b8. You can reveal the pieces."));
      if (action === "puzzle-mode") {
        app.querySelectorAll('[data-action="puzzle-mode"]').forEach(button => button.setAttribute("aria-pressed", String(button === target)));
        document.getElementById("puzzle-mode-note").textContent = t("מצב תצוגה: ", "Preview mode: ") + target.textContent + ". " + t("אותו תרגיל קבוע; אין התאמה אישית או מרוץ פעיל.", "Same fixed exercise; no personalisation or active rush session.");
      }
      if (action === "answer-correct") {
        solved = true; setPosition("solved");
        feedback(t("נכון — Qxf7#. הרץ ב־c4 מגן על המלכה, והיא תוקפת את המלך ב־e8. למלך אין מסע חוקי, אין חסימה ואין אפשרות ללכוד את המלכה.", "Correct — Qxf7#. The c4 bishop protects the queen, which attacks the king on e8. The king has no legal move, and the check cannot be blocked or the queen captured."));
      }
      if (action === "answer-wrong") feedback(solved ? t("התרגיל כבר נפתר. אפשר לנסות מחדש.", "The exercise is already solved. You can try again.") : t("זה אינו המט במסע אחד. חפש נקודה שהמלכה והרץ יכולים לתקוף יחד.", "That is not mate in one. Look for a square the queen and bishop can attack together."));
      if (action === "hint") feedback(t("הרץ ב־c4 מכוון אל f7. המלכה יכולה להצטרף אליו.", "The bishop on c4 points toward f7. The queen can join it."));
      if (action === "puzzle-reset") { solved = false; setPosition("puzzle"); feedback(t("העמדה אופסה. לבן משחק.", "Position reset. White to move.")); }
      if (action === "opening") {
        app.querySelectorAll('[data-action="opening"]').forEach(button => button.setAttribute("aria-pressed", String(button === target)));
        setPosition(target.dataset.opening);
        const descriptions = {
          italian: ["3. Bc4", "הרץ מתפתח ל־c4 ומכוון לאלכסון f7.", "The bishop develops to c4 and points toward f7."],
          spanish: ["3. Bb5", "הרץ מפעיל לחץ על הפרש ב־c6, שמגן על הרגלי ב־e5.", "The bishop pressures the c6 knight, which protects the e5 pawn."],
          scotch: ["3. d4", "הלבן מציב רגלי נוסף במרכז ותוקף את e5.", "White puts another pawn in the centre and attacks e5."]
        };
        const description = descriptions[target.dataset.opening];
        document.getElementById("opening-move").textContent = description[0];
        document.getElementById("opening-idea").textContent = t(description[1], description[2]);
      }
      if (action === "clock-preset") {
        clockMinutes = Number(target.dataset.minutes);
        app.querySelectorAll('[data-action="clock-preset"]').forEach(button => button.setAttribute("aria-pressed", String(button === target)));
        resetClock(); feedback(t("הקצב הוחל והזמנים אופסו.", "Preset applied and both clocks reset."));
      }
      if (action === "clock-reset") { resetClock(); feedback(t("הזמנים אופסו.", "Clocks reset.")); }
      if (action === "clock-toggle") {
        if (running) { tick(); running = false; clearInterval(clockTimer); }
        else if (times[activeSide] > 0) { running = true; lastTick = performance.now(); clockTimer = setInterval(tick, 100); }
        else feedback(t("יש לאפס לפני תחילת משחק חדש.", "Reset before starting a new game."));
        paintClock();
      }
      if (action === "clock-tap" && running && Number(target.dataset.side) === activeSide) {
        tick();
        if (running) { activeSide = 1 - activeSide; lastTick = performance.now(); paintClock(); }
      }
      if (action === "account-tab") {
        app.querySelectorAll('[data-action="account-tab"]').forEach(button => button.setAttribute("aria-pressed", String(button === target)));
        document.getElementById("account-form").innerHTML = accountForm(target.dataset.tab, t);
        feedback(t("תצוגת חשבון לדוגמה בלבד.", "Sample account interface only."));
      }
      if (action === "account-info") showDialog(t("שליטה בחשבון", "Account control"), `<p>${t("במוצר הפעיל יש לאמת זהות לפני פעולות רגישות. בתצוגה זו אין נתונים למחיקה ושום פעולה אינה נשלחת לשרת.", "The live product must verify identity before sensitive actions. This preview has no data to delete and sends no operations to a server.")}</p>`);
      if (action === "install") showDialog(t("מסלול התקנה — הצעת ממשק", "Installation flow — UI proposal"), `<ol class="pg-list"><li>${t("בדיקת מידע ודרישות בעמוד ההורדה הקיים.", "Read requirements on the existing download page.")}</li><li>${t("בחירת הורדה לפי האפשרויות שמסופקות שם.", "Choose from the available download options.")}</li><li>${t("פתיחה והתחברות לפי ההנחיות הקיימות.", "Launch and sign in following the existing instructions.")}</li></ol><p>${t("לא הורד או הותקן דבר.", "Nothing has been downloaded or installed.")}</p>`);
      if (action === "admin-detail") showDialog(t("בקשת דוגמה", "Sample request"), `<p>${t("כאן יוצגו ההקשר, הרשאות המפעיל והיסטוריית הטיפול. נתונים ופעולות אמיתיים אינם מחוברים לתצוגה.", "This area would show context, operator permissions and history. No real data or operations are connected.")}</p>`);
      if (action.startsWith("copy-")) {
        const field = document.getElementById(`prompt-${action.slice(5)}`);
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(field.value).then(() => feedback(t("הפרומפט הועתק.", "Prompt copied."))).catch(error => {
            console.error("Preview clipboard:", error); field.focus(); field.select();
            feedback(t("הדפדפן חסם העתקה אוטומטית. הטקסט נבחר; אפשר להעתיק עם Ctrl+C.", "Automatic copying was blocked. Text selected; use Ctrl+C."));
          });
        } else {
          field.focus(); field.select();
          feedback(t("העתקה אוטומטית אינה זמינה כאן. הטקסט נבחר; השתמש ב־Ctrl+C.", "Automatic copying is unavailable here. Text selected; use Ctrl+C."));
        }
      }
    });
    const search = document.getElementById("opening-search");
    if (search) listen(search, "input", () => {
      const query = search.value.trim().toLocaleLowerCase();
      let found = 0;
      app.querySelectorAll(".opening-option").forEach(option => {
        option.hidden = !option.textContent.toLocaleLowerCase().includes(query);
        if (!option.hidden) found++;
      });
      document.getElementById("opening-empty").hidden = found > 0;
    });
    const consent = document.getElementById("adaptive-toggle");
    if (consent) listen(consent, "change", () => feedback(consent.checked ? t("מצב מופעל מוצג בלבד. לא נאסף מידע ולא נשמרה הסכמה.", "Enabled state shown only. No data collected or consent stored.") : t("מצב כבוי מוצג בלבד. ההגדרה באתר לא השתנתה.", "Disabled state shown only. The live setting did not change.")));
    if (page === "clock") paintClock();
    return () => { clearInterval(playback); clearInterval(clockTimer); };
  }
  window.VeyraPagePreviews = Object.freeze({ catalog, positions, render, wire });
})();
