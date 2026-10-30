(() => {
  "use strict";
  const page = document.body.dataset.page;
  const app = document.getElementById("app");
  const params = new URLSearchParams(location.search);
  let lang = params.get("lang") === "en" ? "en" : "he";
  const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");
  let manualReduced = false;
  let archiveProvider = "Chess.com";
  let archiveState = "filled";
  let dispose = () => {};
  const t = (he, en) => lang === "he" ? he : en;
  const reduced = () => motionPreference.matches || manualReduced;
  const path = (name) => `${name}.html?lang=${lang}`;
  const boards = new Map();
  const destroyBoards = () => {
    boards.forEach(board => board.destroy());
    boards.clear();
  };
  const icon = (name) => {
    const paths = {
      home: '<path d="m3 10 9-7 9 7v10H3Z"/><path d="M9 20v-7h6v7"/>',
      archive: '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M3 7V3h18v4M9 12h6"/>',
      dna: '<path d="M6 3c0 9 12 9 12 18M18 3c0 9-12 9-12 18M7 5h10M8 9h8M8 15h8M7 19h10"/>',
      board: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>'
    };
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">${paths[name]}</svg>`;
  };
  const initial = {
    a8: "br", b8: "bn", c8: "bb", d8: "bq", e8: "bk", f8: "bb", g8: "bn", h8: "br",
    a7: "bp", b7: "bp", c7: "bp", d7: "bp", e7: "bp", f7: "bp", g7: "bp", h7: "bp",
    a2: "wp", b2: "wp", c2: "wp", d2: "wp", e2: "wp", f2: "wp", g2: "wp", h2: "wp",
    a1: "wr", b1: "wn", c1: "wb", d1: "wq", e1: "wk", f1: "wb", g1: "wn", h1: "wr"
  };
  const move = (position, from, to) => {
    position[to] = position[from];
    delete position[from];
  };
  function positionFor(choice = "base") {
    const position = { ...initial };
    move(position, "e2", "e4");
    move(position, "e7", "e5");
    move(position, "g1", "f3");
    move(position, "b8", "c6");
    if (choice === "played") move(position, "f1", "c4");
    if (choice === "alternative") move(position, "d2", "d4");
    return position;
  }
  function boardMarkup(choice = "base") {
    return `<div class="preview-board" data-position="${choice}"></div>`;
  }
  function fenFor(choice) {
    if (window.VeyraPagePreviews && Object.hasOwn(VeyraPagePreviews.positions, choice)) return VeyraPagePreviews.positions[choice];
    const position = positionFor(choice);
    const ranks = [];
    for (let rank = 8; rank >= 1; rank--) {
      let row = "", empty = 0;
      for (let file = 0; file < 8; file++) {
        const piece = position[String.fromCharCode(97 + file) + rank];
        if (!piece) { empty++; continue; }
        if (empty) { row += empty; empty = 0; }
        row += piece[0] === "w" ? piece[1].toUpperCase() : piece[1];
      }
      if (empty) row += empty;
      ranks.push(row);
    }
    return ranks.join("/");
  }
  function mountBoards() {
    for (const [host, board] of boards) {
      if (!host.isConnected) { board.destroy(); boards.delete(host); }
    }
    document.querySelectorAll(".preview-board").forEach(host => {
      if (boards.has(host)) return;
      const board = VeyraBoard.createBoard(host, {
        position: fenFor(host.dataset.position),
        style: { animationDuration: reduced() ? 0 : 200 }
      });
      board.view.svg.setAttribute("aria-label", t("לוח cm-chessboard עם הכלים הרשמיים", "cm-chessboard with the official standard pieces"));
      if (page === "board") {
        board.enableMoveInput(event => {
          if (event.type === VeyraBoard.INPUT_EVENT_TYPE.moveInputStarted ||
              event.type === VeyraBoard.INPUT_EVENT_TYPE.validateMoveInput) return true;
        });
      }
      boards.set(host, board);
    });
  }
  const framedBoard = (choice = "base") => `<div class="board-frame"><div class="board-meta"><span>${t("שחור", "Black")}</span><span>${t("עמדת הדגמה · לא משחק אישי", "Example position · not a personal game")}</span></div>${boardMarkup(choice)}<div class="board-meta bottom"><span>${t("לבן", "White")}</span><span class="inline-code">1. e4 e5 2. Nf3 Nc6</span></div></div>`;
  function shell(content) {
    return `<a class="skip" href="#main">${t("דלג לתוכן", "Skip to content")}</a>
      <aside class="sidebar" aria-label="${t("ניווט ראשי", "Main navigation")}">
        <a class="brand-mark" href="${path("home")}" aria-label="Veyra Home">v.</a>
        <nav class="side-links">
          <a class="side-link" ${page === "home" ? 'aria-current="page"' : ""} href="${path("home")}">${icon("home")}<span>${t("בית", "Home")}</span></a>
          <a class="side-link" ${page === "archive" ? 'aria-current="page"' : ""} href="${path("archive")}">${icon("archive")}<span>${t("ארכיון", "Archive")}</span></a>
          <a class="side-link" ${page === "review" ? 'aria-current="page"' : ""} href="${path("review")}">${icon("board")}<span>${t("סקירת משחק", "Game review")}</span></a>
          <a class="side-link" ${page === "dna" ? 'aria-current="page"' : ""} href="${path("dna")}">${icon("dna")}<span>Chess DNA</span></a>
          <a class="side-link" ${page === "studio" ? 'aria-current="page"' : ""} href="${path("studio")}">${icon("archive")}<span>${t("כל העמודים", "All pages")}</span></a>
        </nav><span class="side-foot">VEYRA / DESIGN STUDY 01</span>
      </aside>
      <div class="shell">
        <header class="topbar"><a class="brand" href="${path("home")}" dir="ltr">veyra<span>.</span></a>
          <div class="top-actions"><span class="preview-tag">${t("תצוגה מקומית · לא האתר הפעיל", "LOCAL PREVIEW · NOT THE LIVE APP")}</span>
            <button class="motion-toggle" aria-pressed="${reduced()}" type="button">${t("תנועה מופחתת", "Reduce motion")}</button>
            <button class="language" type="button" aria-label="${t("Switch to English", "מעבר לעברית")}">${t("EN", "עברית")}</button>
            <a class="button small" href="${page === "home" ? "#review-demo" : page === "archive" ? "#archive-list" : page === "dna" ? "#findings" : "#main"}">${t("ישר לתוכן", "Skip to content")}</a>
          </div>
        </header>
        <main id="main">${content}</main>
        <footer class="footer"><span>cm-chessboard · MIT</span><span>${t("איורים: Cburnett ו־Rfc1394; התאמה: Stefan Haack. ללא שינוי.", "Artwork: Cburnett & Rfc1394; adapted by Stefan Haack. Unchanged.")} <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener">CC BY-SA 3.0</a> · <a href="https://github.com/shaack/cm-chessboard/blob/2069b9ef3c10f1e2f005dad9eb9a2c35ee60a865/assets/pieces/standard.svg" target="_blank" rel="noopener">${t("מקור", "Source")}</a></span></footer>
      </div>
      <dialog id="detail-dialog" aria-labelledby="dialog-title"><div class="dialog-content"><div class="dialog-top"><h2 id="dialog-title"></h2><button class="close" type="button" aria-label="${t("סגור", "Close")}">×</button></div><div id="dialog-body"></div></div></dialog>`;
  }
  function boardOnly() {
    return `<section class="section"><div class="eyebrow">CM-CHESSBOARD / STANDARD</div><h1 class="section-title">${t("הלוח שבחרת.", "The board you selected.")}</h1><p class="section-intro">${t("ספריית cm-chessboard עצמה, עם סט standard הרשמי. אפשר לגרור כלים, להפוך את הלוח ולאפס את העמדה.", "The actual cm-chessboard library with its official standard set. Drag pieces, flip the board and reset the position.")}</p><div class="board-only">${framedBoard("base")}</div><div class="move-options"><button class="button ghost" data-board-action="flip">${t("הפוך לוח", "Flip board")}</button><button class="button ghost" data-board-action="reset">${t("אפס עמדה", "Reset position")}</button></div><p class="demo-note">${t("זוהי בדיקת תצוגה וגרירה חופשית, ללא אימות חוקי מסעים. באתר נשמרו חיבורי החוקים והמנוע הקיימים.", "This preview allows free piece movement without move validation. The site's existing rules and engine integrations are preserved.")}</p></section>`;
  }
  const partHeading = (number, name) => `<div class="part-heading"><span class="part-number">${number}</span><h2>${name}</h2></div>`;
  function archiveRow(name, result, format, control, opening, choice, saved = false) {
    const resultName = result === "win" ? t("ניצחון", "Win") : result === "loss" ? t("הפסד", "Loss") : t("תיקו", "Draw");
    return `<article class="archive-row"><span class="result-icon ${result}" aria-label="${resultName}">${result === "win" ? "+" : result === "loss" ? "−" : "="}</span><div><h3>${name}<small>${resultName} · ${t("דוגמה", "Demo")}</small></h3><div class="game-meta"><span dir="ltr">${format} · ${control}</span><span>${opening}</span><span>${t("דירוג לא זמין", "Rating unavailable")}</span><span>${saved ? t("דוגמת משחק שמור", "Saved-game example") : t("תצוגת פרטים — לא משחק שיובא", "Layout sample — not an imported game")}</span></div></div><button class="button ghost small" data-archive-game="${choice}">${t("פתיחת לוח לדוגמה", "Open sample board")} <span aria-hidden="true">↗</span></button></article>`;
  }
  function archiveList() {
    if (archiveState === "empty") return `<div class="archive-empty"><h3>${t("עדיין אין משחקים להצגה.", "No games to show yet.")}</h3><p>${t("באתר כאן יופיעו המשחקים אחרי בחירת מקור וטעינה. בתצוגה אפשר לחזור לדוגמאות בכפתור הבא.", "In the site, imported games will appear here. In this preview, use the button below to return to sample content.")}</p><button class="button ghost" data-archive-state="filled">${t("הצג דוגמאות", "Show samples")}</button></div>`;
    if (archiveState === "loading") return `<div class="archive-empty"><h3>${t("כך ייראה מצב טעינה", "Loading-state preview")}</h3><p>${t("טוענים את רשימת המשחקים… זו הדגמה ידנית בלבד: לא מתבצעת בקשה ואין אחוז התקדמות מומצא.", "Loading the game list… This is a manual state preview: no request is running and no progress percentage is fabricated.")}</p><button class="button ghost" data-archive-state="filled">${t("חזרה לדוגמאות", "Back to samples")}</button></div>`;
    if (archiveState === "error") return `<div class="archive-empty archive-error"><h3>${t("לא הצלחנו לטעון את המשחקים.", "We couldn't load the games.")}</h3><p>${t("דוגמה להודעת שגיאה: אפשר לבדוק את שם המשתמש ולנסות שוב. אין כשל אמיתי בתצוגה הזאת.", "Example error message: check the username and try again. No real request failed in this preview.")}</p><button class="button ghost" data-archive-state="filled">${t("נסה שוב — הדגמה", "Retry — demo")}</button></div>`;
    return `<div class="archive-day-label"><span>${t("יום לדוגמה · החדשים ביותר תחילה", "Example day · newest first")}</span><span>1 W / 1 L</span></div>${archiveRow(t("יריב לדוגמה א׳", "Example opponent A"), "win", "Rapid", "10+0", "Italian Game", "played")}${archiveRow(t("יריב לדוגמה ב׳", "Example opponent B"), "loss", "Blitz", "3+2", "Scotch Game", "alternative")}<p class="archive-hint">${t("בשורות נשמר המקום לדירוג היריב, מספר מהלכים, סיבת הסיום ודיוק כשיש ניתוח. בתצוגה אין נתונים אמיתיים ולכן לא המצאנו ציוני מנוע.", "Rows retain space for opponent rating, move count, finish reason and accuracy when available. No engine scores are fabricated in this preview.")}</p>`;
  }
  function archive() {
    const parts = [[1, "archive-intro", t("פתיחה", "Introduction")], [2, "archive-import", t("בחירת מקור", "Game source")], [3, "archive-list", t("רשימת משחקים", "Game list")], [4, "archive-sample", t("משחק לדוגמה", "Sample game")], [5, "archive-saved", t("משחקים שמורים", "Saved games")]];
    return `<div class="archive-layout">
      <aside class="review-guide"><strong>${t("עמוד הארכיון · 5 חלקים לבדיקה", "Archive page · 5 sections to review")}</strong><p>${t("אפשר לומר למשל: ״חלק 2 לשמור, חלק 3 לשנות״. המספרים הם כלי לבדיקה, לא רכיב סופי באתר. כל המשחקים כאן הם דוגמאות; אין חיבור לחשבון.", "For example: “keep section 2, change section 3.” Numbers are review aids, not final product UI. All games are samples; no account is connected.")}</p><nav aria-label="${t("חלקי העמוד לבדיקה", "Sections to review")}">${parts.map(([n, id, label]) => `<a href="#${id}">${n.toString().padStart(2, "0")} · ${label}</a>`).join("")}</nav></aside>
      <section class="archive-intro" id="archive-intro"><div class="eyebrow"><span class="part-number">01</span> YOUR GAME ARCHIVE</div><h1>${t("המשחקים שלך.<br><span>בלי רעש.</span>", "Your games.<br><span>Nothing in the way.</span>")}</h1><p>${t("בוחרים משחק. פותחים את הלוח. מתחילים להבין. כל המשחקים שלך מ־Chess.com ומ־Lichess, באותו מקום.", "Pick a game. Open the board. Start exploring. Your Chess.com and Lichess games, together in one place.")}</p></section>
      <section class="archive-part" id="archive-import">${partHeading("02", t("מאיפה להביא את המשחקים?", "Where do your games come from?"))}<div class="archive-surface"><div class="provider-controls" role="group" aria-label="${t("מקור המשחקים", "Game source")}">${["Chess.com", "Lichess"].map(provider => `<button class="provider-button" data-provider="${provider}" aria-pressed="${provider === archiveProvider}">${provider}</button>`).join("")}</div><form class="archive-import"><label for="demo-username">${t("שם משתמש לדוגמה בלבד", "Example username only")}<input id="demo-username" name="username" value="demo_player" autocomplete="off" maxlength="100" required></label><button class="button accent" type="submit">${t("הדגמת טעינת משחקים", "Preview loading games")}</button></form><p class="archive-hint" id="provider-note">${t("נבחר מקור:", "Selected source:")} <bdi>${archiveProvider}</bdi> · ${t("באתר הפעולה טוענת עד 100 משחקים. כאן נטענות דוגמאות בלבד; שום מידע לא נשלח.", "The site loads up to 100 games. Here, only samples are displayed; no information is sent.")}</p></div></section>
      <section class="archive-part" id="archive-list">${partHeading("03", t("איזה משחק פותחים?", "Which game shall we open?"))}<div class="state-picker" role="group" aria-label="${t("מצבים לבדיקה", "States to review")}"><span>${t("בדיקת מצבי העמוד:", "Preview page states:")}</span>${[["filled",t("עם משחקים","With games")],["empty",t("ריק","Empty")],["loading",t("טעינה","Loading")],["error",t("שגיאה","Error")]].map(([key,label])=>`<button data-archive-state="${key}" aria-pressed="${archiveState === key}">${label}</button>`).join("")}</div><div id="archive-results" aria-live="polite">${archiveList()}</div></section>
      <section class="archive-part" id="archive-sample">${partHeading("04", t("לנסות גם בלי לחבר חשבון", "Try it without connecting an account"))}${archiveRow(t("עמדת פתיחה לדוגמה", "Sample opening position"), "draw", "Demo", "—", t("בדיקת תצוגת הלוח", "Board display check"), "base")}<p class="archive-hint">${t("זהו החלק הקיים שמאפשר להכיר את הלוח לפני טעינת משחקים אישיים.", "This existing section lets a visitor explore the board before importing personal games.")}</p></section>
      <section class="archive-part" id="archive-saved">${partHeading("05", t("לחזור למה שכבר שמרת", "Return to what you saved"))}${archiveRow(t("משחק שמור לדוגמה", "Example saved game"), "draw", "Rapid", "10+0", "Italian Game", "played", true)}<p class="archive-hint">${t("אין שמירה אמיתית באב־הטיפוס. באתר החלק הזה מציג את המשחקים השמורים בחשבון.", "Nothing is saved by this prototype. In the site, this section lists the account's saved games.")}</p></section>
    </div>`;
  }
  function home() {
    return `<section class="hero">
      <div class="eyebrow">YOUR GAME. YOUR NEXT MOVE.</div>
      <h1>${t("לא רק לדעת שטעית.", "More than a mistake.")}<br><span>${t("למצוא את הצעד הבא.", "Find your next move.")}</span></h1>
      <p class="lead">${t("המשחקים שלך. האפשרויות שלא ניסית. והתמונה שמתחילה להתבהר. מרחב אחד לניתוח, חקירה ואימון — בחינם.", "Your games. The moves you haven't explored. A clearer picture of your chess. One place to review, explore and train — for free.")}</p>
      <div class="hero-buttons"><a class="button accent" href="#review-demo">${t("לראות את הרעיון בפעולה", "Explore the concept")} <span aria-hidden="true">↗</span></a><a class="button ghost" href="${path("dna")}">${t("לגלות את Chess DNA", "Discover Chess DNA")}</a></div>
      <div class="hero-art" aria-hidden="true"><div class="hero-board">${boardMarkup("played")}</div><span class="art-note">${t("אותו לוח. נקודת מבט חדשה.", "The same board. A new perspective.")}</span></div>
      <a class="scroll-cue" href="#why">${t("גוללים כדי לראות מעבר לציון", "Scroll beyond the score")} <span aria-hidden="true">↓</span></a>
      <p class="demo-note">${t("אב־טיפוס עיצובי: החוויה משלבת יכולות קיימות והצעות לפיתוח.", "Design prototype: existing features and proposed capabilities are shown together.")}</p>
    </section>
    <section class="section" id="why"><div class="eyebrow">BEYOND THE SCORE</div>
      <h2 class="section-title">${t("המשחק נגמר.<br>החקירה רק מתחילה.", "The game ends.<br>The exploration begins.")}</h2>
      <p class="section-intro">${t("ציון יכול לסכם משחק. אנחנו רוצים לתת לך מרחב לבדוק אותו — בקצב שלך, עם השאלות שלך.", "A score can summarise a game. We want to give you room to explore it — at your pace, with your own questions.")}</p>
      <div class="principles">
        <article class="principle"><span class="index">01 / BRING YOUR GAME</span><h3>${t("המשחקים שלך, במקום אחד", "Bring your own games")}</h3><p>${t("ייבוא מ־Chess.com, מ־Lichess או מ־PGN. נקודת ההתחלה היא השחמט שכבר שיחקת.", "Import from Chess.com, Lichess or PGN. Start with the chess you already play.")}</p></article>
        <article class="principle"><span class="index">02 / ASK WHAT IF</span><h3>${t("לא לעצור ב״מהלך שגוי״", "Don't stop at “mistake”")}</h3><p>${t("הכיוון שאנחנו מתכננים: לנסות חלופות, לבחור עומק הסבר ולבדוק מה עומד מאחורי ההמלצה.", "Our proposed direction: try alternatives, choose explanation depth and explore the reasoning behind a recommendation.")}</p></article>
        <article class="principle"><span class="index">03 / SEE YOUR PATTERNS</span><h3>${t("לראות מעבר למשחק אחד", "Look beyond one game")}</h3><p>${t("Chess DNA מרכז מדדים ממשחקים שונים. החזון: לחבר את הממצאים לצעד מעשי באימון.", "Chess DNA brings together metrics from multiple games. The vision: connect those findings to a practical training step.")}</p></article>
      </div>
    </section>
    <section class="section" id="review-demo"><div class="eyebrow">INTERACTIVE DESIGN SAMPLE</div>
      <h2 class="section-title">${t("אותה עמדה.<br>שאלה אחרת.", "Same position.<br>A different question.")}</h2>
      <p class="section-intro">${t("הלוח וכלי השחמט נשארים מוכרים. סביבם נבנה מקום נקי להסתכל, להשוות ולהבין.", "Keep the familiar board and pieces. Build a focused space around them to look, compare and understand.")}</p>
      <div class="review-demo"><div id="demo-board">${framedBoard("played")}</div><div>
        <div class="eyebrow">${t("אתה בוחר מה לבדוק", "YOU CHOOSE WHAT TO EXPLORE")}</div>
        <div class="move-options"><button class="move-option" data-move="played" aria-pressed="true">${t("המהלך ששוחק", "Played move")} · Bc4</button><button class="move-option" data-move="alternative" aria-pressed="false">${t("אפשרות אחרת", "An alternative")} · d4</button></div>
        <div class="move-copy" aria-live="polite"></div>
        <p class="demo-note">${t("עמדה קבועה להמחשת הממשק. אין כאן ניתוח מנוע, דירוג איכות או טענה שחלופה אחת עדיפה.", "A fixed position to demonstrate the interface. No engine analysis, quality rating or claim that one move is better.")}</p>
      </div></div>
    </section>
    <section class="section destination"><div><div class="eyebrow">CHESS DNA</div><h2 class="section-title">${t("לא עוד טבלה.<br>הסיפור של המשחק שלך.", "Not another table.<br>The story of your chess.")}</h2><p class="section-intro">${t("חוזקה אחת. קושי אחד. צעד להמשך. דוח שנחשף בגלילה, עם אפשרות להתעכב על מה שמעניין אותך.", "One strength. One challenge. One next step. A report revealed as you scroll, with room to explore what matters to you.")}</p><a class="button accent" href="${path("dna")}">${t("פתיחת תצוגת DNA", "Open the DNA preview")} <span aria-hidden="true">↗</span></a><div class="tool-list"><span>${t("ניתוח", "Review")}</span><span>${t("בוטים ואגדות", "Bots & legends")}</span><span>${t("פאזלים", "Puzzles")}</span><span>${t("פתיחות", "Openings")}</span></div></div><div class="destination-art"><img class="home-coach" src="../public/coach-avatar.webp" alt="${t("מאמן Veyra — האיור הקיים", "Veyra coach — existing artwork")}"></div></section>`;
  }
  function stories() {
    return [
      {
        name: t("חוזקה", "Strength"),
        title: t("יש לך בסיס<br>לבנות עליו.", "A foundation<br>to build on."),
        body: t("בדוח ההדגמה, הדיוק הממוצע ב־Rapid גבוה מזה שבמקצבים המהירים. זו השוואה במדגם — לא אבחון אישיות ולא הסבר לסיבה.", "In this sample report, average Rapid accuracy is higher than in faster formats. This is a sample comparison — not a personality profile or a causal explanation."),
        detail: t("דיוק בהשוואה בין מקצבי זמן", "Accuracy across time controls"),
        explanation: t("72.4 ב־Rapid, לעומת 65.1 ב־Blitz ו־59.8 ב־Bullet. המספרים כאן נבחרו להדגמת העיצוב בלבד. בדוח אישי יוצגו המדגם, המשחקים והמדדים שחושבו בפועל.", "72.4 in Rapid, versus 65.1 in Blitz and 59.8 in Bullet. These numbers were chosen only for this design demonstration. A personal report would show the actual sample, games and calculated metrics.")
      },
      {
        name: t("קושי", "Challenge"),
        title: t("המספר הוא התחלה.<br>לא סוף ההסבר.", "The number starts<br>the conversation."),
        body: t("ב־Blitz בדוח לדוגמה מופיעות 4.2 טעויות גסות לכל 100 מהלכים. מכאן אפשר לתכנן מעבר למשחקים עצמם ולבדוק מה קרה.", "The sample Blitz report shows 4.2 blunders per 100 moves. From here, the proposed next step is to open the underlying games and investigate."),
        detail: t("ממדד כללי למהלך שאפשר לחקור", "From a metric to a move you can explore"),
        explanation: t("שיעור טעויות מתאר מה סיווג המנוע. הוא לא אומר לבדו אם הסיבה היא לחץ זמן, חוסר ריכוז או החמצה טקטית. החוויה המתוכננת תאפשר לפתוח את המהלכים שהובילו למדד.", "A blunder rate describes engine classifications. It does not by itself establish time pressure, loss of focus or a tactical oversight as the cause. The proposed experience would let you open the moves behind the metric.")
      },
      {
        name: t("צעד להמשך", "Next step"),
        title: t("משהו להבין.<br>משהו לנסות.", "Something to learn.<br>Something to try."),
        body: t("מהממצא אל פעולה: לקרוא הסבר, לחזור לעמדה או לפתוח תרגול. ההמלצות והחיבור לתרגול הם יכולת מתוכננת, לא תוצאת הדוח הנוכחי.", "Turn a finding into an action: read an explanation, revisit a position or open a drill. Recommendations and linked training are planned features, not current report output."),
        detail: t("לבחור את הצעד הבא שלך", "Choose your next step"),
        explanation: t("ההצעה היא לתת לך בחירה, לא להכריח מסלול: הסבר קצר כדי להתמצא, מהלכים כדי לחקור, ותרגול כדי לנסות בעצמך. איכות ההמלצה תצטרך להיבדק מול נתוני המשחק האמיתיים.", "The proposal gives you options rather than a forced path: a short explanation for context, moves to investigate, and training to try for yourself. Recommendation quality would need validation against actual game data.")
      }
    ];
  }
  function dna() {
    const s = stories();
    return `<section class="dna-header"><div class="dna-hero-copy"><div class="eyebrow">CHESS DNA / PERSONAL REPORT</div><h1>${t("השחמט שלך.<br><span>מקרוב.</span>", "Your chess.<br><span>Up close.</span>")}</h1><p>${t("חוזקה, קושי וצעד להמשך. לא תווית על מי שאתה — נקודת פתיחה לחקירה שלך.", "A strength, a challenge, a next step. Not a label for who you are — a starting point for your own exploration.")}</p><button class="button ghost" data-create>${t("איך ייראה יצירת דוח אישי?", "Preview personal report setup")}</button></div><figure class="dna-coach-stage"><img src="../public/coach-avatar.webp" alt="${t("מאמן Veyra — האיור הקיים", "Veyra coach — existing artwork")}"><figcaption>${t("מקום למאמן האינטראקטיבי. זהו האיור הקיים בלבד; הבעות ותגובות עדיין אינן מחוברות.", "Space for the interactive coach. Existing artwork only; expressions and reactions are not connected yet.")}</figcaption></figure></section>
      <aside class="sample-banner"><p><strong>${t("דוח לדוגמה בלבד.", "EXAMPLE REPORT ONLY.")}</strong> ${t("כל המספרים והעמדות בתצוגה זו הם נתוני הדגמה קבועים. לא נטענו משחקים שלך ולא בוצע ניתוח.", "All numbers and positions in this preview are fixed demo content. None of your games have been loaded or analysed.")}</p><span class="index">DEMO / 75 GAMES</span></aside>
      <div class="report-toc"><span class="toc-label">${t("גישה מהירה · בלי לחכות לאנימציה", "QUICK ACCESS · NO ANIMATION REQUIRED")}</span><nav aria-label="${t("פרקי הדוח", "Report chapters")}">${s.map((item, i) => `<a href="#chapter-${i}" data-chapter="${i}" ${i === 0 ? 'aria-current="step"' : ""}>0${i + 1} ${item.name}</a>`).join("")}<a href="#findings">${t("כל הנתונים", "All data")}</a></nav></div>
      <section class="story-track" aria-label="${t("סיפור הדוח", "Report story")}"><div class="story-sticky">
        <div class="story-copy"><div class="story-counter"><span class="index" id="chapter-number">01 / 03</span><span class="counter-line"></span><span class="eyebrow" id="chapter-name">${s[0].name}</span></div><h2 id="chapter-title">${s[0].title}</h2><p id="chapter-copy">${s[0].body}</p><button class="button ghost" id="story-detail">${t("להבין · לחקור · לתרגל", "Understand · explore · practise")}</button><div class="story-status">${t("גלול להמשך · הנתונים לא משתנים עם הגלילה", "Scroll to continue · scrolling does not change the data")}</div></div>
        <div class="flow-scene">
          <svg class="flow-lines" aria-hidden="true"><path class="flow-line"/><path class="flow-bright"/></svg>
          <article class="glass active" data-card="0"><div class="glass-label"><span>${t("חוזקה יחסית · Rapid", "RELATIVE STRENGTH · RAPID")}</span><span>01</span></div><div class="glass-value"><bdi>72.4</bdi> <small>${t("דיוק ממוצע", "average accuracy")}</small></div><div class="glass-meter"><span style="--fill:72.4%"></span></div></article>
          <article class="glass future" data-card="1"><div class="glass-label"><span>${t("נקודה לבדיקה · Blitz", "WORTH EXPLORING · BLITZ")}</span><span>02</span></div><div class="glass-value"><bdi>4.2</bdi> <small>${t("טעויות גסות / 100 מהלכים", "blunders / 100 moves")}</small></div><div class="glass-meter"><span style="--fill:42%"></span></div></article>
          <article class="glass future" data-card="2"><div class="glass-label"><span>${t("הצעה לחוויה עתידית", "PROPOSED EXPERIENCE")}</span><span>03</span></div><div class="glass-title">${t("מהממצא אל הלוח", "From the finding to the board")}</div><div class="glass-meter"><span style="--fill:100%"></span></div></article>
          <img class="story-coach" src="../public/coach-avatar.webp" alt="" aria-hidden="true">
        </div>
      </div></section>
      <section class="section data-section" id="findings"><div class="eyebrow">THE DATA BEHIND THE STORY / DEMO</div><h2 class="section-title">${t("הסיפור פתוח.<br>גם הנתונים.", "An open story.<br>Open data, too.")}</h2><p class="section-intro">${t("בלי להסתיר את המדגם מאחורי האפקט. במוצר האישי, כל מסקנה צריכה להוביל לנתונים שתומכים בה.", "No hiding the sample behind the effects. In the personal experience, each conclusion should lead back to the evidence.")}</p>
        <div class="report-metrics"><div class="metric"><h3>${t("משחקים בדוגמה", "Games in this example")}</h3><span class="number">75</span><small>${t("25 בכל סוג זמן", "25 per time control")}</small></div><div class="metric"><h3>${t("המדד הגבוה במדגם", "Highest accuracy in the sample")}</h3><span class="number">72.4</span><small>Rapid</small></div><div class="metric"><h3>${t("נתוני שעון", "Clock data")}</h3><span class="number">—</span><small>${t("לא כלולים בדוגמה", "Not included in this example")}</small></div></div>
        <table class="report-table"><caption class="demo-note">${t("נתונים מומצאים לצורך עיצוב בלבד; אינם דירוג רשמי.", "Fictional design sample data; not an official rating.")}</caption><thead><tr><th scope="col">${t("סוג זמן", "Format")}</th><th scope="col">${t("משחקים", "Games")}</th><th scope="col">${t("דיוק ממוצע", "Avg. accuracy")}</th><th scope="col">${t("טעויות גסות / 100", "Blunders / 100")}</th></tr></thead><tbody><tr><td>Bullet</td><td>25</td><td>59.8</td><td>6.3</td></tr><tr><td>Blitz</td><td>25</td><td>65.1</td><td>4.2</td></tr><tr><td>Rapid</td><td>25</td><td>72.4</td><td>2.1</td></tr></tbody></table>
        <div class="finding-grid">${s.map((item, i) => `<article class="finding" id="chapter-${i}"><span class="index">0${i + 1} / ${item.name}</span><h3>${item.title.replace("<br>", " ")}</h3><p>${item.body}</p><button class="button ghost" data-detail="${i}">${t("פתיחת פירוט", "Explore finding")}</button></article>`).join("")}</div>
        <p class="scope-note">${t("גבולות ההדגמה: השוואת מדדים קיימת בקוד. הפקת חוזקות וקושי, קישור למהלכים תומכים והמלצות לתרגול דורשים פיתוח ואימות נוספים. מדגם קטן או מידע חסר יוצגו במפורש — לא יושלמו בהשערות.", "Prototype boundaries: metric aggregation exists in the code. Deriving strengths and challenges, linking supporting moves and recommending drills require further implementation and validation. Small samples and missing information must be shown explicitly, not filled in with guesses.")}</p>
      </section>`;
  }
  function showDialog(title, body) {
    const dialog = document.getElementById("detail-dialog");
    document.getElementById("dialog-title").textContent = title;
    document.getElementById("dialog-body").innerHTML = body;
    if (!dialog.open) dialog.showModal();
    mountBoards();
  }
  function detail(index, tab = "explain") {
    const story = stories()[index];
    const tabs = `<div class="detail-tabs" role="group" aria-label="${t("סוג פירוט", "Detail type")}">${[
      ["explain", t("הסבר", "Explanation")], ["moves", t("מהלכים לדוגמה", "Example moves")], ["train", t("תרגול", "Practice")]
    ].map(([key, label]) => `<button class="detail-tab" data-detail-tab="${key}" data-index="${index}" aria-pressed="${tab === key}">${label}</button>`).join("")}</div>`;
    let content;
    if (tab === "explain") {
      content = `<h3>${story.name}</h3><p>${story.explanation}</p>`;
    } else if (tab === "moves") {
      content = `<span class="planned">${t("תצוגת עיצוב — לא ראיה לממצא", "DESIGN SAMPLE — NOT EVIDENCE FOR THIS FINDING")}</span><p>${t("כאן יופיעו בעתיד המשחקים והמהלכים שעליהם נשען הממצא. כרגע מוצגת אותה עמדת פתיחה להמחשת הגודל והפריסה בלבד.", "The games and moves supporting the finding would appear here. For now, the same opening position is shown only to demonstrate size and layout.")}</p>${framedBoard("base")}`;
    } else {
      content = `<span class="planned">${t("יכולת מתוכננת · לא תרגול אישי", "PLANNED FEATURE · NOT PERSONALISED TRAINING")}</span><p>${t("שאלת היכרות לדוגמה: אחרי 1. e4 e5 2. Nf3 Nc6, מה עושה המהלך Bc4?", "Sample introductory question: after 1. e4 e5 2. Nf3 Nc6, what does Bc4 do?")}</p><button class="training-choice" data-answer="develop">${t("מפתח רץ אל אלכסון שמכוון ל־f7", "Develops a bishop onto a diagonal towards f7")}</button><button class="training-choice" data-answer="castle">${t("מבצע הצרחה", "Castles the king")}</button><p class="training-feedback" aria-live="polite" hidden></p>`;
    }
    showDialog(story.detail, `${tabs}<div class="detail-body">${content}<p class="demo-note">${t("כל התוכן בחלון זה הוא חלק מאב־טיפוס מקומי.", "Everything in this dialog is part of a local design prototype.")}</p></div>`);
  }
  function creationPreview() {
    showDialog(t("הדוח האישי — הצעת מסלול", "Personal report — proposed flow"), `<div class="detail-body"><span class="planned">${t("תצוגה בלבד · ללא חיבור לחשבון", "PREVIEW ONLY · NO ACCOUNT CONNECTION")}</span><p>${t("באתר הפעיל יצירת הדוח מתחילה בחשבון מחובר ובבחירת מקור משחקים. כאן לא נבקש סיסמה, שם משתמש או נתונים אישיים.", "In the live app, creating a report starts with signing in and selecting a game source. This preview does not request passwords, usernames or personal data.")}</p><div class="empty-design"><h3>${t("01 · בחירת מקור משחקים", "01 · Choose your game source")}</h3><p>Chess.com / Lichess</p><h3>${t("02 · ניתוח והצגת התקדמות אמיתית", "02 · Analyse with real progress")}</h3><p>${t("לא נציג ספירה מונפשת כאילו היא מספר המשחקים שכבר נותחו.", "An animated counter must not pretend to be completed analysis.")}</p><h3>${t("03 · הדוח שלך", "03 · Your report")}</h3><p>${t("אם חסרים משחקים, נתוני שעון או אישור שמירה — נסביר בדיוק מה חסר.", "Missing games, clock data or a save confirmation will be stated explicitly.")}</p></div></div>`);
  }

  function wire() {
    const controller = new AbortController();
    const listen = (element, event, fn) => element.addEventListener(event, fn, { signal: controller.signal });
    let frame = 0;
    let active = 0;
    let staticChapter = 0;
    const storyCoach = document.querySelector(".story-coach");
    const dialog = document.getElementById("detail-dialog");
    listen(dialog.querySelector(".close"), "click", () => dialog.close());
    listen(dialog, "click", event => { if (event.target === dialog) dialog.close(); });
    listen(document.querySelector(".language"), "click", () => {
      const scroll = scrollY;
      lang = lang === "he" ? "en" : "he";
      render();
      scrollTo(0, scroll);
    });
    listen(document.querySelector(".motion-toggle"), "click", () => {
      if (motionPreference.matches) {
        showDialog(t("תנועה מופחתת מופעלת", "Reduced motion is enabled"), `<p>${t("הגדרת הנגישות של המכשיר שלך נשמרת. אפשר לשנות אותה בהגדרות המכשיר.", "Your device accessibility preference is respected. You can change it in your device settings.")}</p>`);
        return;
      }
      manualReduced = !manualReduced;
      document.documentElement.dataset.reduced = String(reduced());
      document.querySelector(".motion-toggle").setAttribute("aria-pressed", String(reduced()));
      requestDraw();
    });
    function setArchiveState(state) {
      archiveState = state;
      document.querySelectorAll(".state-picker [data-archive-state]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.archiveState === state)));
      document.getElementById("archive-results").innerHTML = archiveList();
    }
    if (page === "archive") {
      listen(document.querySelector(".archive-import"), "submit", event => {
        event.preventDefault();
        setArchiveState("filled");
      });
    }
    listen(app, "click", event => {
      const target = event.target.closest("button");
      if (!target) return;
      if (target.hasAttribute("data-provider")) {
        archiveProvider = target.dataset.provider;
        document.querySelectorAll("[data-provider]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.provider === archiveProvider)));
        document.getElementById("provider-note").innerHTML = `${t("נבחר מקור:", "Selected source:")} <bdi>${archiveProvider}</bdi> · ${t("הדגמה בלבד — לא מתבצעת התחברות.", "Preview only — no connection is made.")}`;
        setArchiveState("empty");
      }
      if (target.hasAttribute("data-archive-state")) setArchiveState(target.dataset.archiveState);
      if (target.hasAttribute("data-archive-game")) {
        showDialog(t("לוח לדוגמה — שטוח וברור", "Sample board — flat and clear"), `<div class="detail-body"><p>${t("העמדה נועדה לבדיקת העיצוב בלבד. היא אינה משחק שיובא מחשבון או ניתוח מנוע.", "This position is only for visual review. It is not an imported game or an engine analysis.")}</p>${framedBoard(target.dataset.archiveGame)}</div>`);
      }
      if (target.hasAttribute("data-board-action")) {
        const board = boards.get(document.querySelector(".board-only .preview-board"));
        const action = target.dataset.boardAction === "flip"
          ? board.setOrientation(board.getOrientation() === VeyraBoard.COLOR.white ? VeyraBoard.COLOR.black : VeyraBoard.COLOR.white, !reduced())
          : board.setPosition(fenFor("base"), !reduced());
        action.catch(error => {
          console.error(error);
          showDialog(t("פעולת הלוח נכשלה", "Board action failed"), `<p>${t("נסה לאפס את העמוד.", "Try reloading the page.")}</p>`);
        });
      }
      if (target.hasAttribute("data-detail")) detail(Number(target.dataset.detail));
      if (target.hasAttribute("data-detail-tab")) {
        detail(Number(target.dataset.index), target.dataset.detailTab);
        document.querySelector(`[data-detail-tab="${target.dataset.detailTab}"]`).focus();
      }
      if (target.hasAttribute("data-create")) creationPreview();
      if (target.hasAttribute("data-answer")) {
        const feedback = document.querySelector(".training-feedback");
        feedback.hidden = false;
        feedback.textContent = target.dataset.answer === "develop"
          ? t("נכון. הרץ יוצא מ־f1 ל־c4 ומכוון לאורך האלכסון אל f7. זו דוגמה כללית, לא תרגול שנבחר לפי הדוח שלך.", "Correct. The bishop moves from f1 to c4 and points along the diagonal towards f7. This is a generic example, not a drill selected from your report.")
          : t("לא כאן. Bc4 הוא מסע של הרץ; הצרחה מסומנת O-O או O-O-O. אפשר לנסות שוב.", "Not here. Bc4 is a bishop move; castling is written O-O or O-O-O. Try again.");
      }
    });
    if (page === "home") {
      function selectMove(choice) {
        document.querySelectorAll("[data-move]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.move === choice)));
        document.getElementById("demo-board").innerHTML = framedBoard(choice);
        mountBoards();
        document.querySelector(".move-copy").innerHTML = choice === "played"
          ? `<h3>${t("מוציאים את הרץ למשחק.", "Bring the bishop into play.")}</h3><p>${t("המסע Bc4 מפתח את הרץ לאלכסון שמכוון ל־f7. בחר באפשרות האחרת כדי לראות שינוי בעמדה.", "Bc4 develops the bishop onto a diagonal towards f7. Select the alternative to see the position change.")}</p>`
          : `<h3>${t("בודקים את המרכז.", "Explore the centre.")}</h3><p>${t("המסע d4 מציב רגלי במרכז ותוקף את e5. זוהי אפשרות חוקית לבדיקה, לא המלצת מנוע.", "d4 puts a pawn in the centre and attacks e5. This is a legal option to explore, not an engine recommendation.")}</p>`;
      }
      document.querySelectorAll("[data-move]").forEach(button => listen(button, "click", () => selectMove(button.dataset.move)));
      selectMove("played");
    }
    function updateChapter(index) {
      if (index === active && document.getElementById("chapter-title").dataset.ready) return;
      active = index;
      const story = stories()[index];
      document.getElementById("chapter-number").textContent = `0${index + 1} / 03`;
      document.getElementById("chapter-name").textContent = story.name;
      const title = document.getElementById("chapter-title");
      title.innerHTML = story.title; title.dataset.ready = "true";
      document.getElementById("chapter-copy").textContent = story.body;
      document.querySelectorAll("[data-chapter]").forEach(link => {
        if (Number(link.dataset.chapter) === index) link.setAttribute("aria-current", "step");
        else link.removeAttribute("aria-current");
      });
    }
    function draw() {
      frame = 0;
      const heroBoard = document.querySelector(".hero-board");
      if (heroBoard && !reduced()) {
        const progress = Math.min(1, Math.max(0, scrollY / 650));
        heroBoard.style.rotate = `${progress * 9}deg`;
      } else if (heroBoard) heroBoard.style.rotate = "0deg";
      if (!storyCoach) return;
      const track = document.querySelector(".story-track");
      const scene = document.querySelector(".flow-scene");
      const compact = matchMedia("(max-width: 720px), (max-height: 780px)").matches;
      const sticky = document.querySelector(".story-sticky");
      const rect = track.getBoundingClientRect();
      const travel = Math.max(1, track.offsetHeight - sticky.offsetHeight);
      let progress = Math.min(1, Math.max(0, (145 - rect.top) / travel));
      if (compact) progress = Math.min(1, Math.max(0, (.5 * innerHeight - scene.getBoundingClientRect().top) / (scene.clientHeight * .8)));
      if (reduced()) progress = staticChapter / 2;
      const chapter = Math.min(2, Math.floor(progress * 2 + .45));
      updateChapter(chapter);
      const cards = [...scene.querySelectorAll(".glass")];
      const seats = cards.map(card => ({ x: card.offsetLeft + card.offsetWidth * .75, y: card.offsetTop - 39 }));
      const phase = progress * 2;
      const start = Math.min(1, Math.floor(phase));
      const raw = phase - start;
      const u = Math.min(1, Math.max(0, (raw - .2) / .64));
      const ease = u * u * (3 - 2 * u);
      const from = seats[start], to = seats[start + 1];
      const jump = reduced() ? 0 : Math.sin(Math.PI * u) * 62;
      const seat = reduced() ? seats[staticChapter] : { x: from.x + (to.x - from.x) * ease, y: from.y + (to.y - from.y) * ease - jump };
      const bounce = reduced() ? 0 : Math.max(0, 1 - Math.abs(raw - .88) / .1) * 5;
      cards.forEach((card, i) => {
        card.classList.toggle("active", i === chapter);
        card.classList.toggle("past", i < chapter);
        card.classList.toggle("future", i > chapter);
        card.style.transform = i === start + 1 ? `translateY(${bounce}px)` : "";
      });
      storyCoach.style.transform = `translate(${seat.x - 46}px, ${seat.y - 46}px)`;
      const points = cards.map(card => [card.offsetLeft + card.offsetWidth * .5, card.offsetTop + card.offsetHeight * .5]);
      const line = `M${points[0][0]},${points[0][1]} C${points[0][0]},${points[1][1]} ${points[1][0]},${points[0][1]} ${points[1][0]},${points[1][1]} S${points[2][0]},${points[1][1]} ${points[2][0]},${points[2][1]}`;
      scene.querySelectorAll("path").forEach(path => path.setAttribute("d", line));
      const bright = scene.querySelector(".flow-bright");
      const length = bright.getTotalLength();
      bright.style.strokeDasharray = String(length);
      bright.style.strokeDashoffset = String(length * (1 - progress));
    }
    function requestDraw() { if (!frame) frame = requestAnimationFrame(draw); }
    if (page === "dna") {
      listen(document.getElementById("story-detail"), "click", () => detail(active));
      document.querySelectorAll("[data-chapter]").forEach(link => listen(link, "click", event => {
        event.preventDefault();
        staticChapter = Number(link.dataset.chapter);
        const track = document.querySelector(".story-track");
        if (reduced() || matchMedia("(max-width: 720px), (max-height: 780px)").matches) {
          updateChapter(staticChapter);
          document.getElementById(`chapter-${staticChapter}`).scrollIntoView({ behavior: "instant", block: "center" });
        } else {
          const sticky = document.querySelector(".story-sticky");
          const top = scrollY + track.getBoundingClientRect().top - 145 + (track.offsetHeight - sticky.offsetHeight) * staticChapter / 2;
          scrollTo({ top, behavior: "instant" });
        }
        requestDraw();
      }));
    }
    mountBoards();
    const updateBoard = (host, action) => {
      const board = boards.get(host);
      if (!board) throw new Error("Preview board is not mounted");
      action(board).catch(error => {
        console.error("Page preview board:", error);
        showDialog(t("פעולת הלוח נכשלה", "Board action failed"), `<p>${t("נסה לטעון מחדש את התצוגה.", "Try reloading the preview.")}</p>`);
      });
    };
    const pageCleanup = window.VeyraPagePreviews ? VeyraPagePreviews.wire(page, {
      app, t, listen, showDialog, mountBoards, boardMarkup,
      setBoardPosition: (host, choice) => updateBoard(host, board => board.setPosition(fenFor(choice), false)),
      flipBoard: (host, side) => updateBoard(host, board => board.setOrientation(side === "black" ? VeyraBoard.COLOR.black : VeyraBoard.COLOR.white, false))
    }) : () => {};
    listen(window, "scroll", requestDraw);
    listen(window, "resize", requestDraw);
    requestDraw();
    dispose = () => { controller.abort(); cancelAnimationFrame(frame); pageCleanup(); destroyBoards(); };
  }
  function render() {
    dispose();
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "he" ? "rtl" : "ltr";
    document.documentElement.dataset.reduced = String(reduced());
    const extended = !["home", "archive", "board", "dna"].includes(page);
    if (extended && (!window.VeyraPagePreviews || (page !== "studio" && !VeyraPagePreviews.catalog.some(item => item[0] === page)))) throw new Error("Unknown or unavailable preview page: " + page);
    const meta = window.VeyraPagePreviews && VeyraPagePreviews.catalog.find(item => item[0] === page);
    document.title = `Veyra | ${extended ? page === "studio" ? t("כל תצוגות העיצוב", "Design collection") : t(meta[1], meta[2]) : page === "archive" ? t("תצוגת הארכיון", "Archive preview") : page === "board" ? t("הלוח הקלאסי", "Classic board") : page === "home" ? t("תצוגת דף הבית", "Home preview") : t("תצוגת Chess DNA", "Chess DNA preview")}`;
    app.innerHTML = shell(extended ? VeyraPagePreviews.render(page, { t, path, boardMarkup }) : page === "archive" ? archive() : page === "board" ? boardOnly() : page === "home" ? home() : dna());
    wire();
  }
  motionPreference.addEventListener("change", () => render());
  window.addEventListener("pagehide", () => dispose());
  window.addEventListener("pageshow", event => { if (event.persisted) render(); });
  render();
})();
