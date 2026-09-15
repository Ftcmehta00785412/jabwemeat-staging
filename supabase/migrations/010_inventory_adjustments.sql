-- Inventory adjustment audit trail and atomic stock adjustment.
create table if not exists public.inventory_adjustments (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  adjusted_by text not null,
  previous_quantity integer not null check (previous_quantity >= 0),
  adjustment_quantity integer not null check (adjustment_quantity <> 0),
  new_quantity integer not null check (new_quantity >= 0),
  reason text not null check (length(btrim(reason)) > 0),
  created_at timestamptz not null default now()
);
create index if not exists inventory_adjustments_product_created_idx on public.inventory_adjustments(product_id, created_at desc);
alter table public.inventory_adjustments enable row level security;
create policy "permitted users view inventory adjustments" on public.inventory_adjustments
  for select to authenticated using (public.has_role_permission('Inventory','View'));

create or replace function public.adjust_inventory_stock(p_product_id uuid, p_adjustment_quantity integer, p_reason text)
returns public.inventory_adjustments language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_product public.products%rowtype;
  v_record public.inventory_adjustments;
  v_email text := lower(coalesce(auth.jwt()->>'email',''));
  v_reason text := btrim(coalesce(p_reason,''));
  v_new integer;
begin
  if auth.uid() is null or not public.has_role_permission('Inventory','Edit') then raise exception 'Inventory Edit permission is required'; end if;
  if p_adjustment_quantity is null or p_adjustment_quantity = 0 then raise exception 'Adjustment must be a non-zero whole number'; end if;
  if v_reason = '' then raise exception 'A reason is required'; end if;
  select * into v_product from public.products where id = p_product_id for update;
  if not found then raise exception 'Product not found'; end if;
  v_new := v_product.stock + p_adjustment_quantity;
  if v_new < 0 then raise exception 'Adjustment cannot reduce stock below zero'; end if;
  update public.products set stock = v_new, updated_at = now() where id = p_product_id;
  insert into public.inventory_adjustments(product_id, adjusted_by, previous_quantity, adjustment_quantity, new_quantity, reason)
    values(p_product_id, v_email, v_product.stock, p_adjustment_quantity, v_new, v_reason)
    returning * into v_record;
  return v_record;
end; $$;
revoke all on function public.adjust_inventory_stock(uuid, integer, text) from public, anon;
grant execute on function public.adjust_inventory_stock(uuid, integer, text) to authenticated;
