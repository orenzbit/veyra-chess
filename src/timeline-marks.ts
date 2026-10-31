export type TimelineMarkTone = 'brilliant' | 'great' | 'mistake' | 'blunder' | 'miss';

export interface TimelineMark {
  symbol: string;
  tone: TimelineMarkTone;
  labelHe: string;
  labelEn: string;
}

const MARKS: Record<TimelineMarkTone, TimelineMark> = {
  brilliant: { symbol: '!!', tone: 'brilliant', labelHe: 'מהלך מבריק', labelEn: 'Brilliant' },
  great: { symbol: '!', tone: 'great', labelHe: 'מהלך מצוין', labelEn: 'Great move' },
  mistake: { symbol: '?', tone: 'mistake', labelHe: 'טעות', labelEn: 'Mistake' },
  blunder: { symbol: '??', tone: 'blunder', labelHe: 'טעות חמורה', labelEn: 'Blunder' },
  miss: { symbol: '✗', tone: 'miss', labelHe: 'החמצה', labelEn: 'Miss' }
};

/** Mark shown on the review move strip; null keeps every non-notable classification unmarked. */
export function timelineMark(classification?: string | null): TimelineMark | null {
  if (!classification || !Object.prototype.hasOwnProperty.call(MARKS, classification)) return null;
  return { ...MARKS[classification as TimelineMarkTone] };
}
