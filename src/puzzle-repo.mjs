// Veyra puzzle repository — local-first store with spaced repetition.
// Original MIT code, zero dependencies. localStorage guarded (memory fallback in Node).
const mem = {};
function lsGet(k) {
  try {
    if (typeof localStorage !== 'undefined') {
      const v = localStorage.getItem(k);
      if (v != null) return v;
    }
  } catch (error) { console.warn('Unable to read puzzle store from localStorage; using fallback storage.', error); }
  return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null;
}
function lsSet(k, v) {
  try {
    if (typeof localStorage !== 'undefined') { localStorage.setItem(k, v); return; }
  } catch (error) { console.warn('Unable to write puzzle store to localStorage; using fallback storage.', error); }
  mem[k] = v;
}

export const STORE_KEY = 'veyra_puzzles_v1';
export const MAX_PUZZLES = 1000;
const DUE_STEPS_DAYS = [1, 3, 7, 14, 30];

export function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export function hashPuzzleId(fen, solution) {
  return fnv1a(fen + '|' + solution.join(' ')) + fnv1a(solution.join(' ') + '|' + fen);
}

export function freshStats() {
  return { shown: 0, solved: 0, fails: 0, nextDue: new Date().toISOString(), streak: 0 };
}

export function emptyStore() { return { version: 1, puzzles: {}, order: [] }; }

export function loadStore() {
  try {
    const raw = lsGet(STORE_KEY);
    if (!raw) return emptyStore();
    const s = JSON.parse(raw);
    if (!s || s.version !== 1 || !s.puzzles || typeof s.puzzles !== 'object' || Array.isArray(s.puzzles)) {
      console.warn('Invalid puzzle store; using an empty store.');
      return emptyStore();
    }
    if (!Array.isArray(s.order)) s.order = Object.keys(s.puzzles);
    return s;
  } catch (error) { console.warn('Unable to load puzzle store; using an empty store.', error); return emptyStore(); }
}

export function saveStore(store) {
  try { lsSet(STORE_KEY, JSON.stringify(store)); }
  catch (error) { console.warn('Unable to serialize puzzle store.', error); }
}

export function addPuzzle(store, rec) {
  const id = rec.id || hashPuzzleId(rec.fen, rec.solution);
  if (store.puzzles[id]) return 'duplicate';
  store.puzzles[id] = Object.assign({}, rec, { id });
  store.order.push(id);
  if (store.order.length > MAX_PUZZLES) {
    let worst = store.order[0];
    for (const k of store.order) {
      const a = (store.puzzles[k].stats && store.puzzles[k].stats.nextDue) || '';
      const b = (store.puzzles[worst].stats && store.puzzles[worst].stats.nextDue) || '';
      if (a < b) worst = k;
    }
    delete store.puzzles[worst];
    store.order = store.order.filter((k) => k !== worst);
    saveStore(store);
    return 'evicted';
  }
  saveStore(store);
  return 'added';
}

export function getDuePuzzles(store, elo, limit) {
  const now = new Date().toISOString();
  const n = limit == null ? 20 : limit;
  return store.order
    .map((id) => store.puzzles[id])
    .filter((p) => p && ((p.stats && p.stats.nextDue) || '') <= now)
    .sort((a, b) => Math.abs(a.rating - elo) - Math.abs(b.rating - elo))
    .slice(0, n);
}

export function recordAttempt(store, id, solved) {
  const rec = store.puzzles[id];
  if (!rec) return;
  const st = rec.stats || (rec.stats = freshStats());
  st.shown++;
  if (solved) { st.solved++; st.streak++; }
  else { st.fails++; st.streak = 0; }
  const days = DUE_STEPS_DAYS[Math.min(st.streak, DUE_STEPS_DAYS.length - 1)];
  st.nextDue = new Date(Date.now() + days * 864e5).toISOString();
  saveStore(store);
}
