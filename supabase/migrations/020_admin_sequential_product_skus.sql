-- One-time catalogue renumbering, leaving immutable order-item SKU snapshots alone.
lock table public.products in share row exclusive mode;
create sequence if not exists public.product_sku_number_seq;
-- Temporary namespace avoids conflicts with any existing JWM-NNN value.
update public.products set sku = '__jwm_renumber_' || id::text;
with numbered as (
  select id, row_number() over (order by created_at, name, id) as n from public.products
)
update public.products p set sku = 'JWM-' || lpad(n.n::text, greatest(3,length(n.n::text)), '0'), updated_at = now()
from numbered n where p.id=n.id;
select setval('public.product_sku_number_seq', greatest((select count(*) from public.products),1), (select count(*)>0 from public.products));
create or replace function public.assign_product_sku_number()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare v_number bigint;
begin
  v_number := nextval('public.product_sku_number_seq');
  new.sku := 'JWM-' || lpad(v_number::text, greatest(3,length(v_number::text)), '0');
  return new;
end $$;
revoke all on sequence public.product_sku_number_seq from public,anon,authenticated;
revoke all on function public.assign_product_sku_number() from public,anon,authenticated;
drop trigger if exists assign_product_sku_number on public.products;
create trigger assign_product_sku_number before insert on public.products for each row execute function public.assign_product_sku_number();
