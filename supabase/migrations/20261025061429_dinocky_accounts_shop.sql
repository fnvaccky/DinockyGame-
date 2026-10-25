-- All wallet/inventory writes go through authenticated, atomic server functions.
create schema if not exists dinocky_private;
revoke all on schema dinocky_private from public, anon;
grant usage on schema dinocky_private to authenticated;

create table public.cosmetics (
  id text primary key,
  name text not null,
  kind text not null check (kind in ('color', 'accessory')),
  price integer not null check (price >= 0)
);
insert into public.cosmetics values
  ('pink','Strawberry','color',0), ('mint','Mint Chip','color',75),
  ('lavender','Berry Dream','color',75), ('sky','Blueberry Sky','color',100),
  ('cap','Explorer Cap','accessory',150), ('scarf','Berry Scarf','accessory',150);

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 24),
  coins integer not null default 0 check (coins >= 0),
  equipped_color text not null default 'pink' references public.cosmetics(id),
  equipped_accessory text references public.cosmetics(id),
  created_at timestamptz not null default now()
);
create table public.owned_cosmetics (
  user_id uuid references public.profiles(user_id) on delete cascade,
  cosmetic_id text references public.cosmetics(id),
  purchased_at timestamptz not null default now(),
  primary key (user_id, cosmetic_id)
);
create index owned_cosmetics_item_idx on public.owned_cosmetics(cosmetic_id);
create table public.level_progress (
  user_id uuid references public.profiles(user_id) on delete cascade,
  level_id text not null check (level_id = '1-1'),
  clears integer not null default 0,
  best_score integer not null default 0,
  best_time numeric,
  primary key(user_id, level_id)
);
create table public.game_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  level_id text not null default '1-1' check(level_id = '1-1'),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  completed boolean,
  score integer,
  elapsed numeric,
  reward integer not null default 0
);
create index game_runs_user_idx on public.game_runs(user_id, started_at desc);

alter table public.cosmetics enable row level security;
alter table public.profiles enable row level security;
alter table public.owned_cosmetics enable row level security;
alter table public.level_progress enable row level security;
alter table public.game_runs enable row level security;
create policy catalog_read on public.cosmetics for select to authenticated using (true);
create policy profile_read on public.profiles for select to authenticated using (user_id = (select auth.uid()));
create policy inventory_read on public.owned_cosmetics for select to authenticated using (user_id = (select auth.uid()));
create policy progress_read on public.level_progress for select to authenticated using (user_id = (select auth.uid()));
create policy runs_read on public.game_runs for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.cosmetics, public.profiles, public.owned_cosmetics, public.level_progress, public.game_runs from anon, authenticated;
grant select on public.cosmetics, public.profiles, public.owned_cosmetics, public.level_progress, public.game_runs to authenticated;

create function dinocky_private.create_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(user_id, display_name)
    values(new.id, left(coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), 'Snack Explorer'), 24));
  insert into public.owned_cosmetics(user_id, cosmetic_id) values(new.id, 'pink');
  return new;
end;
$$;
create trigger dinocky_profile_created after insert on auth.users for each row execute function dinocky_private.create_profile();

create function dinocky_private.game_snapshot() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); result jsonb;
begin
  if uid is null then raise exception 'Sign in to continue.' using errcode = '28000'; end if;
  select jsonb_build_object('profile', to_jsonb(p),
    'owned', coalesce((select jsonb_agg(cosmetic_id) from public.owned_cosmetics where user_id = uid), '[]'::jsonb),
    'progress', coalesce((select jsonb_agg(to_jsonb(l)) from public.level_progress l where user_id = uid), '[]'::jsonb))
    into result from public.profiles p where p.user_id = uid;
  if result is null then raise exception 'Your profile is not ready. Please sign in again.'; end if;
  return result;
end;
$$;

create function dinocky_private.start_run() returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); run_id uuid;
begin
  if uid is null then raise exception 'Sign in to play.' using errcode = '28000'; end if;
  perform 1 from public.profiles where user_id = uid for update;
  if (select count(*) from public.game_runs where user_id = uid and started_at > now() - interval '1 minute') >= 12 then
    raise exception 'Too many restarts. Try again in a minute.';
  end if;
  insert into public.game_runs(user_id) values(uid) returning id into run_id;
  return run_id;
end;
$$;

create function dinocky_private.finish_run(p_run_id uuid, p_score integer, p_elapsed numeric, p_completed boolean) returns jsonb
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
  if p_completed is null or p_score is null or p_elapsed is null or p_score < 0 or p_score > 6000
    or p_elapsed < 0 or p_elapsed > 240 or p_elapsed::text in ('NaN','Infinity','-Infinity') then
    raise exception 'Invalid run result.';
  end if;
  if p_completed and (p_elapsed < 8 or extract(epoch from now() - run.started_at) + 2 < p_elapsed) then
    raise exception 'Invalid completion time.';
  end if;
  if p_completed then
    select clears into previous_clears from public.level_progress where user_id = uid and level_id = '1-1';
    awarded := case when coalesce(previous_clears, 0) = 0 then 100 else 25 end;
    insert into public.level_progress(user_id, level_id, clears, best_score, best_time) values(uid, '1-1', 1, p_score, p_elapsed)
      on conflict(user_id, level_id) do update set clears = public.level_progress.clears + 1,
        best_score = greatest(public.level_progress.best_score, excluded.best_score),
        best_time = least(public.level_progress.best_time, excluded.best_time);
    update public.profiles set coins = coins + awarded where user_id = uid;
  end if;
  update public.game_runs set finished_at = now(), completed = p_completed, score = p_score, elapsed = p_elapsed, reward = awarded where id = p_run_id;
  return jsonb_build_object('reward', awarded, 'snapshot', dinocky_private.game_snapshot());
end;
$$;

create function dinocky_private.purchase_cosmetic(p_item_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); balance integer; cost integer;
begin
  if uid is null then raise exception 'Sign in to shop.' using errcode = '28000'; end if;
  select coins into balance from public.profiles where user_id = uid for update;
  select price into cost from public.cosmetics where id = p_item_id;
  if cost is null then raise exception 'Item not found.'; end if;
  if exists(select 1 from public.owned_cosmetics where user_id = uid and cosmetic_id = p_item_id) then return dinocky_private.game_snapshot(); end if;
  if balance < cost then raise exception 'Not enough coins. Finish a level to earn more!'; end if;
  update public.profiles set coins = coins - cost where user_id = uid;
  insert into public.owned_cosmetics(user_id, cosmetic_id) values(uid, p_item_id);
  return dinocky_private.game_snapshot();
end;
$$;

create function dinocky_private.equip_cosmetic(p_item_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); item_kind text;
begin
  if uid is null then raise exception 'Sign in to dress Dinocky.' using errcode = '28000'; end if;
  perform 1 from public.profiles where user_id = uid for update;
  if p_item_id is null then update public.profiles set equipped_accessory = null where user_id = uid;
  else
    if not exists(select 1 from public.owned_cosmetics where user_id = uid and cosmetic_id = p_item_id) then raise exception 'Buy this item before equipping it.'; end if;
    select kind into item_kind from public.cosmetics where id = p_item_id;
    if item_kind = 'color' then update public.profiles set equipped_color = p_item_id where user_id = uid;
    else update public.profiles set equipped_accessory = p_item_id where user_id = uid; end if;
  end if;
  return dinocky_private.game_snapshot();
end;
$$;

-- Public invoker wrappers expose only the deliberately defined game API.
create function public.game_snapshot() returns jsonb language sql security invoker set search_path = '' as $$ select dinocky_private.game_snapshot(); $$;
create function public.start_run() returns uuid language sql security invoker set search_path = '' as $$ select dinocky_private.start_run(); $$;
create function public.finish_run(p_run_id uuid, p_score integer, p_elapsed numeric, p_completed boolean) returns jsonb language sql security invoker set search_path = '' as $$ select dinocky_private.finish_run(p_run_id, p_score, p_elapsed, p_completed); $$;
create function public.purchase_cosmetic(p_item_id text) returns jsonb language sql security invoker set search_path = '' as $$ select dinocky_private.purchase_cosmetic(p_item_id); $$;
create function public.equip_cosmetic(p_item_id text) returns jsonb language sql security invoker set search_path = '' as $$ select dinocky_private.equip_cosmetic(p_item_id); $$;
revoke all on all functions in schema dinocky_private from public, anon, authenticated;
grant execute on function dinocky_private.game_snapshot(), dinocky_private.start_run(), dinocky_private.finish_run(uuid,integer,numeric,boolean), dinocky_private.purchase_cosmetic(text), dinocky_private.equip_cosmetic(text) to authenticated;
revoke all on function public.game_snapshot(), public.start_run(), public.finish_run(uuid,integer,numeric,boolean), public.purchase_cosmetic(text), public.equip_cosmetic(text) from public, anon;
grant execute on function public.game_snapshot(), public.start_run(), public.finish_run(uuid,integer,numeric,boolean), public.purchase_cosmetic(text), public.equip_cosmetic(text) to authenticated;
