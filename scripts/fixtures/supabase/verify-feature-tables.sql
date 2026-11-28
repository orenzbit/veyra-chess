-- Runs only against the disposable local test database.
do $$
declare t text; r text; op text;
begin
  foreach t in array array['user_puzzles','user_puzzle_state','puzzle_attempts','puzzle_rush_runs','puzzle_jobs','puzzle_game_log','user_chess_dna_games','user_chess_dna_reports','user_daily_streak_settings','user_daily_streak_events','user_evolution_state','public_oren_bot_versions'] loop
    if not exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=t and c.relrowsecurity) then
      raise exception 'missing table or RLS: %', t;
    end if;
    foreach op in array array['SELECT','INSERT','UPDATE','DELETE'] loop
      if not has_table_privilege('service_role','public.'||t,op) then raise exception 'missing server % on %',op,t; end if;
    end loop;
  end loop;
  for t in select tablename from pg_tables where schemaname='public' loop
    foreach r in array array['anon','authenticated'] loop
      foreach op in array array['SELECT','INSERT','UPDATE','DELETE'] loop
        if has_table_privilege(r,'public.'||t,op) then raise exception 'browser % on % for %',op,t,r; end if;
      end loop;
    end loop;
  end loop;
end $$;

insert into auth.users(id) values ('00000000-0000-4000-8000-000000000001');
set role service_role;
insert into public.telemetry_events(visitor_id,event_type) values ('test','app_open');
insert into public.adaptive_signals(visitor_id,principle) values ('test','opening');
insert into public.bot_overrides(slug) values ('test') on conflict(slug) do update set payload='{}';
insert into public.user_profiles(user_id,email,username,full_name,birth_date,country)
values ('00000000-0000-4000-8000-000000000001','test@example.invalid','test','Test','2000-01-01','IL');
insert into public.user_consents(user_id,terms_version,privacy_version) values ('00000000-0000-4000-8000-000000000001','test','test');
insert into public.user_training_events(user_id,event_type) values ('00000000-0000-4000-8000-000000000001','test');
insert into public.signup_access_codes(email,code_hash,expires_at) values ('test@example.invalid','test',now());
update public.signup_access_codes set status='approved' where email='test@example.invalid';
insert into public.user_puzzles(user_id,puzzle_id,fen,solution,class,severity,rating)
values ('00000000-0000-4000-8000-000000000001','test','test','{e2e4}','mistake',1,1000);
insert into public.user_puzzle_state(user_id) values ('00000000-0000-4000-8000-000000000001');
insert into public.puzzle_attempts(id,user_id,puzzle_id,mode,solved,ms,move,attempted_at)
values (gen_random_uuid(),'00000000-0000-4000-8000-000000000001','test','regular',true,10,'e2e4',now());
insert into public.puzzle_rush_runs(id,user_id,score,strikes,duration_ms,started_at,ended_at)
values (gen_random_uuid(),'00000000-0000-4000-8000-000000000001',1,0,10,now(),now());
insert into public.puzzle_jobs(user_id,kind) values ('00000000-0000-4000-8000-000000000001','dna');
insert into public.puzzle_game_log(user_id,game_key,provider) values ('00000000-0000-4000-8000-000000000001','test','saved');
insert into public.user_chess_dna_games(user_id,fingerprint,engine_version,analysis_schema_version,game_json)
values ('00000000-0000-4000-8000-000000000001',repeat('a',64),'test',1,'{}');
insert into public.user_chess_dna_reports(user_id,report_id,report_schema_version,report_json)
values ('00000000-0000-4000-8000-000000000001',gen_random_uuid(),1,'{}');
insert into public.user_daily_streak_settings(user_id) values ('00000000-0000-4000-8000-000000000001');
insert into public.user_daily_streak_events(user_id,event_id,activity_type,source_id,local_date,timezone_id)
values ('00000000-0000-4000-8000-000000000001',gen_random_uuid(),'training','test',current_date,'UTC');
insert into public.user_evolution_state(user_id,state_json,revision,last_scan_ts)
values ('00000000-0000-4000-8000-000000000001','{"version":2}'::jsonb,1,1000) on conflict(user_id) do update set revision=excluded.revision;
insert into public.public_oren_bot_versions(slug,active_version,active_payload,quality_gate,published_by)
values ('orenzbit','v1','{"id":"orenzbit"}'::jsonb,'{"approved":true}'::jsonb,'00000000-0000-4000-8000-000000000001') on conflict(slug) do update set active_version=excluded.active_version;

do $$
begin
  begin
    insert into public.puzzle_jobs(user_id,kind) values ('00000000-0000-4000-8000-000000000001','refill');
    raise exception 'duplicate active puzzle job allowed';
  exception when unique_violation then null; end;
  begin
    insert into public.user_daily_streak_events(user_id,event_id,activity_type,source_id,local_date,timezone_id)
    values ('00000000-0000-4000-8000-000000000001',gen_random_uuid(),'training','test',current_date,'UTC');
    raise exception 'duplicate daily qualification allowed';
  exception when unique_violation then null; end;
end $$;
reset role;
set role anon;
do $$ begin
  begin perform * from public.user_chess_dna_games; raise exception 'anon read allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set role authenticated;
do $$ begin
  begin insert into public.user_puzzle_state(user_id) values (gen_random_uuid()); raise exception 'browser write allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
