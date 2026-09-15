-- Basic role permissions for the admin dashboard.
-- The seven areas and four levels are intentionally fixed and small.
create table public.role_permissions (
  role text not null check (role in ('Owner','Admin','Manager','Staff')),
  area text not null check (area in ('Dashboard','Orders','Inventory','Customers','Invoices','Delivery slots','Team')),
  permission text not null check (permission in ('Full','Edit','View','No Access')),
  updated_at timestamptz not null default now(),
  primary key (role, area)
);

create index role_permissions_area_idx on public.role_permissions(area);
alter publication supabase_realtime add table public.role_permissions;

insert into public.role_permissions(role, area, permission)
select role, area, permission
from (values
  ('Owner','Dashboard','Full'), ('Owner','Orders','Full'), ('Owner','Inventory','Full'), ('Owner','Customers','Full'), ('Owner','Invoices','Full'), ('Owner','Delivery slots','Full'), ('Owner','Team','Full'),
  ('Admin','Dashboard','Full'), ('Admin','Orders','Full'), ('Admin','Inventory','Full'), ('Admin','Customers','Full'), ('Admin','Invoices','Full'), ('Admin','Delivery slots','Full'), ('Admin','Team','Full'),
  ('Manager','Dashboard','View'), ('Manager','Orders','Edit'), ('Manager','Inventory','Edit'), ('Manager','Customers','Edit'), ('Manager','Invoices','View'), ('Manager','Delivery slots','Edit'), ('Manager','Team','No Access'),
  ('Staff','Dashboard','View'), ('Staff','Orders','View'), ('Staff','Inventory','View'), ('Staff','Customers','View'), ('Staff','Invoices','No Access'), ('Staff','Delivery slots','View'), ('Staff','Team','No Access')
) as defaults(role, area, permission)
on conflict (role, area) do nothing;

create or replace function public.current_team_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.team_members
  where lower(email) = lower(coalesce(auth.jwt()->>'email','')) and status = 'Active'
  limit 1;
$$;

create or replace function public.can_manage_role_permissions()
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_team_role() in ('Owner','Admin');
$$;

create or replace function public.has_role_permission(p_area text, p_required text default 'View')
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select case rp.permission when 'Full' then 3 when 'Edit' then 2 when 'View' then 1 else 0 end
    from public.role_permissions rp
    where rp.role = public.current_team_role() and rp.area = p_area
  ), 0) >= case p_required when 'Full' then 3 when 'Edit' then 2 else 1 end;
$$;

revoke all on function public.current_team_role() from public, anon, authenticated;
revoke all on function public.can_manage_role_permissions() from public, anon, authenticated;
revoke all on function public.has_role_permission(text,text) from public, anon, authenticated;
grant execute on function public.current_team_role() to authenticated;
grant execute on function public.can_manage_role_permissions() to authenticated;
grant execute on function public.has_role_permission(text,text) to authenticated;

create or replace function public.lock_owner_role_permissions()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' and new.role = 'Owner' and new.permission <> 'Full' then
    raise exception 'Owner permissions are permanently Full';
  end if;
  if tg_op = 'UPDATE' and (old.role = 'Owner' or new.role = 'Owner') then
    raise exception 'Owner permissions are locked';
  end if;
  if tg_op = 'DELETE' and old.role = 'Owner' then
    raise exception 'Owner permissions cannot be deleted';
  end if;
  if tg_op <> 'DELETE' and new.role = 'Owner' and new.permission <> 'Full' then
    raise exception 'Owner permissions are permanently Full';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end; $$;

create trigger role_permissions_owner_guard
before insert or update or delete on public.role_permissions
for each row execute function public.lock_owner_role_permissions();
create trigger role_permissions_updated
before update on public.role_permissions
for each row execute function public.set_updated_at();

alter table public.role_permissions enable row level security;
create policy "active team can view role permissions" on public.role_permissions
  for select to authenticated using (public.is_admin());
create policy "owners and admins can add role permissions" on public.role_permissions
  for insert to authenticated with check (public.can_manage_role_permissions() and role <> 'Owner');
create policy "owners and admins can edit role permissions" on public.role_permissions
  for update to authenticated using (public.can_manage_role_permissions() and role <> 'Owner') with check (public.can_manage_role_permissions() and role <> 'Owner');
create policy "owners and admins can remove role permissions" on public.role_permissions
  for delete to authenticated using (public.can_manage_role_permissions() and role <> 'Owner');

-- Team membership is readable by an active user only for their own identity;
-- Owner/Admin can administer the whole team. This also lets every active user
-- load their own role without exposing team management to Manager/Staff.
drop policy if exists "active team can view team" on public.team_members;
drop policy if exists "active team can add team" on public.team_members;
drop policy if exists "active team can update team" on public.team_members;
drop policy if exists "active team can remove team" on public.team_members;
create policy "active users view own team identity" on public.team_members
  for select to authenticated using (lower(email) = lower(coalesce(auth.jwt()->>'email','')) or public.can_manage_role_permissions());
create policy "owners and admins manage team" on public.team_members
  for insert to authenticated with check (public.can_manage_role_permissions());
create policy "owners and admins update team" on public.team_members
  for update to authenticated using (public.can_manage_role_permissions()) with check (public.can_manage_role_permissions());
create policy "owners and admins remove team" on public.team_members
  for delete to authenticated using (public.can_manage_role_permissions());

-- Keep storefront reads public while requiring the matching dashboard permission
-- for authenticated edits and operational data access.
drop policy if exists "admins manage categories" on public.categories;
create policy "permitted users manage categories" on public.categories
  for all to authenticated using (public.has_role_permission('Inventory','Edit')) with check (public.has_role_permission('Inventory','Edit'));
drop policy if exists "admins manage products" on public.products;
create policy "permitted users manage products" on public.products
  for all to authenticated using (public.has_role_permission('Inventory','Edit')) with check (public.has_role_permission('Inventory','Edit'));
drop policy if exists "admins manage slots" on public.delivery_slots;
create policy "permitted users manage slots" on public.delivery_slots
  for all to authenticated using (public.has_role_permission('Delivery slots','Edit')) with check (public.has_role_permission('Delivery slots','Edit'));
drop policy if exists "admins view carts" on public.carts;
drop policy if exists "admins update carts" on public.carts;
create policy "permitted users view carts" on public.carts
  for select to authenticated using (public.has_role_permission('Orders','View'));
create policy "permitted users update carts" on public.carts
  for update to authenticated using (public.has_role_permission('Orders','Edit')) with check (public.has_role_permission('Orders','Edit'));
drop policy if exists "orders visible to owner" on public.orders;
drop policy if exists "admins update orders" on public.orders;
create policy "permitted users view orders" on public.orders
  for select to authenticated using (auth.uid() = user_id or public.has_role_permission('Orders','View'));
create policy "permitted users update orders" on public.orders
  for update to authenticated using (public.has_role_permission('Orders','Edit')) with check (public.has_role_permission('Orders','Edit'));

-- Existing public storefront policies remain in place for active catalogue and slots.
