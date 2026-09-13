-- JabWeMeat staging commerce schema
create extension if not exists pgcrypto;

create type public.order_status as enum ('new','confirmed','preparing','out_for_delivery','delivered','cancelled');
create type public.cart_status as enum ('active','converted','recovered','expired');

create table public.admin_users (
  email text primary key check (email = lower(email)),
  display_name text not null,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text not null default '',
  image_url text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id),
  sku text not null unique,
  name text not null,
  slug text not null unique,
  description text not null default '',
  weight text not null default '',
  servings text not null default '',
  price numeric(10,2) not null check (price >= 0),
  mrp numeric(10,2) not null check (mrp >= price),
  stock integer not null default 0 check (stock >= 0),
  low_stock_threshold integer not null default 10 check (low_stock_threshold >= 0),
  image_url text,
  featured boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  mobile text,
  email_verified boolean not null default false,
  mobile_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Home',
  recipient_name text not null,
  mobile text not null,
  line1 text not null,
  line2 text,
  landmark text,
  city text not null default 'Ranchi',
  state text not null default 'Jharkhand',
  pincode text not null check (pincode in ('834002','834003','834004')),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.delivery_slots (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  start_time time not null,
  end_time time not null,
  capacity integer not null default 20 check (capacity >= 0),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.store_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.carts (
  id uuid primary key default gen_random_uuid(),
  session_key text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  customer_name text,
  email text,
  mobile text,
  pincode text,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(10,2) not null default 0,
  status public.cart_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create sequence public.order_number_seq start 1001;
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('JWM-' || lpad(nextval('public.order_number_seq')::text, 6, '0')),
  user_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  email text not null,
  mobile text not null,
  address jsonb not null,
  pincode text not null check (pincode in ('834002','834003','834004')),
  delivery_date date not null,
  slot_id uuid not null references public.delivery_slots(id),
  subtotal numeric(10,2) not null,
  discount numeric(10,2) not null default 0,
  delivery_charge numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  payment_method text not null default 'COD' check (payment_method = 'COD'),
  status public.order_status not null default 'new',
  notes text,
  invoice_number text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  sku text not null,
  product_name text not null,
  unit_price numeric(10,2) not null,
  quantity integer not null check (quantity > 0),
  line_total numeric(10,2) not null
);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger categories_updated before update on public.categories for each row execute function public.set_updated_at();
create trigger products_updated before update on public.products for each row execute function public.set_updated_at();
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger addresses_updated before update on public.addresses for each row execute function public.set_updated_at();
create trigger slots_updated before update on public.delivery_slots for each row execute function public.set_updated_at();
create trigger settings_updated before update on public.store_settings for each row execute function public.set_updated_at();
create trigger carts_updated before update on public.carts for each row execute function public.set_updated_at();
create trigger orders_updated before update on public.orders for each row execute function public.set_updated_at();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, full_name, email, email_verified)
  values(new.id, coalesce(new.raw_user_meta_data->>'full_name',''), new.email, new.email_confirmed_at is not null)
  on conflict(id) do nothing;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.admin_users where email = lower(coalesce(auth.jwt()->>'email','')));
$$;

create or replace function public.save_cart(
  p_session_key text, p_customer_name text, p_email text, p_mobile text, p_pincode text, p_items jsonb
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_subtotal numeric(10,2);
begin
  if length(p_session_key) < 16 or jsonb_typeof(p_items) <> 'array' then raise exception 'Invalid cart'; end if;
  select coalesce(sum(p.price * x.qty),0) into v_subtotal
  from (select (e->>'product_id')::uuid product_id, greatest(1,least(20,(e->>'quantity')::int)) qty from jsonb_array_elements(p_items) e) x
  join public.products p on p.id=x.product_id and p.active;
  insert into public.carts(session_key,user_id,customer_name,email,mobile,pincode,items,subtotal,status)
  values(p_session_key,auth.uid(),nullif(trim(p_customer_name),''),nullif(lower(trim(p_email)),''),nullif(trim(p_mobile),''),p_pincode,p_items,v_subtotal,'active')
  on conflict(session_key) do update set user_id=coalesce(auth.uid(),carts.user_id),customer_name=excluded.customer_name,email=excluded.email,mobile=excluded.mobile,pincode=excluded.pincode,items=excluded.items,subtotal=excluded.subtotal,status='active',updated_at=now()
  returning id into v_id;
  return v_id;
end; $$;

create or replace function public.place_cod_order(
  p_session_key text, p_customer_name text, p_email text, p_mobile text, p_address jsonb,
  p_pincode text, p_delivery_date date, p_slot_id uuid, p_items jsonb, p_notes text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_order_id uuid; v_order_number text; v_subtotal numeric(10,2):=0; v_discount numeric(10,2):=0;
  v_delivery numeric(10,2):=0; v_total numeric(10,2); v_prior integer; v_rec record;
begin
  if p_pincode not in ('834002','834003','834004') then raise exception 'Delivery is unavailable for this PIN code'; end if;
  if p_delivery_date < current_date then raise exception 'Choose a valid delivery date'; end if;
  if not exists(select 1 from public.delivery_slots where id=p_slot_id and active) then raise exception 'Delivery slot is unavailable'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items)=0 then raise exception 'Cart is empty'; end if;
  if length(regexp_replace(p_mobile,'\D','','g')) < 10 then raise exception 'Enter a valid mobile number'; end if;
  if position('@' in p_email) < 2 then raise exception 'Enter a valid email address'; end if;

  perform 1 from public.products p where p.id in (select (e->>'product_id')::uuid from jsonb_array_elements(p_items)e) order by p.id for update;
  for v_rec in
    select p.id,p.sku,p.name,p.price,p.stock,sum(greatest(1,least(20,(e->>'quantity')::int)))::int qty
    from jsonb_array_elements(p_items)e join public.products p on p.id=(e->>'product_id')::uuid
    where p.active group by p.id,p.sku,p.name,p.price,p.stock
  loop
    if v_rec.qty > v_rec.stock then raise exception '% has only % item(s) available',v_rec.name,v_rec.stock; end if;
    v_subtotal := v_subtotal + (v_rec.price*v_rec.qty);
  end loop;
  if v_subtotal < 99 then raise exception 'Minimum cart value is ₹99'; end if;

  select count(*) into v_prior from public.orders where status <> 'cancelled' and (lower(email)=lower(trim(p_email)) or regexp_replace(mobile,'\D','','g')=regexp_replace(p_mobile,'\D','','g'));
  if v_prior=0 then v_discount:=least(100,v_subtotal); end if;
  if v_prior>=3 then v_delivery:=25; end if;
  v_total:=greatest(0,v_subtotal-v_discount+v_delivery);

  insert into public.orders(user_id,customer_name,email,mobile,address,pincode,delivery_date,slot_id,subtotal,discount,delivery_charge,total,notes)
  values(auth.uid(),trim(p_customer_name),lower(trim(p_email)),trim(p_mobile),p_address,p_pincode,p_delivery_date,p_slot_id,v_subtotal,v_discount,v_delivery,v_total,nullif(trim(p_notes),''))
  returning id,order_number into v_order_id,v_order_number;

  for v_rec in
    select p.id,p.sku,p.name,p.price,sum(greatest(1,least(20,(e->>'quantity')::int)))::int qty
    from jsonb_array_elements(p_items)e join public.products p on p.id=(e->>'product_id')::uuid
    where p.active group by p.id,p.sku,p.name,p.price
  loop
    insert into public.order_items(order_id,product_id,sku,product_name,unit_price,quantity,line_total)
    values(v_order_id,v_rec.id,v_rec.sku,v_rec.name,v_rec.price,v_rec.qty,v_rec.price*v_rec.qty);
    update public.products set stock=stock-v_rec.qty where id=v_rec.id;
  end loop;
  update public.carts set status='converted',updated_at=now() where session_key=p_session_key;
  return jsonb_build_object('order_id',v_order_id,'order_number',v_order_number,'subtotal',v_subtotal,'discount',v_discount,'delivery_charge',v_delivery,'total',v_total);
end; $$;

revoke all on function public.save_cart(text,text,text,text,text,jsonb) from public;
revoke all on function public.place_cod_order(text,text,text,text,jsonb,text,date,uuid,jsonb,text) from public;
grant execute on function public.save_cart(text,text,text,text,text,jsonb) to anon,authenticated;
grant execute on function public.place_cod_order(text,text,text,text,jsonb,text,date,uuid,jsonb,text) to anon,authenticated;

alter table public.admin_users enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.delivery_slots enable row level security;
alter table public.store_settings enable row level security;
alter table public.carts enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "public categories" on public.categories for select using (active or public.is_admin());
create policy "admins manage categories" on public.categories for all using (public.is_admin()) with check (public.is_admin());
create policy "public products" on public.products for select using (active or public.is_admin());
create policy "admins manage products" on public.products for all using (public.is_admin()) with check (public.is_admin());
create policy "public slots" on public.delivery_slots for select using (active or public.is_admin());
create policy "admins manage slots" on public.delivery_slots for all using (public.is_admin()) with check (public.is_admin());
create policy "public settings" on public.store_settings for select using (true);
create policy "admins manage settings" on public.store_settings for all using (public.is_admin()) with check (public.is_admin());
create policy "own profile" on public.profiles for select using (auth.uid()=id or public.is_admin());
create policy "own profile update" on public.profiles for update using (auth.uid()=id or public.is_admin()) with check (auth.uid()=id or public.is_admin());
create policy "own addresses" on public.addresses for all using (auth.uid()=user_id or public.is_admin()) with check (auth.uid()=user_id or public.is_admin());
create policy "admins view carts" on public.carts for select using (public.is_admin());
create policy "admins update carts" on public.carts for update using (public.is_admin()) with check (public.is_admin());
create policy "orders visible to owner" on public.orders for select using (auth.uid()=user_id or public.is_admin());
create policy "admins update orders" on public.orders for update using (public.is_admin()) with check (public.is_admin());
create policy "order items visible to owner" on public.order_items for select using (public.is_admin() or exists(select 1 from public.orders o where o.id=order_id and o.user_id=auth.uid()));
create policy "admins manage admin users" on public.admin_users for all using (public.is_admin()) with check (public.is_admin());

insert into public.admin_users(email,display_name) values ('sita.mehra@manthanworld.com','Sita Mehra');
insert into public.categories(name,slug,description,sort_order) values
('Chicken','chicken','Fresh chicken cuts',1),('Mutton','mutton','Premium goat meat cuts',2),('Fish & Seafood','fish-seafood','Fresh fish and seafood',3),('Eggs','eggs','Farm fresh eggs',4),('Ready to Cook','ready-to-cook','Marinated favourites',5),('Combos','combos','Value meal combinations',6);

insert into public.products(category_id,sku,name,slug,description,weight,servings,price,mrp,stock,image_url,featured) values
((select id from public.categories where slug='chicken'),'JWM-CHK-001','Classic Chicken Curry Cut','classic-chicken-curry-cut','Fresh skinless curry pieces, cleaned and ready to cook.','500 g','3–4',179,209,32,'https://jabwemeat-staging.vercel.app/assets/chicken-curry.webp',true),
((select id from public.categories where slug='chicken'),'JWM-CHK-002','Chicken Breast Boneless','chicken-breast-boneless','Lean, tender cuts for grills, curries and meal prep.','450 g','2–3',229,259,18,'https://jabwemeat-staging.vercel.app/assets/chicken-breast.webp',true),
((select id from public.categories where slug='mutton'),'JWM-MUT-001','Premium Mutton Chops','premium-mutton-chops','Meaty bone-in chops selected for grills and rich home-style curries.','500 g','3–4',449,499,9,'https://jabwemeat-staging.vercel.app/assets/mutton.webp',true),
((select id from public.categories where slug='fish-seafood'),'JWM-FSH-001','Fresh Whole Rohu','fresh-whole-rohu','Fresh Rohu with cut and cleaning options coming with live SKUs.','Approx. 1 kg','4–5',199,229,14,'https://jabwemeat-staging.vercel.app/assets/rohu.webp',false),
((select id from public.categories where slug='fish-seafood'),'JWM-SEA-001','Whole Freshwater Prawns','whole-freshwater-prawns','Fresh whole prawns suitable for curries, fries and quick starters.','250 g','2',249,289,6,'https://jabwemeat-staging.vercel.app/assets/prawns.webp',false),
((select id from public.categories where slug='eggs'),'JWM-EGG-001','Farm Fresh Eggs','farm-fresh-eggs','Clean, carefully packed everyday protein.','Pack of 12','6',109,119,45,'https://jabwemeat-staging.vercel.app/assets/eggs.webp',false),
((select id from public.categories where slug='ready-to-cook'),'JWM-RTC-001','Tandoori Chicken Tikka','tandoori-chicken-tikka','Marinated boneless bites—pan-fry or air-fry in minutes.','300 g','2–3',239,279,11,'https://jabwemeat-staging.vercel.app/assets/tikka.webp',false),
((select id from public.categories where slug='combos'),'JWM-CMB-001','Family Curry Combo','family-curry-combo','Chicken curry cut with farm-fresh eggs for family meals.','500 g + 6 eggs','4–5',249,298,8,'https://jabwemeat-staging.vercel.app/assets/family-combo.webp',false);

insert into public.delivery_slots(label,start_time,end_time,capacity,sort_order) values
('9:00–11:00 AM','09:00','11:00',20,1),('12:00–3:00 PM','12:00','15:00',20,2),('4:00–6:00 PM','16:00','18:00',20,3),('7:00–9:00 PM','19:00','21:00',20,4);
insert into public.store_settings(key,value) values
('serviceable_pins','["834002","834003","834004"]'::jsonb),('minimum_cart','99'::jsonb),('delivery_charge','25'::jsonb),('first_order_discount','100'::jsonb),('free_delivery_orders','3'::jsonb),('cod_enabled','true'::jsonb);

alter publication supabase_realtime add table public.products,public.orders,public.carts,public.delivery_slots,public.store_settings;
