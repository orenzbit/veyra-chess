import { MOVE_CLASS_STYLE } from './move-class-style.ts';

export type TimelineMarkTone = 'brilliant' | 'great' | 'mistake' | 'blunder' | 'miss';

export interface TimelineMark {
  symbol: string;
  tone: TimelineMarkTone;
  labelHe: string;
  labelEn: string;
}

// Labels come from MOVE_CLASS_STYLE (single source); only the text symbol lives here.
const mark = (tone: TimelineMarkTone, symbol: string): TimelineMark => ({ symbol, tone, labelHe: MOVE_CLASS_STYLE[tone].he, labelEn: MOVE_CLASS_STYLE[tone].en });

const MARKS: Record<TimelineMarkTone, TimelineMark> = {
  brilliant: mark('brilliant', '!!'),
  great: mark('great', '!'),
  mistake: mark('mistake', '?'),
  blunder: mark('blunder', '??'),
  miss: mark('miss', '✗')
};

/** Mark shown on the review move strip; null keeps every non-notable classification unmarked. */
export function timelineMark(classification?: string | null): TimelineMark | null {
  if (!classification || !Object.prototype.hasOwnProperty.call(MARKS, classification)) return null;
  return { ...MARKS[classification as TimelineMarkTone] };
}
