// One arrow style for every board arrow on game review and in the coach panel.
// Meaning is the same everywhere:
//   green  = a move by the side whose move you are looking at ("you"),
//   orange = a move by the other side (the reply / the threat),
//   red, dashed = the move that was actually played when it was a mistake (shown next to the better move),
//   full = the move to look at next, faded = the move that was just played.
// The geometry is pure (arrowShape) so it can be tested in Node; drawBoardArrows() puts it on the SVG layer.

export type ArrowWho = 'me' | 'opp';
export type BoardArrow = { from: string; to: string; who: ArrowWho; faded?: boolean; mistake?: boolean };
export type ArrowLegendKey = 'me' | 'opp' | 'mistake' | 'faded';

export const ARROW_COLOR: Record<ArrowWho | 'mistake', string> = {
  me: 'var(--arrow-me, #2f9e44)',
  opp: 'var(--arrow-opp, #e8590c)',
  mistake: 'var(--arrow-mistake, #e03131)',
};
export const ARROW_OPACITY = { full: 0.9, faded: 0.38, mistake: 0.75 };

export const ARROW_LEGEND_HE: Record<ArrowLegendKey, string> = {
  me: 'המהלך שלך והמשכו',
  opp: 'תשובת היריב',
  mistake: 'המהלך ששוחק (טעות)',
  faded: 'המהלך האחרון ששוחק',
};

export function arrowColor(a: BoardArrow): string { return a.mistake ? ARROW_COLOR.mistake : ARROW_COLOR[a.who]; }

/** Centre of a square in board pixels; `orient` is the side shown at the bottom. */
export function squareCenter(sq: string, size: number, orient: 'white' | 'black') {
  const s = size / 8; const file = sq.charCodeAt(0) - 97, rank = Number(sq[1]);
  return orient === 'white' ? { x: (file + 0.5) * s, y: (8 - rank + 0.5) * s } : { x: (7 - file + 0.5) * s, y: (rank - 0.5) * s };
}

/** The shaft and the triangular head of one arrow, in board pixels. Same proportions as the coach arrows. */
export function arrowShape(from: string, to: string, size: number, orient: 'white' | 'black') {
  const sq = size / 8; const f = squareCenter(from, size, orient), t = squareCenter(to, size, orient);
  const dx = t.x - f.x, dy = t.y - f.y, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
  const head = sq * 0.34, width = sq * 0.13;
  const bx = t.x - ux * head, by = t.y - uy * head;
  return {
    x1: f.x, y1: f.y, x2: t.x - ux * head * 0.9, y2: t.y - uy * head * 0.9, width, head,
    points: [[t.x, t.y], [bx - uy * head * 0.6, by + ux * head * 0.6], [bx + uy * head * 0.6, by - ux * head * 0.6]] as [number, number][],
  };
}

/** Which legend entries the arrows on the board need (in a fixed order). */
export function legendFor(arrows: BoardArrow[]): ArrowLegendKey[] {
  const keys = new Set<ArrowLegendKey>();
  for (const a of arrows) { if (a.mistake) keys.add('mistake'); else if (a.faded) keys.add('faded'); else keys.add(a.who); }
  return (['me', 'opp', 'mistake', 'faded'] as ArrowLegendKey[]).filter(k => keys.has(k));
}

/**
 * The arrows of the normal review board at one move.
 * The board shows the position AFTER the selected move, so the move itself is the faded arrow.
 * The engine's better move belongs to the position BEFORE the move: it is drawn only in the "best" mode,
 * and then the board shows the position before the move (`before: true`), with the played move in red.
 */
export function reviewArrows(o: { played: string | null; bestUci?: string | null; afterBestUci?: string | null; mode: string }): { before: boolean; arrows: BoardArrow[] } {
  const sq = (u: string) => ({ from: u.slice(0, 2), to: u.slice(2, 4) });
  const played = o.played ? sq(o.played) : null;
  const sameAsBest = !!(o.played && o.bestUci && o.played.slice(0, 4) === o.bestUci.slice(0, 4));
  if (o.mode === 'best' && o.bestUci) {
    const arrows: BoardArrow[] = [];
    if (played && !sameAsBest) arrows.push({ ...played, who: 'me', mistake: true });
    arrows.push({ ...sq(o.bestUci), who: 'me' });
    return { before: true, arrows };
  }
  const arrows: BoardArrow[] = [];
  if (played) arrows.push({ ...played, who: 'me', faded: true });
  if (o.mode === 'threat' && o.afterBestUci) arrows.push({ ...sq(o.afterBestUci), who: 'opp' });
  return { before: false, arrows };
}

/** Draw the arrows on the board's SVG layer (clears it first). `size` is the board's width in pixels. */
export function drawBoardArrows(svg: SVGSVGElement, arrows: BoardArrow[], size: number, orient: 'white' | 'black') {
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  const NS = 'http://www.w3.org/2000/svg';
  // Mistake arrows first, so the better move is drawn on top of it.
  const ordered = [...arrows].sort((a, b) => Number(!!b.mistake) - Number(!!a.mistake) || Number(!!b.faded) - Number(!!a.faded));
  for (const a of ordered) {
    const s = arrowShape(a.from, a.to, size, orient); const color = arrowColor(a);
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'coach-arrow board-arrow' + (a.faded ? ' faded' : '') + (a.mistake ? ' mistake' : ''));
    g.setAttribute('data-from', a.from); g.setAttribute('data-to', a.to); g.setAttribute('data-who', a.mistake ? 'mistake' : a.who);
    g.setAttribute('opacity', String(a.mistake ? ARROW_OPACITY.mistake : a.faded ? ARROW_OPACITY.faded : ARROW_OPACITY.full));
    const line = document.createElementNS(NS, 'line');
    line.setAttribute('x1', String(s.x1)); line.setAttribute('y1', String(s.y1)); line.setAttribute('x2', String(s.x2)); line.setAttribute('y2', String(s.y2));
    line.setAttribute('stroke', color); line.setAttribute('stroke-width', String(s.width)); line.setAttribute('stroke-linecap', a.mistake ? 'butt' : 'round');
    if (a.mistake) line.setAttribute('stroke-dasharray', `${s.width * 1.1} ${s.width * 0.8}`);
    const poly = document.createElementNS(NS, 'polygon');
    poly.setAttribute('points', s.points.map(p => p.join(',')).join(' ')); poly.setAttribute('fill', color);
    g.append(line, poly); svg.appendChild(g);
  }
  svg.setAttribute('data-arrows', String(arrows.length));
}

const h = (...args: any[]) => (React.createElement as any)(...args); // React is the page's global; read at render time

/** A one-line legend under the board: only the colours that are on the board right now. */
export function ArrowLegend({ arrows }: { arrows: BoardArrow[] }) {
  const keys = legendFor(arrows); if (!keys.length) return null;
  // The faded swatch takes the colour of the faded arrow that is on the board (his move or the opponent's).
  const fadedColor = ARROW_COLOR[arrows.find(a => a.faded && !a.mistake)?.who || 'me'];
  const col = (k: ArrowLegendKey) => (k === 'faded' ? fadedColor : ARROW_COLOR[k as ArrowWho | 'mistake']);
  return h('div', { className: 'arrow-legend', dir: 'rtl', 'data-arrow-legend': keys.join(',') },
    keys.map(k => h('span', { key: k, className: 'arrow-legend-item', 'data-legend': k },
      h('svg', { className: 'arrow-legend-swatch', width: 28, height: 12, viewBox: '0 0 28 12', 'aria-hidden': 'true' },
        h('line', { x1: 2, y1: 6, x2: 19, y2: 6, stroke: col(k), strokeWidth: 4, strokeLinecap: k === 'mistake' ? 'butt' : 'round', strokeDasharray: k === 'mistake' ? '4 3' : undefined, opacity: k === 'faded' ? ARROW_OPACITY.faded : 1 }),
        h('polygon', { points: '27,6 18,1 18,11', fill: col(k), opacity: k === 'faded' ? ARROW_OPACITY.faded : 1 })),
      ARROW_LEGEND_HE[k])));
}
