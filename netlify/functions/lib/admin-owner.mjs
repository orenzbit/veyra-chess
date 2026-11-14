// The admin area belongs to the site owner's own user account only. Everyone else gets a plain 404, so it stays hidden.
// Allowlist: ADMIN_USER_EMAILS and/or ADMIN_USER_IDS (comma-separated). With neither set, ADMIN_EMAIL is used,
// the variable that already names the admin identity and receives access-request emails.
// The admin password (admin-auth.mjs) is optional: with ADMIN_PASSWORD_HASH set it is a second factor (reset it by setting
// a new hash from scripts/make-admin-hash.mjs); without it, the owner's own account alone opens admin.
import { json, requireAdmin } from '../_lib.mjs';
import { currentSession } from '../auth.mjs';

const list = (value) => String(value || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);

export function ownerSession(event) {
  const session = currentSession(event);
  if (!session?.user_id) return null;
  const ids = list(process.env.ADMIN_USER_IDS);
  const emails = list(process.env.ADMIN_USER_EMAILS || (ids.length ? '' : process.env.ADMIN_EMAIL));
  const email = String(session.email || '').trim().toLowerCase();
  return (email && emails.includes(email)) || ids.includes(String(session.user_id).toLowerCase()) ? session : null;
}

export const adminNotFound = () => json(404, { ok: false, error: 'not_found' }, { 'cache-control': 'no-store' });

export function adminAllowed(event) {
  const owner = ownerSession(event);
  if (!owner) return null;
  if (!process.env.ADMIN_PASSWORD_HASH) return { email: String(owner.email || '').toLowerCase(), exp: owner.exp };
  return requireAdmin(event);
}
