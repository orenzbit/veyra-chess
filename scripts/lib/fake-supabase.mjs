// In-memory fake of the PostgREST subset used by the puzzle engine. Test helper only.
// Supports: GET (eq, in, is.null, lt, lte, gt, gte, or=(...), order, limit, offset), POST (+on_conflict,
// Prefer resolution/return), PATCH, DELETE, the unique keys of the puzzle tables and the one-active-job index.
import crypto from 'node:crypto';

const KEYS = {
  user_puzzles: ['user_id', 'puzzle_id'],
  user_puzzle_state: ['user_id'],
  puzzle_attempts: ['id'],
  puzzle_rush_runs: ['id'],
  puzzle_game_log: ['user_id', 'game_key'],
  puzzle_jobs: ['id'],
  user_app_state: ['user_id'],
  user_games: ['id'],
};

const DEFAULTS = {
  user_puzzles: () => ({ id: crypto.randomUUID(), accepted: [], played: '', motif: 'general', phase: 'middlegame', origin: 'harvest', source: {}, stats: {}, next_due: new Date().toISOString(), status: 'active', engine_version: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
  user_puzzle_state: () => ({ profile: {}, kits: {}, rush_best: 0, counters: {}, cursors: {}, updated_at: new Date().toISOString() }),
  puzzle_attempts: () => ({ via_alt: false, created_at: new Date().toISOString() }),
  puzzle_rush_runs: () => ({ puzzle_ids: [], created_at: new Date().toISOString() }),
  puzzle_jobs: () => ({ id: crypto.randomUUID(), status: 'queued', params: {}, progress: {}, result: {}, error: null, lease_until: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
  puzzle_game_log: () => ({ analyzed_at: new Date().toISOString(), plies_scanned: 0, candidates: 0, puzzles_added: 0, skip_reason: null, engine_version: 1 }),
};

export class FakeHttpError extends Error {
  constructor(status, body) { super('Supabase ' + status); this.status = status; this.body = body; }
}

function parseList(text) {
  const inner = text.replace(/^\(/, '').replace(/\)$/, '');
  const out = [];
  let cur = ''; let q = false;
  for (let i = 0; i < inner.length; i += 1) {
    const ch = inner[i];
    if (q) {
      if (ch === '\\') { cur += inner[++i]; continue; }
      if (ch === '"') { q = false; continue; }
      cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { out.push(cur); cur = ''; } else cur += ch;
  }
  if (cur !== '' || inner.endsWith(',')) out.push(cur);
  return out;
}

function matchOne(row, col, expr) {
  const dot = expr.indexOf('.');
  const op = expr.slice(0, dot);
  const val = expr.slice(dot + 1);
  const cell = row[col];
  const s = cell === null || cell === undefined ? null : String(cell);
  switch (op) {
    case 'eq': return s === val;
    case 'in': return parseList(val).includes(s);
    case 'is': return val === 'null' ? s === null : String(s) === val;
    case 'lt': return s !== null && s < val;
    case 'lte': return s !== null && s <= val;
    case 'gt': return s !== null && s > val;
    case 'gte': return s !== null && s >= val;
    default: throw new Error('fake supabase: unsupported operator ' + op);
  }
}

function matches(row, params) {
  for (const [key, value] of params) {
    if (['select', 'order', 'limit', 'offset', 'on_conflict'].includes(key)) continue;
    if (key === 'or') {
      const parts = parseList(value);
      const ok = parts.some((part) => {
        const d = part.indexOf('.');
        return matchOne(row, part.slice(0, d), part.slice(d + 1));
      });
      if (!ok) return false;
    } else if (!matchOne(row, key, value)) return false;
  }
  return true;
}

export function createFakeSupabase() {
  const tables = {};
  const log = [];
  const rows = (name) => (tables[name] ||= []);

  async function db(path, options = {}) {
    const method = String(options.method || 'GET').toUpperCase();
    const [rawName, query = ''] = path.replace(/^\//, '').split('?');
    const table = rawName;
    if (!(table in KEYS)) throw new Error('fake supabase: unknown table ' + table);
    const params = [...new URLSearchParams(query).entries()];
    const get = (k) => params.find(([key]) => key === k)?.[1];
    const prefer = String(new Headers(options.headers || {}).get('Prefer') || '');
    const wantRows = prefer.includes('return=representation');
    log.push({ method, table, query });

    if (method === 'GET') {
      let list = rows(table).filter((r) => matches(r, params));
      const order = get('order');
      if (order) {
        const [col, dir] = order.split('.');
        list = list.slice().sort((a, b) => (String(a[col]) < String(b[col]) ? -1 : String(a[col]) > String(b[col]) ? 1 : 0) * (dir === 'desc' ? -1 : 1));
      }
      const off = Number(get('offset')) || 0;
      const lim = get('limit') === undefined ? list.length : Number(get('limit'));
      return structuredClone(list.slice(off, off + lim));
    }
    if (method === 'POST') {
      const body = JSON.parse(options.body);
      const items = Array.isArray(body) ? body : [body];
      const conflictCols = get('on_conflict') ? get('on_conflict').split(',') : null;
      const added = [];
      for (const item of items) {
        const row = { ...(DEFAULTS[table]?.() || {}), ...structuredClone(item) };
        if (table === 'puzzle_jobs' && ['queued', 'running'].includes(row.status) && rows(table).some((r) => r.user_id === row.user_id && ['queued', 'running'].includes(r.status))) {
          throw new FakeHttpError(409, { code: '23505', message: 'puzzle_jobs_one_active_idx' });
        }
        const keyCols = conflictCols || KEYS[table];
        const existing = rows(table).find((r) => keyCols.every((c) => String(r[c]) === String(row[c])));
        if (existing) {
          if (!conflictCols) throw new FakeHttpError(409, { code: '23505' });
          if (prefer.includes('merge-duplicates')) Object.assign(existing, item);
          continue;
        }
        rows(table).push(row);
        added.push(row);
      }
      return wantRows ? structuredClone(added) : null;
    }
    if (method === 'PATCH') {
      const patch = JSON.parse(options.body);
      const hit = rows(table).filter((r) => matches(r, params));
      for (const r of hit) Object.assign(r, structuredClone(patch));
      return wantRows ? structuredClone(hit) : null;
    }
    if (method === 'DELETE') {
      const keep = rows(table).filter((r) => !matches(r, params));
      tables[table] = keep;
      return null;
    }
    throw new Error('fake supabase: unsupported method ' + method);
  }
  db.tables = tables;
  db.rows = rows;
  db.log = log;
  db.seed = (table, list) => { for (const r of list) rows(table).push({ ...(DEFAULTS[table]?.() || {}), ...r }); };
  return db;
}
