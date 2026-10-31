// Single source of truth for how a review move classification looks: color, labels and a white inline SVG icon.
// Icons are drawn here (viewBox 0 0 24 24, white), so no image files, fonts or emoji are needed.
// Classification keys and the analysis that produces them live in review-metrics.ts and are not touched.

export type MoveClassKey = 'brilliant' | 'great' | 'best' | 'excellent' | 'good' | 'book' | 'inaccuracy' | 'mistake' | 'blunder' | 'miss' | 'forced';
export type MoveClassLang = 'he' | 'en';

export interface MoveClassStyle {
  color: string;
  he: string;
  en: string;
}

export const MOVE_CLASS_STYLE: Record<MoveClassKey, MoveClassStyle> = {
  brilliant: { color: '#1baca6', he: 'מבריק', en: 'Brilliant' },
  great: { color: '#5b8baf', he: 'מצוין', en: 'Great' },
  best: { color: '#81b64c', he: 'הטוב ביותר', en: 'Best' },
  excellent: { color: '#95b776', he: 'מעולה', en: 'Excellent' },
  good: { color: '#95a370', he: 'טוב', en: 'Good' },
  book: { color: '#a88865', he: 'ספר', en: 'Book' },
  inaccuracy: { color: '#f7c045', he: 'אי-דיוק', en: 'Inaccuracy' },
  mistake: { color: '#ffa459', he: 'טעות', en: 'Mistake' },
  blunder: { color: '#fa412d', he: 'שגיאה גסה', en: 'Blunder' },
  miss: { color: '#ee6b55', he: 'החמצה', en: 'Miss' },
  forced: { color: '#6b6964', he: 'כפוי', en: 'Forced' }
};

export const MOVE_CLASS_KEYS = Object.keys(MOVE_CLASS_STYLE) as MoveClassKey[];

const W = '#fff';
const STROKE = `fill="none" stroke="${W}" stroke-linecap="round" stroke-linejoin="round"`;

// "?" and "!" glyphs are drawn as paths around x=0 (y 4..20) and placed with a transform.
const QUESTION = `<path d="M-3.4 7.6a3.4 3.4 0 1 1 5.6 2.6c-1.3 1-2.2 1.7-2.2 3.4" ${STROKE} stroke-width="2.6"/><circle cx="0" cy="18.4" r="1.5" fill="${W}"/>`;
const EXCLAIM = `<path d="M0 5.5V13.8" ${STROKE} stroke-width="2.8"/><circle cx="0" cy="18.4" r="1.5" fill="${W}"/>`;
const glyph = (shape: string, x: number, scale: number) => `<g transform="translate(${x} 12) scale(${scale}) translate(0 -12)">${shape}</g>`;

const ICONS: Record<MoveClassKey, string> = {
  brilliant: `<polygon points="13.2 2 5 13.6 11 13.6 10 22 19 10.4 13 10.4" fill="${W}" stroke="${W}" stroke-width="0.8" stroke-linejoin="miter"/>`,
  great: `<path d="M2.2 12.8l3.2 3.6 6-8.2M12 12.8l3.2 3.6 6-8.2" ${STROKE} stroke-width="2.4"/>`,
  best: `<path d="M5 12.5l4.5 4.8 9.5-10.6" ${STROKE} stroke-width="3"/>`,
  excellent: `<path d="M5 12.5l4.5 4.8 9.5-10.6" ${STROKE} stroke-width="3"/>`,
  good: `<circle cx="12" cy="12" r="4.6" fill="${W}"/>`,
  book: `<path d="M11.4 7C9.5 5.6 6.8 5 3.5 5.4v12.2c3.3-.4 6 .2 7.9 1.6z" fill="${W}"/><path d="M12.6 7c1.9-1.4 4.6-2 7.9-1.6v12.2c-3.3-.4-6 .2-7.9 1.6z" fill="${W}"/>`,
  inaccuracy: glyph(QUESTION, 8.2, 0.8) + glyph(EXCLAIM, 16.8, 0.8),
  mistake: glyph(QUESTION, 12, 1),
  blunder: glyph(QUESTION, 7.4, 0.8) + glyph(QUESTION, 16.6, 0.8),
  miss: `<path d="M6.6 6.6l10.8 10.8M17.4 6.6L6.6 17.4" ${STROKE} stroke-width="3"/>`,
  forced: `<path d="M8.4 10.6V8a3.6 3.6 0 0 1 7.2 0v2.6" ${STROKE} stroke-width="2.4"/><rect x="5.4" y="10.6" width="13.2" height="10" rx="2.2" fill="${W}"/><circle cx="12" cy="14.8" r="1.5" fill="currentColor"/><rect x="11.3" y="15" width="1.4" height="3.2" rx=".6" fill="currentColor"/>`
};

/** Known key, or "good" for anything unknown (the same fallback the review always used). */
export function moveClassKey(key?: string | null): MoveClassKey {
  return key && Object.prototype.hasOwnProperty.call(MOVE_CLASS_STYLE, key) ? (key as MoveClassKey) : 'good';
}

export function moveClassStyle(key?: string | null): MoveClassStyle {
  return MOVE_CLASS_STYLE[moveClassKey(key)];
}

export function moveClassLabel(key: string | null | undefined, lang: MoveClassLang = 'he'): string {
  const style = moveClassStyle(key);
  return lang === 'en' ? style.en : style.he;
}

/** White inline SVG icon (markup string, no external references). Uses currentColor only for the padlock keyhole. */
export function moveClassIconSvg(key?: string | null): string {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[moveClassKey(key)]}</svg>`;
}

export interface MoveClassBadgeOptions {
  size?: number;
  lang?: MoveClassLang;
  className?: string;
  decorative?: boolean;
}

const escapeAttr = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** Props for a round badge span: classification color, thin white border, white icon centered. */
export function moveClassBadgeProps(key: string | null | undefined, options: MoveClassBadgeOptions = {}) {
  const style = moveClassStyle(key);
  const label = moveClassLabel(key, options.lang);
  const props: Record<string, unknown> = {
    className: ['move-class-badge', options.className].filter(Boolean).join(' '),
    style: { '--mcb-color': style.color, ...(options.size ? { '--mcb-size': `${options.size}px` } : {}) },
    'data-class': moveClassKey(key),
    dangerouslySetInnerHTML: { __html: moveClassIconSvg(key) }
  };
  if (options.decorative) props['aria-hidden'] = 'true';
  else Object.assign(props, { role: 'img', title: label, 'aria-label': label });
  return props;
}

export function moveClassBadge(key: string | null | undefined, options: MoveClassBadgeOptions = {}) {
  return React.createElement('span', moveClassBadgeProps(key, options));
}

/** Same badge as an HTML string, for the imperative board overlay. */
export function moveClassBadgeHtml(key: string | null | undefined, options: MoveClassBadgeOptions = {}): string {
  const style = moveClassStyle(key);
  const label = escapeAttr(moveClassLabel(key, options.lang));
  const vars = `--mcb-color:${style.color};${options.size ? `--mcb-size:${options.size}px` : ''}`;
  const cls = ['move-class-badge', options.className].filter(Boolean).join(' ');
  const a11y = options.decorative ? 'aria-hidden="true"' : `role="img" title="${label}" aria-label="${label}"`;
  return `<span class="${escapeAttr(cls)}" style="${vars}" data-class="${moveClassKey(key)}" ${a11y}>${moveClassIconSvg(key)}</span>`;
}
