-- Customers module: derived, historical view over accounts and orders.
create or replace view public.customer_directory with (security_invoker=true) as
with identities as (
  select coalesce(p.id, o.user_id) as id,
    coalesce(nullif(trim(p.full_name),''), max(o.customer_name)) as name,
    coalesce(nullif(trim(p.mobile),''), max(o.mobile)) as mobile,
    coalesce(nullif(lower(trim(p.email)),''), lower(max(o.email))) as email,
    coalesce(p.email_verified,false) as email_verified,
    coalesce(p.mobile_verified,false) as mobile_verified,
    max(o.created_at) as last_order_at,
    count(o.id)::int as total_orders,
    coalesce(sum(case when o.status <> 'cancelled' then o.total else 0 end),0)::numeric(10,2) as total_spent,
    bool_or(o.status <> 'cancelled') as active
  from public.profiles p full join public.orders o on o.user_id=p.id
  group by p.id,p.full_name,p.mobile,p.email,p.email_verified,p.mobile_verified,o.user_id
), guests as (
  select null::uuid id, max(o.customer_name) name, max(o.mobile) mobile, lower(max(o.email)) email,
    false email_verified,false mobile_verified,max(o.created_at) last_order_at,count(*)::int total_orders,
    coalesce(sum(case when o.status <> 'cancelled' then o.total else 0 end),0)::numeric(10,2) total_spent,
    bool_or(o.status <> 'cancelled') active
  from public.orders o where o.user_id is null group by lower(o.email),regexp_replace(o.mobile,'\\D','','g')
)
select * from identities union all select * from guests;

create index if not exists orders_customer_lookup_idx on public.orders(lower(email), mobile);
-- Customer records are derived from accounts/orders: no delete endpoint is exposed; orders remain immutable history.
