// "What to do next": the first steps of a DNA plan (src/dna-plan.ts), each mapped to the place a button opens.
// Pure (no DOM): an opening or endgame step opens its Learn node (the lesson first, the practice once the lesson
// is done); a high blunder/miss rate adds a puzzles step. Finished steps are skipped.
import type { DnaPlan, PlanProgress } from './dna-plan.ts';
import type { CourseId, PathNode } from './learning-path.ts';

export type Bilingual = { en: string; he: string };
export type NextStep =
  | { target: 'node'; course: CourseId; nodeId: string; action: 'lesson' | 'practice'; title: string; reason: Bilingual }
  | { target: 'puzzles'; title: string; reason: Bilingual };

export const MAX_NEXT_STEPS = 3;
/** Blunders plus missed wins per 100 of the player's moves at which tactics puzzles join the steps. */
export const PUZZLES_AT_PER_100 = 2;

/** Learn progress (finished node ids) in the shape buildDnaPlan reads: a line or endgame counts once its practice is done. */
export function planProgress(done: Iterable<string>): PlanProgress {
  const openingLines: string[] = []; const endgames: string[] = [];
  for (const id of done) {
    const o = /^o:([^:]+):([^:]+):p$/.exec(id); if (o) openingLines.push(o[1] + ':' + o[2]);
    const e = /^e:([^:]+):p$/.exec(id); if (e) endgames.push(e[1]);
  }
  return { openingLines, endgames };
}

/** Up to `max` steps from the plan, in plan order; null plan, an unpersonalised plan or no matching node gives []. */
export function dnaNextSteps(plan: DnaPlan | null | undefined, courses: Record<CourseId, PathNode[]> | null, doneInput: Iterable<string>, max = MAX_NEXT_STEPS): NextStep[] {
  if (!plan?.personalised || !courses) return [];
  const done = new Set(doneInput);
  const all = [...courses.openings, ...courses.endgames];
  const steps: NextStep[] = [];
  for (const step of plan.steps) {
    const prefixes = step.kind === 'opening' ? step.lineIds.map(id => `o:${step.openingId}:${id}:`) : [`e:${step.endgameId}:`];
    const node = all.find(n => prefixes.some(p => n.id.startsWith(p)) && !done.has(n.id));
    if (!node) continue;
    steps.push({ target: 'node', course: node.course, nodeId: node.id, action: node.kind, title: node.title, reason: step.reason });
  }
  const tactics = (plan.signals.blundersPer100 ?? 0) + (plan.signals.missesPer100 ?? 0);
  if (tactics >= PUZZLES_AT_PER_100) {
    const per100 = Math.round(tactics * 10) / 10;
    // After the first plan step: the plan's top item stays first, tactics come before the rest.
    steps.splice(Math.min(1, steps.length), 0, { target: 'puzzles', title: 'Puzzles', reason: {
      en: `${per100} blunders or missed wins per 100 of your moves: tactics puzzles train exactly that.`,
      he: `${per100} טעויות גסות או ניצחונות שהוחמצו לכל 100 מסעים שלך: פאזלים טקטיים מאמנים בדיוק את זה.` } });
  }
  return steps.slice(0, max);
}
