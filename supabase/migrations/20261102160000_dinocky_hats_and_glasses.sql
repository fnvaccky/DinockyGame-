-- New shop accessories. All accessories still share profiles.equipped_accessory, so hats and glasses are mutually exclusive.
insert into public.cosmetics(id, name, kind, price) values
  ('bee_hat','Bumble Bucket','accessory',200),
  ('frog_hat','Froggy Bucket','accessory',200),
  ('glasses','Rosy Specs','accessory',125)
on conflict (id) do update set name = excluded.name, kind = excluded.kind, price = excluded.price;
-- The scarf is now red; its id stays 'scarf' so existing purchases keep working.
update public.cosmetics set name = 'Cozy Red Scarf' where id = 'scarf';
