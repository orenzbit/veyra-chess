// Rendering for opening-trap warnings: review-page card + move mark, and the one-shot bot-game banner.
import { getLang } from './i18n.js';
import { matchTrap, type OpeningTrap } from './opening-traps.js';

const h = React.createElement;

export const TRAP_MARK_TITLE = 'מלכודת פתיחה / Opening trap';

export interface BotTrapNotice { trap: OpeningTrap; victimIsPlayer: boolean }

function pick(text: { he: string; en: string }): string {
  return getLang() === 'en' ? text.en : text.he;
}

// The review move list asks once per rendered move, so remember the answer per history array.
const reviewCache = new WeakMap<object, { index: number; trap: OpeningTrap } | null>();
export function reviewTrapHit(history: Array<{ san?: string }>): { index: number; trap: OpeningTrap } | null {
  if (!Array.isArray(history) || !history.length) return null;
  if (reviewCache.has(history)) return reviewCache.get(history) || null;
  const found = matchTrap(history.map(move => String(move?.san ?? '')));
  const hit = found && found.reached ? { index: found.trap.victimPly - 1, trap: found.trap } : null;
  reviewCache.set(history, hit);
  return hit;
}

export function trapMoveMark(history: Array<{ san?: string }>, index: number) {
  const hit = reviewTrapHit(history);
  if (!hit || hit.index !== index) return null;
  return h('span', { className: 'trap-mark', title: TRAP_MARK_TITLE, 'aria-label': TRAP_MARK_TITLE, role: 'img' }, '⚠');
}

export function OpeningTrapCard({ history, selected }: { history: Array<{ san?: string }>; selected: number }) {
  const hit = reviewTrapHit(history);
  if (!hit || selected < hit.index) return null;
  const en = getLang() === 'en';
  return h('div', { className: 'trap-card', role: 'note', dir: en ? 'ltr' : 'rtl' },
    h('b', { className: 'trap-card-title' }, en ? '⚠ Opening trap: ' : '⚠ מלכודת פתיחה: '),
    h('span', { className: 'trap-card-name' }, pick(hit.trap.name)),
    ' — ',
    h('span', { className: 'trap-card-text' }, pick(hit.trap.explanation)));
}

// Banner info for the move that just made the history reach a trap's victim ply (null otherwise).
export function botTrapNotice(sanHistory: string[], playerColor: 'w' | 'b'): BotTrapNotice | null {
  const found = matchTrap(sanHistory);
  if (!found || !found.reached || found.trap.victimPly !== sanHistory.length) return null;
  return { trap: found.trap, victimIsPlayer: found.trap.victim === playerColor };
}

export function OpeningTrapBanner({ notice, onClose }: { notice: BotTrapNotice; onClose: () => void }) {
  const en = getLang() === 'en';
  const { trap, victimIsPlayer } = notice;
  const lead = victimIsPlayer
    ? (en ? '⚠ You walked into a trap: ' : '⚠ נפלת במלכודת: ')
    : (en ? '🎯 The bot fell into a trap: ' : '🎯 הבוט נפל במלכודת: ');
  const tail = victimIsPlayer ? pick(trap.explanation) : (en ? 'look for the punishment' : 'חפש את העונש');
  return h('div', { className: 'trap-banner ' + (victimIsPlayer ? 'trap-banner-player' : 'trap-banner-bot'), role: 'status', 'aria-live': 'polite', dir: en ? 'ltr' : 'rtl' },
    h('p', { className: 'trap-banner-text' }, h('b', null, lead), pick(trap.name), ' — ', tail),
    h('button', { type: 'button', className: 'trap-banner-close', 'aria-label': en ? 'Dismiss' : 'סגור', title: en ? 'Dismiss' : 'סגור', onClick: onClose }, '✕'));
}
