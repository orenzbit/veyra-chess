-- Google sign-in (behind GOOGLE_SIGNIN_ENABLED): Supabase Auth links a Google login to an existing
-- account with the same email. Veyra does not link accounts by email alone, so the server removes
-- that just-linked identity again. Only removes it when the user has another identity; service role only.
create or replace function public.auth_unlink_identity(p_user_id uuid, p_provider text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed integer := 0;
begin
  if p_user_id is null or p_provider is null or p_provider = 'email' then
    return 0;
  end if;
  delete from auth.identities i
  where i.user_id = p_user_id
    and i.provider = p_provider
    and exists (select 1 from auth.identities o where o.user_id = p_user_id and o.provider <> p_provider);
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function public.auth_unlink_identity(uuid, text) from public, anon, authenticated;
grant execute on function public.auth_unlink_identity(uuid, text) to service_role;
