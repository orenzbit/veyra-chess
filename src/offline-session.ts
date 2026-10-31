// Offline session fallback: after one signed-in visit the app can start without a network.
// The snapshot is only a hint for the UI (id and a display name). It never holds tokens, cookies or
// emails, and the server APIs stay the authority: whenever the network is back the normal session
// check runs again and replaces or clears it.
import { getLang } from './i18n.js';

declare const React: any;

export const OFFLINE_SESSION_KEY = 'veyra_offline_session_v1';
export const OFFLINE_SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const BANNER_ID = 'offline-session-banner';

export type OfflineSession = { id: string; name: string; savedAt: number };

function storage(): Storage | null {
  try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; }
}

export function saveOfflineSession(user: any, now: number = Date.now(), store: Storage | null = storage()) {
  if (!store || !user || typeof user.id !== 'string' || !user.id) return;
  const meta = user.metadata && typeof user.metadata === 'object' ? user.metadata : {};
  const name = [meta.username, meta.display_name, meta.name].find(v => typeof v === 'string' && v) || '';
  const snapshot: OfflineSession = { id: user.id, name: String(name).slice(0, 60), savedAt: now };
  try { store.setItem(OFFLINE_SESSION_KEY, JSON.stringify(snapshot)); } catch {}
}

export function clearOfflineSession(store: Storage | null = storage()) {
  try { store?.removeItem(OFFLINE_SESSION_KEY); } catch {}
}

// The user object the app expects (no email), or null when there is no fresh snapshot.
export function readOfflineSession(now: number = Date.now(), store: Storage | null = storage()) {
  if (!store) return null;
  try {
    const raw = JSON.parse(store.getItem(OFFLINE_SESSION_KEY) || 'null');
    if (!raw || typeof raw.id !== 'string' || !raw.id || typeof raw.savedAt !== 'number') return null;
    const age = now - raw.savedAt;
    if (!(age >= 0 && age < OFFLINE_SESSION_MAX_AGE_MS)) return null;
    return { id: raw.id, metadata: raw.name ? { username: String(raw.name) } : {}, offline: true };
  } catch {
    return null;
  }
}

// getJson/postJson report a rejected fetch (no network) as status 0; HTTP errors keep their status.
export function isNetworkFailure(result: any): boolean {
  return Boolean(result) && result.ok === false && result.status === 0;
}

export function offlineBannerText(lang: 'he' | 'en') {
  return lang === 'en'
    ? 'Offline mode — only bot games and local content are available'
    : 'מצב לא מקוון — זמינים רק משחק מול בוטים ותכנים מקומיים';
}

export function offlineLogoutText(lang: 'he' | 'en') {
  return lang === 'en' ? 'You are offline. Sign out once you are back online.' : 'אין חיבור לאינטרנט. אפשר להתנתק כשהחיבור יחזור.';
}

export function showOfflineBanner(visible: boolean, lang: 'he' | 'en' = getLang()) {
  if (typeof document === 'undefined') return;
  let el = document.getElementById(BANNER_ID);
  if (!visible) { el?.remove(); return; }
  if (!el) {
    el = document.createElement('div');
    el.id = BANNER_ID;
    el.setAttribute('role', 'status');
    el.style.cssText = 'position:fixed;left:8px;right:8px;bottom:8px;z-index:2147483000;margin:0 auto;max-width:520px;padding:8px 12px;border-radius:10px;'
      + 'background:var(--surface-pearl,#1a1713);color:var(--primary-focus,#ffad66);border:1px solid var(--primary,#ed882d);'
      + 'font-size:13px;line-height:1.4;text-align:center;box-shadow:0 2px 10px rgba(0,0,0,.5)';
    document.body.appendChild(el);
  }
  el.dir = lang === 'he' ? 'rtl' : 'ltr';
  el.textContent = offlineBannerText(lang);
}

// Shown instead of the setup page when the network is down and there is no saved session.
export function OfflineRequiredPage({ LangButton }: { LangButton: any }) {
  const en = getLang() === 'en';
  const h = React.createElement;
  return h('div', { className: 'app-shell auth-shell' },
    h('div', { className: 'auth-top-controls' }, h(LangButton)),
    h('main', { className: 'content auth-page' },
      h('section', { className: 'auth-card' },
        h('h1', null, en ? 'No internet connection' : 'אין חיבור לאינטרנט'),
        h('p', null, en
          ? 'Connect to the internet to sign in. After you have signed in once, bot games also work offline.'
          : 'צריך חיבור לאינטרנט כדי להתחבר. אחרי שהתחברת פעם אחת, אפשר גם לשחק מול בוטים ללא חיבור.'),
        h('button', { onClick: () => window.location.reload() }, en ? 'Try again' : 'נסה שוב'))));
}
