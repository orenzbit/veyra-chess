-- Real logout: server functions check that the Supabase Auth session behind a cookie still exists.
-- Logout (any scope) deletes the session row, so a copied cookie stops working at once.
-- Callable only with the server secret key; browser roles cannot read auth.sessions.
create or replace function public.auth_session_active(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.sessions s
    where s.id = p_session_id and (s.not_after is null or s.not_after > now())
  );
$$;
revoke all on function public.auth_session_active(uuid) from public, anon, authenticated;
grant execute on function public.auth_session_active(uuid) to service_role;
