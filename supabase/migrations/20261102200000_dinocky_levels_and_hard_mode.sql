-- Every World 1 level (including the 1-4 pig boss) is recorded separately, and Hard Mode pays double.
-- Rewards: first clear 100 coins, then 25; the boss level pays 200, then 50. Hard Mode doubles both.
alter table public.level_progress drop constraint level_progress_level_id_check;
alter table public.level_progress add constraint level_progress_level_id_check check (level_id in ('1-1', '1-2', '1-3', '1-4'));
alter table public.level_progress add column hard_clears integer not null default 0;
alter table public.game_runs drop constraint game_runs_level_id_check;
alter table public.game_runs add constraint game_runs_level_id_check check (level_id in ('1-1', '1-2', '1-3', '1-4'));
alter table public.game_runs add column hard boolean not null default false;

-- start_run now records which level is played and whether it is Hard Mode. Both arguments
-- have defaults, so older clients that call start_run() keep working.
drop function public.start_run();
drop function dinocky_private.start_run();
create function dinocky_private.start_run(p_level_id text default '1-1', p_hard boolean default false) returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); run_id uuid;
begin
  if uid is null then raise exception 'Sign in to play.' using errcode = '28000'; end if;
  if coalesce(p_level_id, '1-1') not in ('1-1', '1-2', '1-3', '1-4') then raise exception 'Level not found.'; end if;
  perform 1 from public.profiles where user_id = uid for update;
  if (select count(*) from public.game_runs where user_id = uid and started_at > now() - interval '1 minute') >= 12 then
    raise exception 'Too many restarts. Try again in a minute.';
  end if;
  insert into public.game_runs(user_id, level_id, hard) values(uid, coalesce(p_level_id, '1-1'), coalesce(p_hard, false)) returning id into run_id;
  return run_id;
end;
$$;
create function public.start_run(p_level_id text default '1-1', p_hard boolean default false) returns uuid
language sql security invoker set search_path = '' as $$ select dinocky_private.start_run(p_level_id, p_hard); $$;
revoke all on function dinocky_private.start_run(text, boolean) from public, anon, authenticated;
grant execute on function dinocky_private.start_run(text, boolean) to authenticated;
revoke all on function public.start_run(text, boolean) from public, anon;
grant execute on function public.start_run(text, boolean) to authenticated;

create or replace function dinocky_private.finish_run(p_run_id uuid, p_score integer, p_elapsed numeric, p_completed boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); run public.game_runs; awarded integer := 0; previous_clears integer;
begin
  if uid is null then raise exception 'Sign in to save your run.' using errcode = '28000'; end if;
  -- Lock the wallet first in every mutation to serialize races across runs and purchases.
  perform 1 from public.profiles where user_id = uid for update;
  select * into run from public.game_runs where id = p_run_id and user_id = uid for update;
  if not found then raise exception 'Run not found.'; end if;
  if run.finished_at is not null then
    return jsonb_build_object('reward', run.reward, 'snapshot', dinocky_private.game_snapshot());
  end if;
  if p_completed is null or p_score is null or p_elapsed is null or p_score < 0 or p_score > 20000
    or p_elapsed < 0 or p_elapsed > 240 or p_elapsed::text in ('NaN','Infinity','-Infinity') then
    raise exception 'Invalid run result.';
  end if;
  if p_completed and (p_elapsed < 8 or extract(epoch from now() - run.started_at) + 2 < p_elapsed) then
    raise exception 'Invalid completion time.';
  end if;
  if p_completed then
    select clears into previous_clears from public.level_progress where user_id = uid and level_id = run.level_id;
    awarded := case when coalesce(previous_clears, 0) = 0 then 100 else 25 end
      * case when run.level_id = '1-4' then 2 else 1 end
      * case when run.hard then 2 else 1 end;
    insert into public.level_progress(user_id, level_id, clears, hard_clears, best_score, best_time)
      values(uid, run.level_id, 1, case when run.hard then 1 else 0 end, p_score, p_elapsed)
      on conflict(user_id, level_id) do update set clears = public.level_progress.clears + 1,
        hard_clears = public.level_progress.hard_clears + excluded.hard_clears,
        best_score = greatest(public.level_progress.best_score, excluded.best_score),
        best_time = least(public.level_progress.best_time, excluded.best_time);
    update public.profiles set coins = coins + awarded where user_id = uid;
  end if;
  update public.game_runs set finished_at = now(), completed = p_completed, score = p_score, elapsed = p_elapsed, reward = awarded where id = p_run_id;
  return jsonb_build_object('reward', awarded, 'snapshot', dinocky_private.game_snapshot());
end;
$$;
