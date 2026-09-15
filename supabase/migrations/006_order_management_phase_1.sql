-- Phase 1: controlled order operations, preparation, assignment and audit history.
-- This migration is intentionally forward-only and idempotent. Existing COD checkout remains unchanged.

alter type public.order_status add value if not exists 'ready_for_dispatch' after 'preparing';
alter type public.order_status add value if not exists 'failed' after 'delivered';
alter type public.order_status add value if not exists 'returned_undelivered' after 'failed';

alter table public.orders add column if not exists area text;
alter table public.orders add column if not exists order_type text not null default 'Standard';
alter table public.order_items add column if not exists ordered_weight numeric(10,3);
alter table public.order_items add column if not exists ordered_weight_unit text not null default 'g';

update public.orders
set area = case pincode
  when '834002' then 'Ranchi 834002'
  when '834003' then 'Ranchi 834003'
  when '834004' then 'Ranchi 834004'
  else coalesce(nullif(pincode, ''), 'Ranchi')
end
where area is null or btrim(area) = '';

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  method text not null default 'COD',
  status text not null default 'Pending' check (status in ('Pending','Authorised','Paid','Failed','Cancelled','COD','Refunded','Partially Refunded')),
  amount numeric(10,2) not null check (amount >= 0),
  transaction_id text,
  paid_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id)
);
alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments add constraint payments_status_check check (status in ('Pending','Authorised','Paid','Failed','Cancelled','COD','Refunded','Partially Refunded'));
create unique index if not exists payments_transaction_id_unique on public.payments(transaction_id) where transaction_id is not null;
create index if not exists payments_status_idx on public.payments(status);

create table if not exists public.delivery_executives (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  mobile text not null,
  area text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists delivery_executives_active_idx on public.delivery_executives(active);

create table if not exists public.order_assignments (
  order_id uuid primary key references public.orders(id) on delete cascade,
  executive_id uuid not null references public.delivery_executives(id),
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_by_email text,
  assigned_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists order_assignments_executive_idx on public.order_assignments(executive_id);

create table if not exists public.order_item_preparation (
  order_item_id uuid primary key references public.order_items(id) on delete cascade,
  actual_weight numeric(10,3) check (actual_weight is null or actual_weight > 0),
  prepared boolean not null default false,
  weighed boolean not null default false,
  packed boolean not null default false,
  label_attached boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  updated_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_internal_notes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  note text not null check (length(btrim(note)) between 1 and 2000),
  created_by uuid references auth.users(id) on delete set null,
  created_by_email text,
  created_at timestamptz not null default now()
);
create index if not exists order_internal_notes_order_idx on public.order_internal_notes(order_id, created_at desc);

create table if not exists public.order_timeline (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  event_type text not null,
  from_status text,
  to_status text,
  message text not null,
  override_reason text,
  actor_id uuid references auth.users(id) on delete set null,
  actor_email text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists order_timeline_order_idx on public.order_timeline(order_id, created_at desc);

-- Standard updated_at maintenance.
drop trigger if exists payments_updated on public.payments;
create trigger payments_updated before update on public.payments for each row execute function public.set_updated_at();
drop trigger if exists delivery_executives_updated on public.delivery_executives;
create trigger delivery_executives_updated before update on public.delivery_executives for each row execute function public.set_updated_at();
drop trigger if exists order_assignments_updated on public.order_assignments;
create trigger order_assignments_updated before update on public.order_assignments for each row execute function public.set_updated_at();
drop trigger if exists order_item_preparation_updated on public.order_item_preparation;
create trigger order_item_preparation_updated before update on public.order_item_preparation for each row execute function public.set_updated_at();

-- Every new order/item gets its operational companion row without changing checkout RPCs.
create or replace function public.initialize_order_operations()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.payments(order_id, method, status, amount, created_at)
  values (new.id, new.payment_method, case when upper(new.payment_method)='COD' then 'COD' else 'Pending' end, new.total, new.created_at)
  on conflict (order_id) do nothing;
  insert into public.order_timeline(order_id, event_type, to_status, message, created_at)
  values (new.id, 'order_created', new.status::text, 'Order created', new.created_at);
  return new;
end; $$;
drop trigger if exists initialize_order_operations_trigger on public.orders;
create trigger initialize_order_operations_trigger after insert on public.orders
for each row execute function public.initialize_order_operations();

create or replace function public.snapshot_order_item_weight()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_weight text; v_number numeric;
begin
  if new.ordered_weight is null and new.product_id is not null then
    select weight into v_weight from public.products where id=new.product_id;
    if v_weight ~* '[0-9]+([.][0-9]+)?[[:space:]]*(kg|g)([^a-z]|$)' then
      v_number := (regexp_match(v_weight, '([0-9]+([.][0-9]+)?)'))[1]::numeric;
      new.ordered_weight := (case when v_weight ~* 'kg([^a-z]|$)' then v_number*1000 else v_number end) * new.quantity;
      new.ordered_weight_unit := 'g';
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists snapshot_order_item_weight_trigger on public.order_items;
create trigger snapshot_order_item_weight_trigger before insert on public.order_items
for each row execute function public.snapshot_order_item_weight();

create or replace function public.initialize_order_item_preparation()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.order_item_preparation(order_item_id) values (new.id)
  on conflict (order_item_id) do nothing;
  return new;
end; $$;
drop trigger if exists initialize_order_item_preparation_trigger on public.order_items;
create trigger initialize_order_item_preparation_trigger after insert on public.order_items
for each row execute function public.initialize_order_item_preparation();

-- Backfill only system facts: a pending payment snapshot, preparation shell and creation event.
insert into public.payments(order_id, method, status, amount, created_at)
select o.id, o.payment_method, case when upper(o.payment_method)='COD' then 'COD' else 'Pending' end, o.total, o.created_at from public.orders o
on conflict (order_id) do nothing;
update public.payments set status='COD' where upper(method)='COD' and status='Pending';
insert into public.order_item_preparation(order_item_id)
select oi.id from public.order_items oi on conflict (order_item_id) do nothing;
update public.order_items oi
set ordered_weight = (case when p.weight ~* 'kg([^a-z]|$)' then m.value*1000 else m.value end) * oi.quantity,
    ordered_weight_unit = 'g'
from public.products p
cross join lateral (select ((regexp_match(p.weight, '([0-9]+([.][0-9]+)?)'))[1])::numeric as value) m
where oi.product_id=p.id and oi.ordered_weight is null
  and p.weight ~* '[0-9]+([.][0-9]+)?[[:space:]]*(kg|g)([^a-z]|$)';
insert into public.order_timeline(order_id, event_type, to_status, message, created_at)
select o.id, 'order_created', o.status::text, 'Order created', o.created_at
from public.orders o
where not exists (
  select 1 from public.order_timeline t where t.order_id = o.id and t.event_type = 'order_created'
);

-- Controlled status workflow. Non-Admin/Owner users may only take an allowed edge.
-- An Admin/Owner can cross any other edge only with a recorded reason.
create or replace function public.set_order_status(
  p_order_id uuid,
  p_new_status text,
  p_override_reason text default null
) returns public.orders
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_order public.orders; v_old_status text; v_role text; v_allowed boolean := false; v_override boolean := false;
  v_email text := lower(coalesce(auth.jwt()->>'email',''));
begin
  if auth.uid() is null or not public.has_role_permission('Orders','Edit') then raise exception 'Orders Edit permission is required'; end if;
  if p_new_status not in ('new','confirmed','preparing','ready_for_dispatch','out_for_delivery','delivered','cancelled','failed','returned_undelivered') then raise exception 'Unsupported order status'; end if;
  select * into v_order from public.orders where id=p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  v_old_status := v_order.status::text;
  if v_old_status=p_new_status then return v_order; end if;
  if p_new_status='cancelled' and nullif(btrim(coalesce(p_override_reason,'')),'') is null then
    raise exception 'A cancellation reason is required';
  end if;
  v_role := public.current_team_role();
  v_allowed := case v_old_status
    when 'new' then p_new_status in ('confirmed','cancelled')
    when 'confirmed' then p_new_status in ('preparing','cancelled')
    when 'preparing' then p_new_status in ('ready_for_dispatch','cancelled')
    when 'ready_for_dispatch' then p_new_status in ('out_for_delivery','cancelled')
    when 'out_for_delivery' then p_new_status in ('delivered','failed','returned_undelivered')
    when 'failed' then p_new_status in ('out_for_delivery','returned_undelivered')
    else false end;
  if not v_allowed then
    if v_role not in ('Owner','Admin') then raise exception 'This status transition is not allowed'; end if;
    if nullif(btrim(coalesce(p_override_reason,'')),'') is null then raise exception 'An override reason is required'; end if;
    v_override := true;
  end if;
  if p_new_status='ready_for_dispatch' and (
    not exists(select 1 from public.order_items where order_id=p_order_id) or exists (
    select 1 from public.order_items oi left join public.order_item_preparation prep on prep.order_item_id=oi.id
    where oi.order_id=p_order_id and (prep.order_item_id is null or not prep.prepared or not prep.weighed or not prep.packed or not prep.label_attached or prep.actual_weight is null or prep.actual_weight<=0)
  )) then raise exception 'Every item must be prepared, weighed, packed and labelled before dispatch'; end if;
  update public.orders set status=p_new_status::public.order_status where id=p_order_id returning * into v_order;
  insert into public.order_timeline(order_id,event_type,from_status,to_status,message,override_reason,actor_id,actor_email,metadata)
  values (p_order_id,case when v_override then 'status_override' else 'status_changed' end,v_old_status,p_new_status,
    case when v_override then 'Status overridden to ' else 'Status changed to ' end || replace(p_new_status,'_',' '),
    nullif(btrim(coalesce(p_override_reason,'')),''),auth.uid(),v_email,jsonb_build_object('override',v_override));
  return v_order;
end; $$;

create or replace function public.update_order_item_preparation(
  p_order_item_id uuid, p_actual_weight numeric, p_prepared boolean, p_weighed boolean,
  p_packed boolean, p_label_attached boolean, p_override_reason text default null
) returns public.order_item_preparation
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_order_id uuid; v_status text; v_role text; v_result public.order_item_preparation; v_locked boolean;
begin
  if auth.uid() is null or not public.has_role_permission('Orders','Edit') then raise exception 'Orders Edit permission is required'; end if;
  select oi.order_id,o.status::text into v_order_id,v_status from public.order_items oi join public.orders o on o.id=oi.order_id where oi.id=p_order_item_id for update of o;
  if not found then raise exception 'Order item not found'; end if;
  v_locked := v_status in ('out_for_delivery','delivered','failed','returned_undelivered','cancelled');
  if v_locked then
    v_role:=public.current_team_role();
    if v_role not in ('Owner','Admin') then raise exception 'Preparation is locked for this order'; end if;
    if nullif(btrim(coalesce(p_override_reason,'')),'') is null then raise exception 'An override reason is required'; end if;
  end if;
  if p_weighed and (p_actual_weight is null or p_actual_weight<=0) then raise exception 'Actual weight is required when an item is weighed'; end if;
  insert into public.order_item_preparation(order_item_id,actual_weight,prepared,weighed,packed,label_attached,updated_by,updated_by_email)
  values (p_order_item_id,p_actual_weight,p_prepared,p_weighed,p_packed,p_label_attached,auth.uid(),lower(coalesce(auth.jwt()->>'email','')))
  on conflict (order_item_id) do update set actual_weight=excluded.actual_weight,prepared=excluded.prepared,weighed=excluded.weighed,packed=excluded.packed,label_attached=excluded.label_attached,updated_by=excluded.updated_by,updated_by_email=excluded.updated_by_email
  returning * into v_result;
  insert into public.order_timeline(order_id,event_type,message,override_reason,actor_id,actor_email,metadata)
  values(v_order_id,case when v_locked then 'preparation_override' else 'preparation_updated' end,'Item preparation updated',nullif(btrim(coalesce(p_override_reason,'')),''),auth.uid(),lower(coalesce(auth.jwt()->>'email','')),jsonb_build_object('order_item_id',p_order_item_id));
  return v_result;
end; $$;

create or replace function public.assign_order_executive(
  p_order_id uuid, p_executive_id uuid, p_override_reason text default null
) returns public.order_assignments
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_status text; v_role text; v_result public.order_assignments; v_locked boolean; v_name text;
begin
  if auth.uid() is null or not public.has_role_permission('Orders','Edit') then raise exception 'Orders Edit permission is required'; end if;
  select status::text into v_status from public.orders where id=p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  select name into v_name from public.delivery_executives where id=p_executive_id and active;
  if not found then raise exception 'Choose an active delivery executive'; end if;
  v_locked:=v_status in ('out_for_delivery','delivered','failed','returned_undelivered','cancelled');
  if v_locked then
    v_role:=public.current_team_role();
    if v_role not in ('Owner','Admin') then raise exception 'Assignment is locked for this order'; end if;
    if nullif(btrim(coalesce(p_override_reason,'')),'') is null then raise exception 'An override reason is required'; end if;
  end if;
  insert into public.order_assignments(order_id,executive_id,assigned_by,assigned_by_email)
  values(p_order_id,p_executive_id,auth.uid(),lower(coalesce(auth.jwt()->>'email','')))
  on conflict(order_id) do update set executive_id=excluded.executive_id,assigned_by=excluded.assigned_by,assigned_by_email=excluded.assigned_by_email,assigned_at=now()
  returning * into v_result;
  insert into public.order_timeline(order_id,event_type,message,override_reason,actor_id,actor_email,metadata)
  values(p_order_id,case when v_locked then 'assignment_override' else 'assignment_changed' end,'Assigned to '||v_name,nullif(btrim(coalesce(p_override_reason,'')),''),auth.uid(),lower(coalesce(auth.jwt()->>'email','')),jsonb_build_object('executive_id',p_executive_id));
  return v_result;
end; $$;

create or replace function public.add_order_internal_note(p_order_id uuid, p_note text)
returns public.order_internal_notes
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_result public.order_internal_notes;
begin
  if auth.uid() is null or not public.has_role_permission('Orders','Edit') then raise exception 'Orders Edit permission is required'; end if;
  if nullif(btrim(coalesce(p_note,'')),'') is null then raise exception 'Note cannot be empty'; end if;
  if not exists(select 1 from public.orders where id=p_order_id) then raise exception 'Order not found'; end if;
  insert into public.order_internal_notes(order_id,note,created_by,created_by_email)
  values(p_order_id,btrim(p_note),auth.uid(),lower(coalesce(auth.jwt()->>'email',''))) returning * into v_result;
  insert into public.order_timeline(order_id,event_type,message,actor_id,actor_email)
  values(p_order_id,'internal_note','Internal note added',auth.uid(),lower(coalesce(auth.jwt()->>'email','')));
  return v_result;
end; $$;

revoke all on function public.set_order_status(uuid,text,text) from public, anon;
revoke all on function public.update_order_item_preparation(uuid,numeric,boolean,boolean,boolean,boolean,text) from public, anon;
revoke all on function public.assign_order_executive(uuid,uuid,text) from public, anon;
revoke all on function public.add_order_internal_note(uuid,text) from public, anon;
grant execute on function public.set_order_status(uuid,text,text) to authenticated;
grant execute on function public.update_order_item_preparation(uuid,numeric,boolean,boolean,boolean,boolean,text) to authenticated;
grant execute on function public.assign_order_executive(uuid,uuid,text) to authenticated;
grant execute on function public.add_order_internal_note(uuid,text) to authenticated;

-- Controlled writes must go through the RPCs above; remove the broad update policy from phase 005.
drop policy if exists "permitted users update orders" on public.orders;
drop policy if exists "admins update orders" on public.orders;
drop policy if exists "order items visible to owner" on public.order_items;
create policy "order items visible to owner" on public.order_items for select
  using (auth.uid() in (select o.user_id from public.orders o where o.id=order_id) or public.has_role_permission('Orders','View'));

create index if not exists orders_area_idx on public.orders(area);
create index if not exists orders_order_type_idx on public.orders(order_type);
create index if not exists orders_delivery_date_status_idx on public.orders(delivery_date,status);

alter table public.payments enable row level security;
alter table public.delivery_executives enable row level security;
alter table public.order_assignments enable row level security;
alter table public.order_item_preparation enable row level security;
alter table public.order_internal_notes enable row level security;
alter table public.order_timeline enable row level security;

drop policy if exists "orders readers view payments" on public.payments;
create policy "orders readers view payments" on public.payments for select to authenticated using (public.has_role_permission('Orders','View'));
drop policy if exists "orders readers view executives" on public.delivery_executives;
create policy "orders readers view executives" on public.delivery_executives for select to authenticated using (public.has_role_permission('Orders','View'));
drop policy if exists "orders readers view assignments" on public.order_assignments;
create policy "orders readers view assignments" on public.order_assignments for select to authenticated using (public.has_role_permission('Orders','View'));
drop policy if exists "orders readers view preparation" on public.order_item_preparation;
create policy "orders readers view preparation" on public.order_item_preparation for select to authenticated using (public.has_role_permission('Orders','View'));
drop policy if exists "orders readers view notes" on public.order_internal_notes;
create policy "orders readers view notes" on public.order_internal_notes for select to authenticated using (public.has_role_permission('Orders','View'));
drop policy if exists "orders readers view timeline" on public.order_timeline;
create policy "orders readers view timeline" on public.order_timeline for select to authenticated using (public.has_role_permission('Orders','View'));

-- Realtime membership is not IF NOT EXISTS in PostgreSQL, so check the catalogue first.
do $$
declare v_table text;
begin
  foreach v_table in array array['payments','delivery_executives','order_assignments','order_item_preparation','order_internal_notes','order_timeline']
  loop
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=v_table) then
      execute format('alter publication supabase_realtime add table public.%I',v_table);
    end if;
  end loop;
end $$;
