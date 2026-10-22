import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Chess } from '../public/vendor/veyra-rules/chess-compat.js';

const BOT_DIR = 'public/data/bots';
const manifestPath = join(BOT_DIR, 'index.json');
const normalize = (value) => String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean).sort().join(' ');
const uniq = (values) => [...new Set(values.filter((value) => typeof value === 'string' && value.trim()))];
const sources = [
  { file: 'Anand.pgn', id: 'anand', surname: 'Anand', aliases: ['Anand, Viswanathan', 'Viswanathan Anand'], name: 'Viswanathan Anand', style: 'universal', styleLabel: 'אוניברסלי', region: 'India · Anand PGN', elo: 2817, ratingBasis: 'Peak FIDE rating 2817 (2011)', ratingSourceUrl: 'https://2700chess.com/records', piece: '♞', rationale: 'גמישות בין משחק טקטי למשחק עמדתי; זו השערת סגנון שיש לאמת מול המדדים.' },
  { file: 'Anderssen.pgn', id: 'anderssen', surname: 'Anderssen', aliases: ['Anderssen, Adolf', 'Adolf Anderssen'], name: 'Adolf Anderssen', style: 'attacking', styleLabel: 'התקפי', region: 'Germany · Anderssen PGN', elo: 2700, ratingBasis: 'Internal simulation estimate; no comparable official FIDE rating from his era', piece: '♜', rationale: 'יוזמה והתקפות ישירות, בהתאם לפרופיל ההיסטורי המקובל ולמדדי המשחקים.' },
  { file: 'Capablanca.pgn', id: 'capablanca', surname: 'Capablanca', aliases: ['Capablanca, Jose Raul', 'Jose Raul Capablanca', 'José Raúl Capablanca'], name: 'José Raúl Capablanca', style: 'endgame', styleLabel: 'סיומים ודיוק', region: 'Cuba · Capablanca PGN', elo: 2725, ratingBasis: 'Internal simulation estimate; retrospective ratings are not directly comparable to modern FIDE ratings', piece: '♔', rationale: 'פישוטים, פעילות כלים וסיומים; המדדים בקובץ אינם תחליף לניתוח מנוע.' },
  { file: 'Carlsen.pgn', id: 'carlsen', surname: 'Carlsen', aliases: ['Carlsen, Magnus', 'Magnus Carlsen'], name: 'Magnus Carlsen', style: 'universal', styleLabel: 'אוניברסלי', region: 'Norway · Carlsen PGN', elo: 2882, ratingBasis: 'Peak FIDE rating 2882 (2014)', ratingSourceUrl: 'https://2700chess.com/records', piece: '♕', rationale: 'משחק אוניברסלי ולחץ מתמשך; מדדי PGN מתארים דפוסים ולא מוכיחים איכות מהלך.' },
  { file: 'Fischer.pgn', id: 'fischer', surname: 'Fischer', aliases: ['Fischer, Robert James', 'Robert James Fischer', 'Fischer, Bobby', 'Bobby Fischer'], name: 'Bobby Fischer', style: 'positional', styleLabel: 'עמדתי ודיוק', region: 'USA · Fischer PGN', elo: 2785, ratingBasis: 'Peak FIDE rating 2785 (1972)', ratingSourceUrl: 'https://www.chess.com/blog/CurvySmile/list-of-chess-players-by-peak-fide-rating', piece: '♘', rationale: 'דיוק, פעילות כלים והכנה לפתיחה; סיווג זה הוא נקודת פתיחה לבדיקת holdout.' },
  { file: 'Karpov.pgn', id: 'karpov', surname: 'Karpov', aliases: ['Karpov, Anatoly', 'Anatoly Karpov'], name: 'Anatoly Karpov', style: 'positional', styleLabel: 'עמדתי', region: 'Russia · Karpov PGN', elo: 2780, ratingBasis: 'Peak FIDE rating 2780 (1994)', ratingSourceUrl: 'https://www.chess.com/blog/CurvySmile/list-of-chess-players-by-peak-fide-rating', piece: '♗', rationale: 'לחץ עמדתי, מניעת תוכניות היריב ושיפור כלים; נדרש אימות מול משחקי holdout.' },
  { file: 'Kasparov.pgn', id: 'kasparov', surname: 'Kasparov', aliases: ['Kasparov, Garry', 'Garry Kasparov'], name: 'Garry Kasparov', style: 'attacking', styleLabel: 'התקפי ודינמי', region: 'Russia · Kasparov PGN', elo: 2851, ratingBasis: 'Peak FIDE rating 2851 (1999)', ratingSourceUrl: 'https://2700chess.com/records', piece: '♛', rationale: 'יוזמה דינמית והתקפה; מדדי שח/הכאות מסייעים לתיאור אך אינם ניתוח מנוע.' },
  { file: 'Marshall.pgn', id: 'marshall', surname: 'Marshall', aliases: ['Marshall, Frank James', 'Frank James Marshall', 'Marshall, Frank', 'Frank Marshall'], name: 'Frank Marshall', style: 'attacking', styleLabel: 'התקפי', region: 'USA · Marshall PGN', elo: 2600, ratingBasis: 'Internal simulation estimate; retrospective rating, not official FIDE', piece: '♖', rationale: 'משחק יוזמתי והתקפי; רפרטואר נמדד לפי שכיחות, לא לפי חוזק תאורטי.' },
  { file: 'Morphy.pgn', id: 'morphy', surname: 'Morphy', aliases: ['Morphy, Paul', 'Paul Morphy'], name: 'Paul Morphy', style: 'attacking', styleLabel: 'התקפי ומהיר', region: 'USA · Morphy PGN', elo: 2690, ratingBasis: 'Retrospective Chessmetrics estimate; not official FIDE', ratingSourceUrl: 'https://ajedrez.pro/en/jugadores/ranking', piece: '♙', rationale: 'פיתוח מהיר, פתיחת קווים וניצול יתרון בפיתוח; יש לבדוק איכות בנפרד.' },
  { file: 'Nakamura.pgn', id: 'nakamura', surname: 'Nakamura', aliases: ['Nakamura, Hikaru', 'Hikaru Nakamura'], name: 'Hikaru Nakamura', style: 'tactical', styleLabel: 'טקטי', region: 'USA · Nakamura PGN', elo: 2816, ratingBasis: 'Peak FIDE rating 2816 (2015)', ratingSourceUrl: 'https://2700chess.com/records', piece: '♟', rationale: 'חיפוש משאבים טקטיים ותגובות פעילות; הסיווג נשאר השערה עד בדיקת מנוע.' },
  { file: 'PolgarJ.pgn', id: 'polgarj', surname: 'Polgar', aliases: ['Polgar, Judit', 'Judit Polgar'], name: 'Judit Polgár', style: 'attacking', styleLabel: 'התקפי וטקטי', region: 'Hungary · Judit Polgar PGN', elo: 2735, ratingBasis: 'Peak FIDE rating 2735 (2005)', ratingSourceUrl: 'https://betterchess.co/players', piece: '♚', rationale: 'יוזמה והתקפה ישירה; זהו סיווג עבודה שיש לבדוק על משחקים שלא שימשו לבנייה.' },
  { file: 'Tal.pgn', id: 'tal', surname: 'Tal', aliases: ['Tal, Mihail', 'Mihail Tal', 'Mikhail Tal'], name: 'Mihail Tal', style: 'attacking', styleLabel: 'טקטי והתקפי', region: 'Latvia · Tal PGN', elo: 2705, ratingBasis: 'Peak FIDE rating 2705 (1980)', ratingSourceUrl: 'https://www.chess.com/blog/CurvySmile/list-of-chess-players-by-peak-fide-rating', piece: '♞', rationale: 'יוזמה, טקטיקה והקרבות מחושבות; לא נטען שהבוט משחזר את כל שיקוליו של טל.' },
];
const styleText = {
  attacking: { general: 'יוזמה צריכה ליצור איום ממשי או לשפר פעילות.', opening: 'חפש פיתוח מהיר ופתיחת קווים רק כשהמלך והכלים תומכים בכך.', threat: 'לפני התקפה, בדוק את תגובת ההגנה הטובה ביותר.', tactics: 'הקרבה דורשת וריאציה כפויה או תמורה עמדה ברורה.', endgame: 'גם התקפה צריכה לדעת מתי להמיר יתרון לסיום זכוי.' },
  tactical: { general: 'חפש מהלכים כפויים לפני בחירה שקטה.', opening: 'פתח עמדות רק לאחר בדיקת בטיחות המלך.', threat: 'סרוק שח, הכאות ואיומים בשני הצדדים.', tactics: 'חשב את רצף התגובות, לא רק את המהלך הראשון.', endgame: 'גם בסיום, בדוק טקטיקות והגנות כפויות.' },
  positional: { general: 'שפר את הכלי הפחות פעיל לפני יצירת חולשה.', opening: 'פתח לפי תוכנית מבנית ולא רק לפי זיכרון.', threat: 'מנע את התוכנית של היריב כשאפשר לעשות זאת בלי לוותר על פעילות.', tactics: 'חשב טקטיקה לפני מעבר לתמרון איטי.', endgame: 'נצל חולשות, פעילות מלך ורגלים חופשיים.' },
  defensive: { general: 'הסר איומים וייצב את העמדה לפני התקפת נגד.', opening: 'בחר מבנה שאפשר להגן עליו בלי פסיביות מיותרת.', threat: 'זהה את האיום החזק ביותר של היריב.', tactics: 'בדוק משאבי הגנה והקרבות חילוץ.', endgame: 'הפעל את המלך ושמור על חולשות מינימליות.' },
  endgame: { general: 'פעילות הכלים חשובה יותר מפשטות מלאכותית.', opening: 'בחר פתיחה שמובילה לעמדה שניתן להבין ולשחק היטב.', threat: 'בדוק איומים טקטיים גם לפני חילופי כלים.', tactics: 'אל תיכנס לסיום נחות בלי תמורה קונקרטית.', endgame: 'חשב מרוצי רגלים, פעילות מלך ועמדות צריחים.' },
  universal: { general: 'התאם את התוכנית למאפייני העמדה, לא לתווית קבועה.', opening: 'שמור על גמישות והבן את הרעיון מאחורי המסע.', threat: 'השווה בין איומי היריב לבין התוכנית שלך.', tactics: 'בדוק אפשרויות כפויות לפני בחירה אסטרטגית.', endgame: 'העבר את יתרונות אמצע המשחק לסיום מתאים.' },
};
const styleLabels = { attacking: 'התקפי', tactical: 'טקטי', positional: 'עמדתי', defensive: 'הגנתי', endgame: 'סיומים', universal: 'אוניברסלי' };
const phraseTriggers = {
  general: 'after-move',
  opening: 'opening-phase',
  threat: 'check-or-checkmate',
  tactics: 'capture-or-tactical-move',
  endgame: 'endgame-phase',
};
function makePhraseArchive(style, quips, name, botId = 'bot') {
  const t = styleText[style] || styleText.universal;
  const q = Array.isArray(quips) ? quips : [];
  const personal = (text) => name ? name + ': ' + text : text;
  const category = (key, index, fallback) => uniq([q[index], personal(t[key]), fallback]).slice(0, 3).map((text, entryIndex) => ({
    id: botId + '-' + key + '-' + (entryIndex + 1),
    category: key, trigger: phraseTriggers[key], text, language: 'he',
  }));
  return {
    general: category('general', 0, 'בדוק את איומי שני הצדדים לפני בחירת מהלך.'),
    opening: category('opening', 1, 'השתמש ברפרטואר כנקודת התחלה, לא כהתחייבות עיוורת.'),
    threat: category('threat', 2, 'איום טוב הוא איום ששורד את ההגנה הטובה ביותר.'),
    tactics: category('tactics', 3, 'אל תקריב חומר ללא תמורה שניתן להסביר.'),
    endgame: category('endgame', 4, 'בדוק פעילות מלך, רגלים חופשיים וחולשות לפני חילופים.'),
  };
}
function normalizePhraseArchive(bot) {
  const generated = makePhraseArchive(bot.style, bot.quips, bot.name, bot.id);
  const current = bot.phraseArchive || {};
  const normalized = {};
  for (const category of Object.keys(phraseTriggers)) {
    const existing = Array.isArray(current[category]) ? current[category] : [];
    const texts = uniq(existing.map((entry) => typeof entry === 'string' ? entry : entry?.text).filter(Boolean));
    for (const entry of generated[category]) {
      if (texts.length >= 2) break;
      if (!texts.includes(entry.text)) texts.push(entry.text);
    }
    normalized[category] = texts.slice(0, 3).map((text, index) => ({
      id: bot.id + '-' + category + '-' + (index + 1),
      category, trigger: phraseTriggers[category], text, language: 'he',
    }));
  }
  return normalized;
}
function matchesPlayerName(value, source) {
  const raw = String(value || '');
  if (/[/:]/.test(raw)) return false;
  const actual = normalize(raw).split(' ').filter(Boolean);
  const surname = normalize(source.surname);
  if (!actual.includes(surname)) return false;
  const actualGiven = actual.filter((token) => token !== surname);
  return source.aliases.some((alias) => {
    const aliasTokens = normalize(alias).split(' ').filter(Boolean);
    if (aliasTokens.every((token) => actual.includes(token))) return true;
    const givenNames = aliasTokens.filter((token) => token !== surname);
    return actualGiven.some((abbreviation) => givenNames.some((given) => given.startsWith(abbreviation)));
  });
}
function parseHeaders(pgn) {
  const headers = {};
  const re = /^\[([A-Za-z0-9_]+)\s+"((?:[^"\\]|\\.)*)"\]\s*$/gm;
  let match;
  while ((match = re.exec(pgn))) headers[match[1]] = match[2].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  return headers;
}
function formatMoves(sans) {
  return sans.map((san, index) => (index % 2 === 0 ? (Math.floor(index / 2) + 1) + '.' : '') + san).join(' ').trim();
}
function replayAndMeasure(moves, playerColor) {
  let ownMoves = 0, captures = 0, checks = 0, lateKingMoves = 0;
  for (let index = 0; index < moves.length; index += 1) {
    const move = moves[index];
    const moveColor = move.color || (index % 2 === 0 ? 'w' : 'b');
    if (moveColor === playerColor) {
      ownMoves += 1;
      if (move.captured || String(move.san).includes('x')) captures += 1;
      if (String(move.san).includes('+') || String(move.san).includes('#')) checks += 1;
      if (index >= 40 && move.piece === 'k') lateKingMoves += 1;
    }
  }
  return { ownMoves, captures, checks, lateKingMoves };
}
function parseSource(source, pgnText) {
  const chunks = pgnText.split(/(?=^\[Event\s+")/m).filter((chunk) => /^\[Event\s+"/m.test(chunk));
  assert.ok(chunks.length > 0, source.file + ': no PGN games found');
  const openings = { w: new Map(), b: new Map() };
  const stats = {
    games: 0, trainingGames: 0, holdoutGames: 0, whiteGames: 0, blackGames: 0,
    wins: 0, draws: 0, losses: 0, totalPlies: 0, ownMoves: 0, captures: 0, checks: 0, lateKingMoves: 0,
    holdoutTotalPlies: 0, holdoutOwnMoves: 0, holdoutCaptures: 0, holdoutChecks: 0,
    minYear: Infinity, maxYear: 0,
  };
  const exampleByOutcome = new Map(), examples = [], holdoutPositions = [];
  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex += 1) {
    const chunk = chunks[chunkIndex], headers = parseHeaders(chunk);
    const whiteIsPlayer = matchesPlayerName(headers.White, source);
    const blackIsPlayer = matchesPlayerName(headers.Black, source);
    if (whiteIsPlayer === blackIsPlayer) continue;
    let game;
    try { game = new Chess(); game.loadPgn(chunk, { sloppy: true }); } catch { continue; }
    const moves = game.history({ verbose: true }), sans = moves.map((move) => move.san);
    if (sans.length < 8) continue;
    const color = whiteIsPlayer ? 'w' : 'b', isHoldout = chunkIndex % 10 === 0;
    stats.games += 1; stats.totalPlies += sans.length;
    if (isHoldout) { stats.holdoutGames += 1; stats.holdoutTotalPlies += sans.length; }
    else stats.trainingGames += 1;
    if (color === 'w') stats.whiteGames += 1; else stats.blackGames += 1;
    const result = headers.Result || '*';
    const won = (color === 'w' && result === '1-0') || (color === 'b' && result === '0-1');
    const lost = (color === 'w' && result === '0-1') || (color === 'b' && result === '1-0');
    const outcome = won ? 'win' : lost ? 'loss' : result === '1/2-1/2' ? 'draw' : 'unfinished';
    const gameId = [source.file, headers.Date || 'unknown-date', headers.Event || 'unknown-event', headers.Round || '?', headers.White || '?', headers.Black || '?'].join(':');
    const exampleKey = color + ':' + outcome;
    if (!exampleByOutcome.has(exampleKey)) {
      const opponent = whiteIsPlayer ? headers.Black : headers.White;
      exampleByOutcome.set(exampleKey, {
        gameId, split: isHoldout ? 'holdout' : 'training', sourceFile: source.file,
        event: headers.Event || 'Unknown event', site: headers.Site || null, date: headers.Date || null,
        round: headers.Round || null, color: color === 'w' ? 'white' : 'black',
        opponent: opponent || 'Unknown opponent', result, outcome,
        eco: headers.ECO && /^[A-E]\d{2}$/.test(headers.ECO) ? headers.ECO : null,
        sampleMoves: formatMoves(sans.slice(0, 16)),
      });
    }
    if (won) stats.wins += 1; else if (lost) stats.losses += 1; else if (result === '1/2-1/2') stats.draws += 1;
    const dateMatch = String(headers.Date || '').match(/^(\d{4})\./);
    if (dateMatch) {
      const year = Number(dateMatch[1]);
      if (year > 0 && year < 9999) { stats.minYear = Math.min(stats.minYear, year); stats.maxYear = Math.max(stats.maxYear, year); }
    }
    const measured = replayAndMeasure(moves, color);
    if (isHoldout) {
      stats.holdoutOwnMoves += measured.ownMoves; stats.holdoutCaptures += measured.captures; stats.holdoutChecks += measured.checks;
      if (holdoutPositions.length < 24) {
        const replay = new Chess(), seenPhases = new Set();
        for (let index = 0; index < moves.length; index += 1) {
          const move = moves[index], phaseIndex = Math.min(3, Math.floor(index / moves.length * 4));
          if (index >= 8 && move.color === color && !seenPhases.has(phaseIndex)) {
            const phase = phaseIndex === 0 ? 'opening' : phaseIndex <= 2 ? 'middlegame' : 'endgame';
            const opponent = whiteIsPlayer ? headers.Black : headers.White;
            holdoutPositions.push({
              gameId, sourceFile: source.file, event: headers.Event || 'Unknown event',
              date: headers.Date || null, round: headers.Round || null,
              color: color === 'w' ? 'white' : 'black', side: color,
              opponent: opponent || 'Unknown opponent', result, phase, ply: index + 1,
              fen: replay.fen(), sourceMove: move.from + move.to + (move.promotion || ''), sourceSan: move.san,
            });
            seenPhases.add(phaseIndex);
          }
          replay.move({ from: move.from, to: move.to, promotion: move.promotion || undefined });
          if (holdoutPositions.length >= 24) break;
        }
      }
    } else {
      stats.ownMoves += measured.ownMoves; stats.captures += measured.captures; stats.checks += measured.checks; stats.lateKingMoves += measured.lateKingMoves;
      const lineSans = sans.slice(0, Math.min(16, sans.length)), lineKey = lineSans.join(' ');
      const eco = headers.ECO && /^[A-E]\d{2}$/.test(headers.ECO) ? headers.ECO : '';
      const key = eco + '|' + lineKey, target = openings[color];
      const current = target.get(key) || { sans: lineSans, eco, games: 0 };
      current.games += 1; target.set(key, current);
    }
  }
  assert.ok(stats.games > 0, source.file + ': no valid games matched the exact player aliases: ' + source.aliases.join('; '));
  assert.ok(stats.trainingGames > 0 && stats.holdoutGames > 0, source.file + ': train/holdout split is empty');
  const range = (Number.isFinite(stats.minYear) && stats.maxYear) ? stats.minYear + '–' + stats.maxYear : 'unknown years';
  const makeLines = (color) => [...openings[color].values()].sort((a, b) => b.games - a.games || a.sans.join(' ').localeCompare(b.sans.join(' '))).slice(0, 12).map((line, index) => {
    const replay = new Chess();
    for (const san of line.sans) assert.ok(replay.move(san, { sloppy: true }), source.id + ' illegal repertoire SAN: ' + san);
    return { name: 'קו שנצפה במשחקי האימון ' + (index + 1) + ' · ' + line.games + ' משחקים', moves: formatMoves(line.sans), games: line.games, ...(line.eco ? { eco: line.eco } : {}) };
  });
  const whiteLines = makeLines('w'), blackLines = makeLines('b');
  examples.push(...exampleByOutcome.values());
  examples.sort((a, b) => (a.color + a.outcome).localeCompare(b.color + b.outcome));
  assert.ok(whiteLines.length >= 8 && blackLines.length >= 8, source.id + ': insufficient distinct training opening lines (validGames=' + stats.games + ', training=' + stats.trainingGames + ', holdout=' + stats.holdoutGames + ', validWhite=' + stats.whiteGames + ', validBlack=' + stats.blackGames + ', distinctWhite=' + openings.w.size + ', distinctBlack=' + openings.b.size + ', selectedWhite=' + whiteLines.length + ', selectedBlack=' + blackLines.length + ', chunks=' + chunks.length + ')');
  assert.ok(holdoutPositions.length >= 8, source.id + ': insufficient held-out positions');
  const metrics = {
    games: stats.games, trainingGames: stats.trainingGames, holdoutGames: stats.holdoutGames,
    whiteGames: stats.whiteGames, blackGames: stats.blackGames, wins: stats.wins, draws: stats.draws, losses: stats.losses,
    averagePlies: Number((stats.totalPlies / stats.games).toFixed(2)),
    trainingAveragePlies: Number(((stats.totalPlies - stats.holdoutTotalPlies) / Math.max(1, stats.trainingGames)).toFixed(2)),
    capturesPer100Moves: Number((100 * stats.captures / Math.max(1, stats.ownMoves)).toFixed(2)),
    checksPer100Moves: Number((100 * stats.checks / Math.max(1, stats.ownMoves)).toFixed(2)),
    lateKingMovesPer100Moves: Number((100 * stats.lateKingMoves / Math.max(1, stats.ownMoves)).toFixed(2)),
    holdoutAveragePlies: Number((stats.holdoutTotalPlies / Math.max(1, stats.holdoutGames)).toFixed(2)),
    holdoutCapturesPer100Moves: Number((100 * stats.holdoutCaptures / Math.max(1, stats.holdoutOwnMoves)).toFixed(2)),
    holdoutChecksPer100Moves: Number((100 * stats.holdoutChecks / Math.max(1, stats.holdoutOwnMoves)).toFixed(2)),
    openingDiversityWhite: openings.w.size, openingDiversityBlack: openings.b.size,
  };
  return { gameCount: stats.games, trainingGameCount: stats.trainingGames, holdoutGameCount: stats.holdoutGames, range, whiteLines, blackLines, metrics, exampleGames: examples.slice(0, 8), holdoutPositions: holdoutPositions.slice(0, 24) };
}
function createHistoricalBot(source, sourceData, existing) {
  const current = existing || {};
  const short = source.name;
  const quips = current.quips?.length ? current.quips : [
    'חפש את הרעיון שמחבר בין הפתיחה לתוכנית האמצע.',
    'שכיחות מהלך במשחקים היסטוריים אינה הוכחה שהוא הטוב ביותר.',
    'לפני בחירה טקטית, בדוק את התגובה הכפויה של היריב.',
    'שמור על איכות המהלך גם כאשר אתה מעדיף סגנון מסוים.',
    'בסיומים, בדוק פעילות המלך והרגלים החופשיים.',
  ];
  const sourceNote = 'מקור: ' + source.file + '; ' + sourceData.gameCount + ' משחקים מזוהים לפי כותרות White/Black; ' + sourceData.trainingGameCount + ' משחקי אימון ו-' + sourceData.holdoutGameCount + ' משחקי holdout; טווח שנים ' + sourceData.range + '. הפתיחות נגזרות ממשחקי האימון ומסודרות לפי שכיחות, לא לפי איכות מנוע.';
  const description = current.description || ('בוט שחמט עצמאי בהשראת סגנון המשחק של ' + short + '. אינו קשור רשמית לשחקן או לעיזבונו.');
  const bot = {
    ...current,
    id: source.id,
    slug: source.id,
    elo: source.elo ?? current.elo,
    ratingBasis: source.ratingBasis,
    ...(source.ratingSourceUrl ? { ratingSourceUrl: source.ratingSourceUrl } : {}),
    name: current.name || short,
    title: current.title || (source.styleLabel + ' · שחקן היסטורי'),
    tier: current.tier ?? 3,
    stage: current.stage || 'grandmaster',
    flavor: current.flavor || source.rationale,
    piece: current.piece || source.piece,
    era: current.era || (sourceData.range + ' · ' + source.id + ' PGN'),
    region: current.region || source.region,
    persona: current.persona || (source.name + '-inspired independent bot'),
    historicalNote: description,
    description,
    style: source.style,
    styleLabel: source.styleLabel,
    openingEraNote: 'רפרטואר נגזר מ-' + sourceData.gameCount + ' משחקים מזוהים (' + sourceData.range + '). שכיחות אינה מעידה על איכות.',
    quips,
    openingsAsWhite: sourceData.whiteLines,
    openingsAsBlack: sourceData.blackLines,
    gambits: source.id === 'tal' ? (current.gambits || []) : [],
    sourceGameCount: sourceData.gameCount,
    trainingGameCount: sourceData.trainingGameCount,
    holdoutGameCount: sourceData.holdoutGameCount,
    holdoutPositions: sourceData.holdoutPositions,
    sourceGeneratorVersion: 3,
    sourceYearRange: sourceData.range,
    sourceFile: source.file,
    sourceNote,
    styleMetrics: sourceData.metrics,
    exampleGames: sourceData.exampleGames,
    styleAssessment: 'סיווג סגנון הוא השערה שמגובה במדדי דפוסי מהלכים מתוך PGN; הוא עדיין דורש בדיקת מנוע וסט holdout.',
    legendCategory: source.style,
    blindfoldEnabled: current.blindfoldEnabled ?? false,
  };
  if (!bot.phraseArchive || source.id !== 'tal') bot.phraseArchive = makePhraseArchive(source.style, quips, bot.name, source.id);
  return bot;
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
assert.ok(Array.isArray(manifest), 'Bot manifest must be an array');
const originalCount = manifest.length;
const runtimeFiles = new Set((await readdir(BOT_DIR)).filter((name) => name.endsWith('.json') && name !== 'index.json'));
const byId = new Map(manifest.map((bot) => [bot.id, bot]));
for (const bot of manifest) {
  const runtimePath = join(BOT_DIR, bot.id + '.json');
  let runtime;
  try { runtime = JSON.parse(await readFile(runtimePath, 'utf8')); } catch { runtime = bot; }
  const merged = { ...bot, ...runtime };
  if (!merged.phraseArchive) merged.phraseArchive = makePhraseArchive(merged.style, merged.quips, merged.name, merged.id);
  byId.set(merged.id, merged);
}
for (const source of sources) {
  const pgnText = await readFile(source.file, 'utf8');
  const sourceSha256 = createHash('sha256').update(pgnText).digest('hex');
  const existing = byId.get(source.id);
  const existingReady = existing
    && existing.sourceGeneratorVersion === 3
    && existing.sourceFile === source.file
    && existing.sourceSha256 === sourceSha256
    && existing.trainingGameCount + existing.holdoutGameCount === existing.sourceGameCount
    && Array.isArray(existing.holdoutPositions) && existing.holdoutPositions.length >= 8
    && Array.isArray(existing.openingsAsWhite) && existing.openingsAsWhite.length >= 8
    && Array.isArray(existing.openingsAsBlack) && existing.openingsAsBlack.length >= 8
    && existing.phraseArchive
    && ['general','opening','threat','tactics','endgame'].every((key) => Array.isArray(existing.phraseArchive[key]) && existing.phraseArchive[key].length >= 2);
  if (existingReady) {
    console.log('SKIP READY ' + source.id + ': source hash and version-3 readiness checkpoint match.');
    continue;
  }
  const parsed = parseSource(source, pgnText);
  const bot = createHistoricalBot(source, parsed, existing);
  bot.sourceSha256 = sourceSha256;
  assert.ok(bot.exampleGames?.length >= 2, source.id + ': source game examples missing');
  assert.ok(bot.phraseArchive && ['general','opening','threat','tactics','endgame'].every((key) => Array.isArray(bot.phraseArchive[key]) && bot.phraseArchive[key].length >= 2), source.id + ': phrase archive readiness failed');
  assert.ok(bot.openingsAsWhite.length >= 8 && bot.openingsAsBlack.length >= 8, source.id + ': opening repertoire readiness failed');
  byId.set(source.id, bot);
  const checkpoint = [...byId.values()].sort((a, b) => (a.elo ?? 999999) - (b.elo ?? 999999) || a.id.localeCompare(b.id));
  await writeFile(join(BOT_DIR, bot.id + '.json'), JSON.stringify(bot, null, 2) + String.fromCharCode(10));
  await writeFile(manifestPath, JSON.stringify(checkpoint, null, 2) + '\n');
  console.log('READY ' + source.id + ': ' + parsed.gameCount + ' source games, ' + parsed.whiteLines.length + ' White lines, ' + parsed.blackLines.length + ' Black lines, ' + parsed.exampleGames.length + ' example games; checkpoint saved before next bot.');
}
const updated = [...byId.values()].sort((a, b) => a.elo - b.elo || a.id.localeCompare(b.id));
assert.equal(updated.length, originalCount + sources.filter((source) => !manifest.some((bot) => bot.id === source.id)).length, 'Unexpected bot count after generation');
for (const bot of updated) {
  bot.phraseArchive = normalizePhraseArchive(bot);
  assert.ok(bot.phraseArchive && ['general','opening','threat','tactics','endgame'].every((key) => Array.isArray(bot.phraseArchive[key]) && bot.phraseArchive[key].length >= 2), bot.id + ': missing phrase archive category');
  if (sources.some((source) => source.id === bot.id)) {
    assert.ok(bot.sourceGameCount > 0 && bot.sourceFile && bot.styleMetrics, bot.id + ': source provenance missing');
    assert.ok(bot.openingsAsWhite.length >= 8 && bot.openingsAsBlack.length >= 8, bot.id + ': repertoire incomplete');
  }
  await writeFile(join(BOT_DIR, bot.id + '.json'), JSON.stringify(bot, null, 2) + '\n');
}
await writeFile(manifestPath, JSON.stringify(updated, null, 2) + '\n');

const researchLines = [
  '# Historical Legends PGN research',
  '',
  'This report is generated from the committed PGN files by scripts/build-historical-legend-bots.mjs. It describes the supplied game data; it is not an independent engine evaluation. Runtime rating parameters use official peak FIDE ratings where stated; for players from eras without comparable official ratings, the parameter is an internal estimate, not a directly comparable historical rating.',
  '',
  '## Method and limitations',
  '',
  '- Games are assigned to the player only when the player name is found in the PGN White or Black headers.',
  '- Opening repertoires are grouped by the color the historical player actually played and sorted by source-game frequency, not by theoretical quality.',
  '- The listed game examples preserve event/date/round/opponent/result/color and a short move sample from the source PGN.',
  '- Capture/check/late-king metrics describe observed move patterns. They do not prove intent or style similarity by themselves.',
  '- Style labels are hypotheses. The bot must still pass legal-move, tactical-accuracy, full-tournament and holdout checks.',
  '',
];
for (const bot of updated.filter((item) => item.sourceFile).sort((a, b) => a.id.localeCompare(b.id))) {
  const m = bot.styleMetrics || {};
  researchLines.push(
    '## ' + bot.name + ' (' + bot.id + ')',
    '',
    '- Source PGN: ' + bot.sourceFile,
    '- Internal bot rating parameter: ' + bot.elo + ' (' + bot.ratingBasis + ')',
    ...(bot.ratingSourceUrl ? ['- Rating source: ' + bot.ratingSourceUrl] : []),
    '- Valid games attributed to the player: ' + bot.sourceGameCount,
    '- Training / holdout games: ' + bot.trainingGameCount + ' / ' + bot.holdoutGameCount,
    '- Holdout captures/checks per 100 player moves: ' + m.holdoutCapturesPer100Moves + ' / ' + m.holdoutChecksPer100Moves,
    '- Date range: ' + bot.sourceYearRange,
    '- Results from the player perspective: ' + m.wins + ' wins, ' + m.draws + ' draws, ' + m.losses + ' losses',
    '- Games as White / Black: ' + m.whiteGames + ' / ' + m.blackGames,
    '- Average game length: ' + m.averagePlies + ' plies',
    '- Captures per 100 player moves: ' + m.capturesPer100Moves,
    '- Checks per 100 player moves: ' + m.checksPer100Moves,
    '- King moves after ply 40 per 100 player moves: ' + m.lateKingMovesPer100Moves,
    '- Opening diversity: ' + m.openingDiversityWhite + ' White lines and ' + m.openingDiversityBlack + ' Black lines',
    '- Working style hypothesis: ' + bot.styleLabel + '. ' + bot.flavor,
    '',
    '### Representative source games',
    ''
  );
  for (const game of bot.exampleGames || []) {
    researchLines.push(
      '- ' + game.gameId + ' · ' + (game.date || 'unknown date') + ' · ' + (game.event || 'unknown event') + ' · round ' + (game.round || '?') + ' · split ' + game.split +
      ' · ' + game.color + ' · vs ' + game.opponent + ' · result ' + game.result +
      (game.eco ? ' · ECO ' + game.eco : ''),
      '  - Source move sample: ' + game.sampleMoves
    );
  }
  researchLines.push('', '### Held-out positions not used to build the repertoire', '');
  for (const position of bot.holdoutPositions || []) {
    researchLines.push('- ' + position.gameId + ' · ' + position.phase + ' · ply ' + position.ply + ' · ' + position.color + ' vs ' + position.opponent + ' · result ' + position.result + ' · historical move ' + position.sourceSan + ' (' + position.sourceMove + ')');
    researchLines.push('  - FEN: `' + position.fen + '`');
  }
  researchLines.push('', '### Most frequent source lines as White', '');
  for (const line of bot.openingsAsWhite || []) researchLines.push('- ' + line.moves + ' · observed in ' + line.games + ' source games' + (line.eco ? ' · ECO ' + line.eco : ''));
  researchLines.push('', '### Most frequent source lines as Black', '');
  for (const line of bot.openingsAsBlack || []) researchLines.push('- ' + line.moves + ' · observed in ' + line.games + ' source games' + (line.eco ? ' · ECO ' + line.eco : ''));
  researchLines.push('', '### Phrase archive', '');
  for (const category of ['general', 'opening', 'threat', 'tactics', 'endgame']) {
    researchLines.push('- ' + category + ': ' + (bot.phraseArchive?.[category] || []).map((phrase) => typeof phrase === 'string' ? phrase : phrase.text).join(' / '));
  }
  researchLines.push('', '---', '');
}
await writeFile('docs/LEGENDS_PGN_RESEARCH.md', researchLines.join('\n') + '\n');

console.log('PASS: generated source-grounded historical repertoires and phrase archives for ' + sources.length + ' PGN sources; manifest now contains ' + updated.length + ' bots.');
