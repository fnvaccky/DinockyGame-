-- Accessories stack: one hat, one neck piece (scarf) and one face piece (glasses) at a time.
alter table public.cosmetics add column slot text check (slot in ('hat', 'neck', 'face'));
update public.cosmetics set slot = case id when 'scarf' then 'neck' when 'glasses' then 'face' else 'hat' end where kind = 'accessory';
alter table public.cosmetics add constraint cosmetics_accessory_slot check ((kind = 'accessory') = (slot is not null));

alter table public.profiles
  add column equipped_hat text references public.cosmetics(id),
  add column equipped_neck text references public.cosmetics(id),
  add column equipped_face text references public.cosmetics(id);
-- Keep whatever each player is wearing today, in its new slot.
update public.profiles p set
  equipped_hat = case c.slot when 'hat' then c.id end,
  equipped_neck = case c.slot when 'neck' then c.id end,
  equipped_face = case c.slot when 'face' then c.id end
from public.cosmetics c where c.id = p.equipped_accessory;
alter table public.profiles drop column equipped_accessory;

-- Equipping an accessory replaces only the item in its own slot; null still takes everything off.
create or replace function dinocky_private.equip_cosmetic(p_item_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); item_kind text; item_slot text;
begin
  if uid is null then raise exception 'Sign in to dress Dinocky.' using errcode = '28000'; end if;
  perform 1 from public.profiles where user_id = uid for update;
  if p_item_id is null then update public.profiles set equipped_hat = null, equipped_neck = null, equipped_face = null where user_id = uid;
  else
    if not exists(select 1 from public.owned_cosmetics where user_id = uid and cosmetic_id = p_item_id) then raise exception 'Buy this item before equipping it.'; end if;
    select kind, slot into item_kind, item_slot from public.cosmetics where id = p_item_id;
    if item_kind = 'color' then update public.profiles set equipped_color = p_item_id where user_id = uid;
    elsif item_slot = 'hat' then update public.profiles set equipped_hat = p_item_id where user_id = uid;
    elsif item_slot = 'neck' then update public.profiles set equipped_neck = p_item_id where user_id = uid;
    else update public.profiles set equipped_face = p_item_id where user_id = uid; end if;
  end if;
  return dinocky_private.game_snapshot();
end;
$$;

create function dinocky_private.unequip_cosmetic(p_item_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Sign in to dress Dinocky.' using errcode = '28000'; end if;
  update public.profiles set
    equipped_hat = nullif(equipped_hat, p_item_id),
    equipped_neck = nullif(equipped_neck, p_item_id),
    equipped_face = nullif(equipped_face, p_item_id)
  where user_id = uid;
  return dinocky_private.game_snapshot();
end;
$$;
create function public.unequip_cosmetic(p_item_id text) returns jsonb language sql security invoker set search_path = '' as $$ select dinocky_private.unequip_cosmetic(p_item_id); $$;
revoke all on function dinocky_private.unequip_cosmetic(text) from public, anon, authenticated;
grant execute on function dinocky_private.unequip_cosmetic(text) to authenticated;
revoke all on function public.unequip_cosmetic(text) from public, anon;
grant execute on function public.unequip_cosmetic(text) to authenticated;
