type BadgeLang = 'he' | 'en';

const h = React.createElement;
const MAX_MATERIAL = 99;

/** Whole pawns of material from a saved analysis row, or 0 when the row has no usable `sacrifice` (old analyses). */
export function sacrificeMaterial(move: unknown): number {
  const value = (move as { sacrifice?: { material?: unknown } } | null | undefined)?.sacrifice?.material;
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return value >= 1 ? Math.min(MAX_MATERIAL, Math.round(value)) : 0;
}

export function sacrificeBadgeText(lang: BadgeLang): string {
  return lang === 'en' ? '♟ Sacrifice' : '♟ הקרבה';
}

export function sacrificeBadgeTitle(material: number, lang: BadgeLang): string {
  if (lang === 'en') return `Sacrifice of ${material} ${material === 1 ? 'point' : 'points'} of material`;
  return material === 1 ? 'הקרבה של נקודת חומר אחת' : `הקרבה של ${material} נקודות חומר`;
}

/** Badge for a successful material sacrifice in a review move; null when the move has none. */
export function sacrificeBadge(move: unknown, lang: BadgeLang) {
  const material = sacrificeMaterial(move);
  if (!material) return null;
  const title = sacrificeBadgeTitle(material, lang);
  return h('span', { className: 'sacrifice-badge', role: 'img', title, 'aria-label': title, 'data-material': String(material) }, sacrificeBadgeText(lang));
}
