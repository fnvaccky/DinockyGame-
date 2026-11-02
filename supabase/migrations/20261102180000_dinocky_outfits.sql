-- Outfits: the tuxedo, explorer vest and hoodie share a new body slot, worn under a hat, scarf and glasses.
alter table public.cosmetics drop constraint cosmetics_slot_check;
alter table public.cosmetics add constraint cosmetics_slot_check check (slot in ('hat', 'neck', 'face', 'body'));
insert into public.cosmetics(id, name, kind, price, slot) values
  ('suit','Dapper Tuxedo','accessory',300,'body'),
  ('explorer','Safari Vest','accessory',250,'body'),
  ('hoodie','Mint Dino Hoodie','accessory',250,'body')
on conflict (id) do update set name = excluded.name, kind = excluded.kind, price = excluded.price, slot = excluded.slot;

alter table public.profiles add column equipped_body text references public.cosmetics(id);

create or replace function dinocky_private.equip_cosmetic(p_item_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); item_kind text; item_slot text;
begin
  if uid is null then raise exception 'Sign in to dress Dinocky.' using errcode = '28000'; end if;
  perform 1 from public.profiles where user_id = uid for update;
  if p_item_id is null then update public.profiles set equipped_hat = null, equipped_neck = null, equipped_face = null, equipped_body = null where user_id = uid;
  else
    if not exists(select 1 from public.owned_cosmetics where user_id = uid and cosmetic_id = p_item_id) then raise exception 'Buy this item before equipping it.'; end if;
    select kind, slot into item_kind, item_slot from public.cosmetics where id = p_item_id;
    if item_kind = 'color' then update public.profiles set equipped_color = p_item_id where user_id = uid;
    elsif item_slot = 'hat' then update public.profiles set equipped_hat = p_item_id where user_id = uid;
    elsif item_slot = 'neck' then update public.profiles set equipped_neck = p_item_id where user_id = uid;
    elsif item_slot = 'body' then update public.profiles set equipped_body = p_item_id where user_id = uid;
    else update public.profiles set equipped_face = p_item_id where user_id = uid; end if;
  end if;
  return dinocky_private.game_snapshot();
end;
$$;

create or replace function dinocky_private.unequip_cosmetic(p_item_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Sign in to dress Dinocky.' using errcode = '28000'; end if;
  update public.profiles set
    equipped_hat = nullif(equipped_hat, p_item_id),
    equipped_neck = nullif(equipped_neck, p_item_id),
    equipped_face = nullif(equipped_face, p_item_id),
    equipped_body = nullif(equipped_body, p_item_id)
  where user_id = uid;
  return dinocky_private.game_snapshot();
end;
$$;
