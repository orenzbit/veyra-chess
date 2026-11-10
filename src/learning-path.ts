// Learn path: two courses (openings, endgames), each a vertical path of nodes with lessons and practice alternating.
// Content comes only from Veyra's own data: the opening repertoire (public/data/repertoire.json) and ENDGAMES.
// Pure data and helpers (no DOM); the page lives in learn-page.ts.
import { ENDGAMES, GOAL_LABEL, type Bilingual, type Endgame } from './endgames.ts';
import { coreLines } from './opening-core.mjs';
import { OPENING_LESSONS_HE } from './opening-lessons-he.ts';

export type PlanStep = { kind: 'opening'; openingId: string; lineIds: string[] } | { kind: 'endgame'; endgameId: string };
export type CourseId = 'openings' | 'endgames';
export type Screen = { fen: string; arrows: Array<[string, string]>; text: Bilingual };
export type LessonNode = { id: string; kind: 'lesson'; course: CourseId; title: string; white: boolean; screens: Screen[]; planned: boolean };
export type OpeningPractice = { id: string; kind: 'practice'; course: 'openings'; title: string; side: 'w' | 'b'; sans: string[]; planned: boolean };
export type EndgamePractice = { id: string; kind: 'practice'; course: 'endgames'; title: string; endgame: Endgame; planned: boolean };
export type PathNode = LessonNode | OpeningPractice | EndgamePractice;
export type NodeState = 'locked' | 'available' | 'done';

export const DEFAULT_OPENINGS = ['italian', 'qg', 'sicilian', 'french', 'carokann'];
const PRACTICE_PLIES = 12; // up to six of the user's own moves per opening line
const MAX_LINES_PER_STEP = 2;

// Hebrew screens: each run of moves/squares ("1.e4 e5 2.Nf3", "6.Nc3?") is kept left-to-right inside the RTL sentence
// (LRI…PDI isolates), so a line that starts with a move number does not render as "e4 e5 2.Nf3.1".
const ltrRuns = (he: string) => he.replace(/[A-Za-z0-9…][A-Za-z0-9…+#=!?.\-\/ ]*[A-Za-z0-9+#!?…]|[A-Za-z0-9]/g, run => `\u2066${run}\u2069`);
const same = (en: string): Bilingual => ({ he: OPENING_LESSONS_HE[en] ? ltrRuns(OPENING_LESSONS_HE[en]) : en, en });
/** First sentence of a text; a sentence ends at . ! or ? followed by a space and a capital letter. */
export function firstSentence(text: string): string {
  return String(text || '').trim().split(/(?<=[.!?])\s+(?=[A-Z\u0590-\u05FF])/)[0] || '';
}
function sentences(text: string): string[] {
  return String(text || '').trim().split(/(?<=[.!?])\s+/).filter(Boolean);
}

function openingNodes(Chess: any, op: any, line: any, planned: boolean): PathNode[] {
  const sans: string[] = line.moves.slice(0, PRACTICE_PLIES).map((m: any) => m[0]);
  const notes: Array<string | undefined> = line.moves.slice(0, PRACTICE_PLIES).map((m: any) => m[1]);
  const game = new Chess();
  const screens: Screen[] = [];
  const startFen = game.fen();
  const first = game.move(sans[0]);
  screens.push({ fen: startFen, arrows: [[first.from, first.to]], text: same(firstSentence(op.oneLiner) || `${op.name}: ${line.name}.`) });
  for (let i = 1; i < sans.length && screens.length < 4; i++) {
    const before = game.fen();
    const mv = game.move(sans[i]);
    if (notes[i]) screens.push({ fen: before, arrows: [[mv.from, mv.to]], text: same(firstSentence(notes[i])) });
  }
  if (screens.length < 2) screens.push({ fen: game.fen(), arrows: [], text: same(firstSentence(line.idea) || 'Now play the line yourself.') });
  const base = `o:${op.id}:${line.id}`;
  const title = `${op.name}: ${line.name}`;
  return [
    { id: base + ':l', kind: 'lesson', course: 'openings', title, white: op.color !== 'b', screens, planned },
    { id: base + ':p', kind: 'practice', course: 'openings', title, side: op.color === 'b' ? 'b' : 'w', sans, planned },
  ];
}

function endgameNodes(eg: Endgame, planned: boolean): PathNode[] {
  const goal = GOAL_LABEL[eg.goal];
  const he = sentences(eg.hint.he); const en = sentences(eg.hint.en);
  const screens: Screen[] = [{ fen: eg.fen, arrows: [], text: { he: `${eg.name.he} \u2014 המטרה: ${goal.he}.`, en: `${eg.name.en} \u2014 goal: ${goal.en.toLowerCase()}.` } }];
  for (let i = 0; i < Math.max(he.length, en.length) && screens.length < 4; i++) {
    screens.push({ fen: eg.fen, arrows: [], text: { he: he[i] || en[i], en: en[i] || he[i] } });
  }
  return [
    { id: `e:${eg.id}:l`, kind: 'lesson', course: 'endgames', title: eg.name.en, white: eg.side === 'white', screens, planned },
    { id: `e:${eg.id}:p`, kind: 'practice', course: 'endgames', title: eg.name.en, endgame: eg, planned },
  ];
}

/**
 * Builds both courses. An optional ordered plan (the shape buildDnaPlan returns as plan.steps) puts its openings/lines and
 * endgames first, in plan order, marked planned; unknown ids are skipped; the rest of the course follows unchanged.
 */
export function buildCourses(Chess: any, repertoire: any[], plan: PlanStep[] = []): Record<CourseId, PathNode[]> {
  const byId = new Map((repertoire || []).map((op: any) => [op.id, op]));
  const openings: PathNode[] = []; const usedOpenings = new Set<string>();
  for (const step of plan || []) {
    if (step?.kind !== 'opening' || usedOpenings.has(step.openingId)) continue;
    const op = byId.get(step.openingId); if (!op) continue;
    const wanted = (step.lineIds || []).map(id => op.lines.find((l: any) => l.id === id)).filter(Boolean).slice(0, MAX_LINES_PER_STEP);
    const lines = wanted.length ? wanted : coreLines(op).slice(0, 1);
    if (!lines.length) continue;
    usedOpenings.add(op.id);
    for (const line of lines) openings.push(...openingNodes(Chess, op, line, true));
  }
  for (const id of DEFAULT_OPENINGS) {
    const op = byId.get(id); const line = op && coreLines(op)[0];
    if (line && !usedOpenings.has(id)) openings.push(...openingNodes(Chess, op, line, false));
  }
  const planEndgames = (plan || []).filter(s => s?.kind === 'endgame').map(s => (s as any).endgameId as string);
  const egOrder = [...new Set(planEndgames)].map(id => ENDGAMES.find(e => e.id === id)).filter(Boolean) as Endgame[];
  const endgames = [...egOrder.flatMap(eg => endgameNodes(eg, true)), ...ENDGAMES.filter(eg => !egOrder.includes(eg)).flatMap(eg => endgameNodes(eg, false))];
  return { openings, endgames };
}

/** Sequential unlocking: a node is available once the node above it is done. */
export function nodeStates(nodes: PathNode[], done: Iterable<string>): NodeState[] {
  const finished = new Set(done);
  return nodes.map((node, i) => finished.has(node.id) ? 'done' : (i === 0 || finished.has(nodes[i - 1].id)) ? 'available' : 'locked');
}

/** "What to do next": the first planned node the user can open now, else null. */
export function nextPlannedNode(nodes: PathNode[], done: Iterable<string>): PathNode | null {
  const states = nodeStates(nodes, done);
  return nodes.find((node, i) => node.planned && states[i] === 'available') || null;
}

export type EndgameResult = 'success' | 'fail' | null;
const PIECE_ORDER = 'qrbnp';
function material(fen: string, side: 'w' | 'b'): string {
  const board = fen.split(' ')[0];
  return [...board].filter(ch => /[a-z]/i.test(ch) && ch.toLowerCase() !== 'k' && (side === 'w') === (ch === ch.toUpperCase())).map(c => c.toLowerCase()).sort((x, y) => PIECE_ORDER.indexOf(x) - PIECE_ORDER.indexOf(y)).join('');
}
export const DEFEND_MOVES = 12;
export const MAX_ATTACK_MOVES = 60;

/**
 * Judges an endgame practice position after a full move (the user's move and, if any, the bot's reply).
 * mate: success on checkmate by the user. promote / win: success once the user promotes.
 * draw (the user defends): success after DEFEND_MOVES own moves, or a drawn position, without losing material.
 * Any side: losing material (fewer pieces than the start) or an unwanted draw/stalemate is a fail; so is running past MAX_ATTACK_MOVES.
 */
export function endgameResult(Chess: any, eg: Endgame, fen: string, ownMoves: number): EndgameResult {
  const me: 'w' | 'b' = eg.side === 'white' ? 'w' : 'b';
  const them: 'w' | 'b' = me === 'w' ? 'b' : 'w';
  const game = new Chess(fen);
  const turn = fen.split(' ')[1];
  const startMine = material(eg.fen, me); const mine = material(fen, me);
  const promoted = mine.replace(/p/g, '').length > startMine.replace(/p/g, '').length;
  const lostMaterial = !promoted && mine.length < startMine.length;
  if (game.isCheckmate()) return turn === them ? (eg.goal === 'draw' ? 'fail' : 'success') : 'fail';
  if (eg.goal === 'draw') {
    if (lostMaterial || material(fen, them).replace(/p/g, '').length > material(eg.fen, them).replace(/p/g, '').length) return 'fail';
    if (game.isDraw() || !material(fen, them).includes('p')) return 'success';
    return ownMoves >= DEFEND_MOVES ? 'success' : null;
  }
  if (lostMaterial || game.isDraw()) return 'fail';
  if ((eg.goal === 'promote' || eg.goal === 'win') && promoted) return 'success';
  return ownMoves >= MAX_ATTACK_MOVES ? 'fail' : null;
}
