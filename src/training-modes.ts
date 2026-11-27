// Veyra Training Power-Ups:
//  1. Blunder Rewind (חזרה לשגיאה): rewinds 2 plies before a real blunder to play & win vs a bot
//  2. Coach Mode with 3 Lifelines (3 קווי הצלה): in-game toggle with MIT tactical arrow + pre-blunder warning
//  3. 5-Minute Daily Micro-Loop (מיקרו-אימון יומי): 3-step daily checklist + streak + completion confirmation
// Pure MIT TypeScript; zero external deps; safe to import in Node tests.

import type { BotStart } from './bot-start-position.js';

const PIECE_VAL: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

// ─────────────────────────────────────────────────────────────────────────────
// 1. BLUNDER REWIND (חזרה לשגיאה — 2 חצאי-מהלכים לפני הטעות)
// ─────────────────────────────────────────────────────────────────────────────

export interface BlunderRewindCandidate {
  id: string;
  titleHe: string;
  sourceHe: string;
  playerSide: 'white' | 'black';
  rewindPly: number;
  blunderPly: number;
  blunderMoveSan: string;
  fen: string;
  start: BotStart;
  hintHe: string;
}

const CURATED_REWIND_LIBRARY: Array<{
  id: string;
  titleHe: string;
  sourceHe: string;
  playerSide: 'white' | 'black';
  blunderMoveSan: string;
  pgn: string;
  blunderPly: number;
  hintHe: string;
}> = [
  {
    id: 'rewind-scholars-g6',
    titleHe: 'עצירת מלכה מוקדמת בלי לאבד צריח',
    sourceHe: 'טעות פתיחה נפוצה (חזרה 2 מהלכים אחורה)',
    playerSide: 'black',
    blunderMoveSan: 'g6??',
    pgn: '1. e4 e5 2. Qh5 g6 3. Qxe5+ Qe7 4. Qxh8',
    blunderPly: 3, // 0-indexed: 0:e4, 1:e5, 2:Qh5, 3:g6 -> rewind to ply 1 (before 2.Qh5) or ply 2
    hintHe: 'הגן קודם על e5 עם Nc6 לפני שאתה מגרש את המלכה עם g6.',
  },
  {
    id: 'rewind-italian-f7',
    titleHe: 'הגנה ממלכודת f7 באיטלקית',
    sourceHe: 'דפוס פתיחה מ-orenzbit (חזרה 2 חצאי-מהלכים אחורה)',
    playerSide: 'black',
    blunderMoveSan: 'Nxd5??',
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5 d5 5. exd5 Nxd5 6. Nxf7',
    blunderPly: 9,
    hintHe: 'במקום לקחת Nxd5 ולהסתכן ב-Nxf7, שחק Na5 לתקוף את הרץ ב-c4.',
  },
  {
    id: 'rewind-hanging-center',
    titleHe: 'לשמור על רגלי המרכז ולא להשאיר כלי תלוי',
    sourceHe: 'דפוס משחק אישי (חזרה 2 חצאי-מהלכים אחורה)',
    playerSide: 'white',
    blunderMoveSan: 'Na3?',
    pgn: '1. e4 e5 2. Nf3 Nc6 3. d3 Nf6 4. Be2 Bb4+ 5. Na3 Bxa3',
    blunderPly: 8,
    hintHe: 'במקום Na3 בשוליים, חסום את השח עם c3 או Bd2 ושמור על מבנה חזק.',
  },
];

/** Rewinds a PGN exactly 2 plies before `blunderPly` and returns a verified BotStart playable in BotGame. */
export function buildBlunderRewindFromPgn(
  pgn: string,
  blunderPly: number,
  playerSide: 'white' | 'black',
  ChessCtor: any,
  meta?: { id?: string; titleHe?: string; sourceHe?: string; blunderMoveSan?: string; hintHe?: string }
): BlunderRewindCandidate | null {
  try {
    const full = new ChessCtor();
    if (typeof full.loadPgn === 'function') full.loadPgn(pgn);
    else if (typeof full.load_pgn === 'function') full.load_pgn(pgn);
    else return null;

    const hist: any[] = full.history({ verbose: true }) || [];
    if (hist.length < 2) return null;

    const clampedBlunder = Math.max(2, Math.min(hist.length - 1, blunderPly));
    let rewindPly = Math.max(0, clampedBlunder - 2);
    // Ensure it is the player's turn at rewindPly when possible
    const wantColor = playerSide === 'black' ? 'b' : 'w';
    const replay = new ChessCtor();
    for (let i = 0; i < rewindPly; i++) {
      replay.move({ from: hist[i].from, to: hist[i].to, promotion: hist[i].promotion || undefined });
    }
    if (replay.turn() !== wantColor && rewindPly > 0) {
      rewindPly -= 1;
      replay.reset();
      for (let i = 0; i < rewindPly; i++) {
        replay.move({ from: hist[i].from, to: hist[i].to, promotion: hist[i].promotion || undefined });
      }
    }

    const moves = hist.slice(0, rewindPly).map((m: any) => m.san);
    const fen = replay.fen();
    const start: BotStart = {
      baseFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      moves,
      fen,
      reviewable: true,
    };

    return {
      id: meta?.id || `rewind-${rewindPly}-${clampedBlunder}`,
      titleHe: meta?.titleHe || `חזרה לשגיאה (מהלך ${Math.floor(clampedBlunder / 2) + 1})`,
      sourceHe: meta?.sourceHe || 'משחק אישי שלך',
      playerSide,
      rewindPly,
      blunderPly: clampedBlunder,
      blunderMoveSan: meta?.blunderMoveSan || hist[clampedBlunder]?.san || '?',
      fen,
      start,
      hintHe: meta?.hintHe || `במשחק המקורי שיחקת ${hist[clampedBlunder]?.san || 'טעות'} — חזרנו 2 מהלכים אחורה כדי שתנצח מכאן!`,
    };
  } catch {
    return null;
  }
}

function materialBalance(game: any, perspective: 'w' | 'b'): number {
  const board = game.board?.();
  if (!Array.isArray(board)) return 0;
  let score = 0;
  for (const row of board) {
    for (const cell of row) {
      if (!cell) continue;
      const v = PIECE_VAL[cell.type] || 0;
      score += cell.color === perspective ? v : -v;
    }
  }
  return score;
}

/** Scans real archive games for sharp material drops (blunders) and produces 2-ply rewound starts. */
export function extractBlunderRewindCandidates(
  archiveGames: any[],
  ChessCtor: any,
  limit = 4
): BlunderRewindCandidate[] {
  const out: BlunderRewindCandidate[] = [];
  for (const g of (archiveGames || []).slice(0, 20)) {
    if (out.length >= limit) break;
    if (!g?.pgn) continue;
    try {
      const c = new ChessCtor();
      c.loadPgn(g.pgn);
      const hist: any[] = c.history({ verbose: true }) || [];
      if (hist.length < 8) continue;
      const side: 'white' | 'black' = g.playerColor === 'black' ? 'black' : 'white';
      const colorCode: 'w' | 'b' = side === 'black' ? 'b' : 'w';

      const probe = new ChessCtor();
      let worstDrop = 0;
      let worstPly = -1;
      for (let i = 0; i < Math.min(hist.length - 1, 50); i++) {
        const beforeMat = materialBalance(probe, colorCode);
        probe.move({ from: hist[i].from, to: hist[i].to, promotion: hist[i].promotion || undefined });
        if (hist[i].color === colorCode && i + 1 < hist.length) {
          const afterReply = new ChessCtor(probe.fen());
          afterReply.move({ from: hist[i + 1].from, to: hist[i + 1].to, promotion: hist[i + 1].promotion || undefined });
          const drop = beforeMat - materialBalance(afterReply, colorCode);
          if (drop >= 250 && drop > worstDrop && i >= 4) {
            worstDrop = drop;
            worstPly = i;
          }
        }
      }
      if (worstPly >= 4) {
        const cand = buildBlunderRewindFromPgn(g.pgn, worstPly, side, ChessCtor, {
          id: `archive-rewind-${g.id || out.length}`,
          titleHe: `חזרה לשגיאה מול ${g.opponent || 'יריב'} (אובדן ~${(worstDrop / 100).toFixed(1)} רגלים)`,
          sourceHe: `${g.date || 'ארכיון'} · מהלך ${Math.floor(worstPly / 2) + 1}`,
          blunderMoveSan: hist[worstPly]?.san || '?',
          hintHe: `אחרי ${hist[worstPly]?.san} היריב זכה בחומר (${hist[worstPly + 1]?.san}). חזרנו 2 מהלכים אחורה — הגן על הכלי החשוף ונצח מכאן!`,
        });
        if (cand) out.push(cand);
      }
    } catch {}
  }

  for (const item of CURATED_REWIND_LIBRARY) {
    if (out.length >= limit) break;
    const cand = buildBlunderRewindFromPgn(item.pgn, item.blunderPly, item.playerSide, ChessCtor, item);
    if (cand) out.push(cand);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. COACH MODE WITH 3 LIFELINES (3 קווי הצלה במשחק מול בוט)
// ─────────────────────────────────────────────────────────────────────────────

export interface CoachLifelineHint {
  from: string;
  to: string;
  san: string;
  explanationHe: string;
  scoreCp: number;
}

export interface CoachLifelineState {
  enabled: boolean;
  maxLifelines: number;
  remaining: number;
  usedCount: number;
  lastHint: CoachLifelineHint | null;
}

export function createCoachLifelineState(enabled = false, maxLifelines = 3): CoachLifelineState {
  return {
    enabled,
    maxLifelines,
    remaining: maxLifelines,
    usedCount: 0,
    lastHint: null,
  };
}

/** Fast 2-ply MIT tactical evaluator to recommend a strong safe move and explain why in Hebrew. */
export function evaluateLifelineHint(fen: string, ChessCtor: any): CoachLifelineHint | null {
  try {
    const game = new ChessCtor(fen);
    const legal: any[] = game.moves({ verbose: true }) || [];
    if (!legal.length) return null;
    const side: 'w' | 'b' = game.turn();
    const centerSq = new Set(['d4', 'e4', 'd5', 'e5']);

    let bestMove = legal[0];
    let bestScore = -Infinity;

    for (const mv of legal) {
      const next = new ChessCtor(fen);
      next.move({ from: mv.from, to: mv.to, promotion: mv.promotion || undefined });
      if (next.isCheckmate?.()) {
        return {
          from: mv.from,
          to: mv.to,
          san: mv.san,
          scoreCp: 10000,
          explanationHe: `קו הצלה: ${mv.san} הוא מט מיידי!`,
        };
      }
      // Opponent's best immediate capture reply (1-ply tactical safety check)
      const replies: any[] = next.moves({ verbose: true }) || [];
      let worstReplyScore = materialBalance(next, side);
      for (const rep of replies) {
        if (!rep.captured && !rep.san?.includes('+')) continue;
        const after = new ChessCtor(next.fen());
        after.move({ from: rep.from, to: rep.to, promotion: rep.promotion || undefined });
        const s = after.isCheckmate?.() ? -10000 : materialBalance(after, side);
        if (s < worstReplyScore) worstReplyScore = s;
      }
      let bonus = 0;
      if (centerSq.has(mv.to)) bonus += 24;
      if (mv.san === 'O-O' || mv.san === 'O-O-O') bonus += 42;
      if ((mv.piece === 'n' || mv.piece === 'b') && (mv.from[1] === '1' || mv.from[1] === '8')) bonus += 18;
      if (mv.san?.includes('+')) bonus += 15;
      const total = worstReplyScore + bonus;
      if (total > bestScore) {
        bestScore = total;
        bestMove = mv;
      }
    }

    let reason = 'משפר את פעילות הכלים ושומר על בטיחות מלאה';
    if (bestMove.captured) reason = `זוכה בחומר בטוח על משבצת ${bestMove.to}`;
    else if (bestMove.san === 'O-O' || bestMove.san === 'O-O-O') reason = 'מבטיח את המלך ומחבר את הצריח';
    else if (bestMove.san?.includes('+')) reason = 'נותן שח ומקבל יוזמה מיידית';
    else if (centerSq.has(bestMove.to)) reason = `תופס שליטה במרכז (${bestMove.to}) בלי להשאיר כלים תלויים`;

    return {
      from: bestMove.from,
      to: bestMove.to,
      san: bestMove.san,
      scoreCp: Math.round(bestScore),
      explanationHe: `קו הצלה (${bestMove.san}): ${reason}.`,
    };
  } catch {
    return null;
  }
}

/** Checks if a player's proposed move drops >= 200cp immediately (hanging piece / blunder guard). */
export function checkPreBlunderWarning(
  fen: string,
  from: string,
  to: string,
  ChessCtor: any
): { isBlunder: boolean; dropCp: number; warningHe: string | null; bestHint: CoachLifelineHint | null } {
  try {
    const before = new ChessCtor(fen);
    const side: 'w' | 'b' = before.turn();
    const after = new ChessCtor(fen);
    const played = after.move({ from, to, promotion: undefined });
    if (!played) return { isBlunder: false, dropCp: 0, warningHe: null, bestHint: null };
    if (after.isCheckmate?.()) return { isBlunder: false, dropCp: 0, warningHe: null, bestHint: null };

    const bestHint = evaluateLifelineHint(fen, ChessCtor);
    const replies: any[] = after.moves({ verbose: true }) || [];
    let worstAfter = materialBalance(after, side);
    let punishingSan = '';
    for (const rep of replies) {
      if (!rep.captured && !rep.san?.includes('#')) continue;
      const r2 = new ChessCtor(after.fen());
      r2.move({ from: rep.from, to: rep.to, promotion: rep.promotion || undefined });
      const s = r2.isCheckmate?.() ? -10000 : materialBalance(r2, side);
      if (s < worstAfter) {
        worstAfter = s;
        punishingSan = rep.san;
      }
    }
    const baseline = bestHint ? bestHint.scoreCp : materialBalance(before, side);
    const dropCp = Math.round(baseline - worstAfter);
    if (dropCp >= 220) {
      return {
        isBlunder: true,
        dropCp,
        warningHe: `⚠️ קו הצלה עצר אותך בזמן! ${played.san} מאפשר ליריב ${punishingSan || 'זכייה בחומר'}. עדיף לשחק ${bestHint?.san || 'מהלך הגנתי'}.`,
        bestHint,
      };
    }
    return { isBlunder: false, dropCp: Math.max(0, dropCp), warningHe: null, bestHint };
  } catch {
    return { isBlunder: false, dropCp: 0, warningHe: null, bestHint: null };
  }
}

export function consumeCoachLifeline(
  state: CoachLifelineState,
  fen: string,
  ChessCtor: any
): { allowed: boolean; nextState: CoachLifelineState; hint: CoachLifelineHint | null } {
  if (!state.enabled || state.remaining <= 0) {
    return { allowed: false, nextState: state, hint: null };
  }
  const hint = evaluateLifelineHint(fen, ChessCtor);
  if (!hint) return { allowed: false, nextState: state, hint: null };
  return {
    allowed: true,
    hint,
    nextState: {
      ...state,
      remaining: state.remaining - 1,
      usedCount: state.usedCount + 1,
      lastHint: hint,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. 5-MINUTE DAILY MICRO-LOOP (מיקרו-אימון יומי · 5 דקות)
// ─────────────────────────────────────────────────────────────────────────────

export type MicroStepId = 'blunder-rewind' | 'course-step' | 'endgame-drill';

export interface DailyMicroStep {
  id: MicroStepId;
  titleHe: string;
  subtitleHe: string;
  minutes: number;
  icon: string;
}

export const DAILY_MICRO_STEPS: DailyMicroStep[] = [
  {
    id: 'blunder-rewind',
    titleHe: 'חזרה לשגיאה אישית אחת (Blunder Rewind)',
    subtitleHe: 'חזור 2 מהלכים לפני טעות אמיתית ונצח מול בוט',
    minutes: 2,
    icon: '⏪',
  },
  {
    id: 'course-step',
    titleHe: 'שיעור קצר מקורס הבוטים (DNA)',
    subtitleHe: '3 תרגולים מודרכים עם מאמן בוט + מיני-ספארינג',
    minutes: 2,
    icon: '🎓',
  },
  {
    id: 'endgame-drill',
    titleHe: 'תרגיל סיום / המרת יתרון אחד',
    subtitleHe: 'מט נקי בלי ליפול לפט (קפבלנקה)',
    minutes: 1,
    icon: '♜',
  },
];

export interface DailyMicroLoopState {
  byDate: Record<string, MicroStepId[]>;
}

export const DAILY_MICRO_STORAGE_KEY = 'veyra_daily_micro_loop_v1';

export function todayLocalKey(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function loadMicroLoopState(): DailyMicroLoopState {
  try {
    const raw = (globalThis as any).localStorage?.getItem(DAILY_MICRO_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed.byDate === 'object') return parsed;
  } catch {}
  return { byDate: {} };
}

export function saveMicroLoopState(state: DailyMicroLoopState): void {
  try {
    (globalThis as any).localStorage?.setItem(DAILY_MICRO_STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export function toggleMicroStep(
  state: DailyMicroLoopState,
  stepId: MicroStepId,
  dateKey = todayLocalKey(),
  forceComplete?: boolean
): DailyMicroLoopState {
  const prev = Array.isArray(state.byDate[dateKey]) ? state.byDate[dateKey] : [];
  const exists = prev.includes(stepId);
  let nextDay: MicroStepId[];
  if (forceComplete === true) nextDay = exists ? prev : [...prev, stepId];
  else if (forceComplete === false) nextDay = prev.filter(x => x !== stepId);
  else nextDay = exists ? prev.filter(x => x !== stepId) : [...prev, stepId];
  return {
    byDate: {
      ...state.byDate,
      [dateKey]: nextDay,
    },
  };
}

export function computeMicroLoopSummary(state: DailyMicroLoopState, dateKey = todayLocalKey()) {
  const doneToday = Array.isArray(state.byDate[dateKey]) ? state.byDate[dateKey] : [];
  const allCompletedToday = DAILY_MICRO_STEPS.every(s => doneToday.includes(s.id));

  // Calculate consecutive streak of fully completed days ending today (or yesterday)
  let streakDays = 0;
  const baseDate = new Date(`${dateKey}T12:00:00Z`);
  for (let offset = 0; offset < 365; offset++) {
    const d = new Date(baseDate.getTime() - offset * 86400000);
    const k = d.toISOString().slice(0, 10);
    const arr = state.byDate[k] || [];
    const full = DAILY_MICRO_STEPS.every(s => arr.includes(s.id));
    if (full) streakDays += 1;
    else if (offset === 0) continue; // Allow streak from yesterday if today still in progress
    else break;
  }

  return {
    dateKey,
    doneToday,
    completedCount: doneToday.length,
    totalSteps: DAILY_MICRO_STEPS.length,
    percent: Math.round((doneToday.length / DAILY_MICRO_STEPS.length) * 100),
    allCompletedToday,
    streakDays,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// UI COMPONENTS (Hebrew RTL)
// ─────────────────────────────────────────────────────────────────────────────

export function DailyMicroLoopCard({
  state,
  onToggleStep,
  onStartRewind,
  onOpenCourses,
  onStartEndgame,
}: {
  state: DailyMicroLoopState;
  onToggleStep: (stepId: MicroStepId) => void;
  onStartRewind: () => void;
  onOpenCourses: () => void;
  onStartEndgame: () => void;
}) {
  const ReactObj = (globalThis as any).React;
  const h = ReactObj.createElement;
  const summary = computeMicroLoopSummary(state);

  const actionFor = (id: MicroStepId) => {
    if (id === 'blunder-rewind') return { label: 'הפעל Rewind ←', fn: onStartRewind };
    if (id === 'course-step') return { label: 'פתח קורס ←', fn: onOpenCourses };
    return { label: 'תרגל סיום ←', fn: onStartEndgame };
  };

  return h('section', { className: 'evo-card evo-micro-card', 'data-evo-micro-loop': 'true', dir: 'rtl' },
    h('div', { className: 'evo-radar-header' },
      h('div', null,
        h('span', { className: 'archive-eyebrow' }, 'DAILY MICRO-LOOP · 5 MIN'),
        h('h2', null, 'מיקרו-אימון יומי (5 דקות)'),
        h('p', { className: 'muted' }, 'שגיאה אישית אחת + שיעור קצר מבוט + עמדת סיום אחת = עלייה עקבית בדירוג.')
      ),
      h('div', { className: 'evo-streak-badge ' + (summary.allCompletedToday ? 'is-complete' : '') },
        summary.allCompletedToday
          ? `✅ הושלם היום · רצף ${summary.streakDays} ימים`
          : `🔥 ${summary.completedCount}/${summary.totalSteps} היום · רצף ${summary.streakDays} ימים`
      )
    ),
    h('div', { className: 'evo-bar-track evo-micro-progress' },
      h('div', { className: 'evo-bar-fill is-ok', style: { width: `${summary.percent}%` } })
    ),
    h('div', { className: 'evo-micro-list' },
      DAILY_MICRO_STEPS.map(step => {
        const done = summary.doneToday.includes(step.id);
        const act = actionFor(step.id);
        return h('div', { key: step.id, className: 'evo-micro-row ' + (done ? 'is-done' : '') },
          h('button', {
            className: 'evo-micro-check',
            'aria-pressed': done,
            'data-micro-toggle': step.id,
            onClick: () => onToggleStep(step.id),
            title: done ? 'סמן כלא הושלם' : 'סמן כהושלם',
          }, done ? '✅' : '○'),
          h('div', { className: 'evo-micro-info' },
            h('strong', null, `${step.icon} ${step.titleHe}`),
            h('span', { className: 'muted' }, `${step.subtitleHe} · ~${step.minutes} דק׳`)
          ),
          h('button', { className: 'evo-action-btn', 'data-micro-launch': step.id, onClick: act.fn }, act.label)
        );
      })
    ),
    summary.allCompletedToday && h('div', { className: 'evo-done-banner', role: 'status' },
      '🎉 כל הכבוד! השלמת את מיקרו-האימון היומי של 5 הדקות — הרצף שלך נשמר.'
    )
  );
}

export function BlunderRewindPanel({ archiveGames, onLaunchRewind }: {
  archiveGames?: any[];
  onLaunchRewind: (cand: BlunderRewindCandidate) => void;
}) {
  const ReactObj = (globalThis as any).React;
  const h = ReactObj.createElement;
  const ChessCtor = (globalThis as any).ChessLib?.Chess;
  if (!ChessCtor) return null;
  const candidates = extractBlunderRewindCandidates(archiveGames || [], ChessCtor, 3);

  return h('section', { className: 'evo-card evo-rewind-panel', 'data-evo-blunder-rewind': 'true', dir: 'rtl' },
    h('div', { className: 'evo-radar-header' },
      h('div', null,
        h('span', { className: 'archive-eyebrow' }, 'BLUNDER REWIND'),
        h('h2', null, '⏪ חזרה לשגיאה (2 מהלכים אחורה)'),
        h('p', { className: 'muted' }, 'בחר טעות אמיתית — אנחנו מחזירים אותך 2 חצאי-מהלכים לפני הבלנדר כדי שתנצח מכאן מול בוט (כולל אפשרות ל-3 קווי הצלה).')
      )
    ),
    h('div', { className: 'evo-rewind-grid' },
      candidates.map(cand =>
        h('article', { key: cand.id, className: 'evo-rewind-item' },
          h('div', { className: 'evo-rewind-top' },
            h('strong', null, cand.titleHe),
            h('span', { className: 'evo-meta-pill' }, `שוחק: ${cand.blunderMoveSan}`)
          ),
          h('small', { className: 'muted' }, cand.sourceHe),
          h('p', { className: 'evo-bot-desc' }, cand.hintHe),
          h('button', {
            className: 'primary',
            'data-launch-rewind': cand.id,
            onClick: () => onLaunchRewind(cand),
          }, 'חזור 2 מהלכים ונצח מכאן ⏪')
        )
      )
    )
  );
}
