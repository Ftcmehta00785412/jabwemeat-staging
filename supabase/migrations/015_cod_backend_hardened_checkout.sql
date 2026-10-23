-- Hardened COD checkout. DELIBERATELY DISABLED: no visitor EXECUTE grant and
-- ordering_enabled=false. Launch requires a separate, explicitly approved change.
-- Prices/stock and configured delivery pincodes are not changed here.
begin;

alter table public.orders add column if not exists gst_rate numeric(5,2);
alter table public.orders add column if not exists gst_amount numeric(10,2);
-- Historical rows remain NULL: do not invent historical tax or rewrite totals.
alter table public.orders add constraint orders_gst_snapshot_check check (
  (gst_rate is null and gst_amount is null) or
  (gst_rate = 18 and gst_amount = round(subtotal * 0.18, 2)
   and discount = 0 and delivery_charge = 0 and total = subtotal + gst_amount)
);

create table public.cod_order_requests (
  idempotency_key uuid primary key,
  request_hash bytea not null,
  order_id uuid not null unique references public.orders(id),
  response jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.cod_order_requests enable row level security;
revoke all on public.cod_order_requests from public, anon, authenticated;
-- No policies, no browser table access, no realtime publication.
create index orders_cod_phone_created_idx on public.orders(mobile, created_at desc);
create index orders_cod_email_created_idx on public.orders(lower(email), created_at desc);
create index orders_slot_date_capacity_idx on public.orders(slot_id, delivery_date) where status <> 'cancelled';

insert into public.store_settings(key, value) values
  ('minimum_cart', '299'), ('delivery_charge', '0'),
  ('first_order_discount', '0'), ('free_delivery_orders', '0'),
  ('gst_rate', '18'), ('inaugural_free_delivery', 'true'),
  ('online_payments_enabled', 'false'), ('ordering_enabled', 'false')
on conflict(key) do update set value=excluded.value;

-- Remove the insecure legacy overload, which is already revoked on this project.
drop function public.place_cod_order(text,text,text,text,jsonb,text,date,uuid,jsonb,text);
create function public.place_cod_order(
  p_session_key text, p_customer_name text, p_email text, p_mobile text,
  p_address jsonb, p_pincode text, p_delivery_date date, p_slot_id uuid,
  p_items jsonb, p_notes text default null,
  p_idempotency_key uuid default null, p_expected_total numeric default null
) returns jsonb language plpgsql security definer
set search_path = pg_catalog, public
set lock_timeout = '5s'
set statement_timeout = '15s'
as $$
declare
  v_name text := btrim(p_customer_name);
  v_email text := lower(btrim(p_email));
  v_mobile text := regexp_replace(btrim(p_mobile), '[ +()-]', '', 'g');
  v_notes text := nullif(btrim(p_notes), '');
  v_address jsonb; v_items jsonb; v_hash bytea;
  v_prior public.cod_order_requests%rowtype;
  v_slot public.delivery_slots%rowtype;
  v_item jsonb; v_rec record;
  v_now timestamp := clock_timestamp() at time zone 'Asia/Kolkata';
  v_subtotal numeric(10,2) := 0;
  v_gst numeric(10,2); v_total numeric(10,2);
  v_order_id uuid; v_order_number text; v_response jsonb;
begin
  if p_idempotency_key is null or p_idempotency_key='00000000-0000-0000-0000-000000000000'::uuid then
    raise exception using errcode='22023', message='A unique checkout idempotency key is required';
  end if;
  if p_session_key is null or length(p_session_key) not between 16 and 128 or p_session_key ~ '[[:cntrl:]]' then
    raise exception using errcode='22023', message='Invalid checkout session';
  end if;
  if v_name is null or length(v_name) not between 2 and 100 or v_name ~ '[[:cntrl:]]' then
    raise exception using errcode='22023', message='Enter a customer name (2-100 characters)';
  end if;
  if v_email is null or length(v_email) > 254 or v_email !~ '^[A-Za-z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?[.][A-Za-z]{2,63}$' then
    raise exception using errcode='22023', message='Enter a valid email address';
  end if;
  if left(v_mobile,2)='91' and length(v_mobile)=12 then v_mobile:=substr(v_mobile,3); end if;
  if v_mobile is null or v_mobile !~ '^[6-9][0-9]{9}$' then
    raise exception using errcode='22023', message='Enter a valid Indian mobile number';
  end if;
  if p_pincode is null or p_pincode !~ '^[0-9]{6}$' then
    raise exception using errcode='22023', message='Enter a valid delivery PIN code';
  end if;
  if p_address is null or jsonb_typeof(p_address) <> 'object' or octet_length(p_address::text)>2500 then
    raise exception using errcode='22023', message='Enter a valid delivery address';
  end if;
  if exists(select 1 from jsonb_object_keys(p_address) k where k not in ('line1','line2','landmark','city','state')) or
     exists(select 1 from jsonb_each(p_address) e where jsonb_typeof(e.value)<>'string' or e.value #>> '{}' ~ '[[:cntrl:]]') or
     coalesce(length(btrim(p_address->>'line1')),0) not between 5 and 200 or
     coalesce(length(btrim(p_address->>'line2')),0)>200 or
     coalesce(length(btrim(p_address->>'landmark')),0)>150 or
     lower(coalesce(btrim(p_address->>'city'),''))<>'ranchi' or
     lower(coalesce(btrim(p_address->>'state'),''))<>'jharkhand' then
    raise exception using errcode='22023', message='Provide a Ranchi, Jharkhand address with line1 (5-200 characters)';
  end if;
  v_address:=jsonb_build_object('line1',btrim(p_address->>'line1'),
    'line2',coalesce(btrim(p_address->>'line2'),''),'landmark',coalesce(btrim(p_address->>'landmark'),''),
    'city','Ranchi','state','Jharkhand');
  if coalesce(length(v_notes),0)>500 or coalesce(v_notes,'') ~ '[[:cntrl:]]' then
    raise exception using errcode='22023', message='Delivery notes must be at most 500 characters';
  end if;
  if p_delivery_date is null or p_slot_id is null then
    raise exception using errcode='22023', message='Choose a delivery date and slot';
  end if;
  if p_items is null or jsonb_typeof(p_items)<>'array' then
    raise exception using errcode='22023', message='Cart must be an array';
  end if;
  if jsonb_array_length(p_items) not between 1 and 20 or octet_length(p_items::text)>5000 then
    raise exception using errcode='22023', message='Cart must contain 1-20 distinct products';
  end if;
  for v_item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_item)<>'object' then raise exception using errcode='22023', message='Invalid cart item'; end if;
    if not (v_item ?& array['product_id','quantity']) or
       exists(select 1 from jsonb_object_keys(v_item) k where k not in ('product_id','quantity')) or
       jsonb_typeof(v_item->'product_id')<>'string' or
       coalesce(v_item->>'product_id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' or
       jsonb_typeof(v_item->'quantity')<>'number' or
       coalesce(v_item->>'quantity','') !~ '^([1-9]|1[0-9]|20)$' then
      raise exception using errcode='22023', message='Items require only product_id UUID and integer quantity 1-20';
    end if;
  end loop;
  if (select count(distinct (e->>'product_id')::uuid) from jsonb_array_elements(p_items) e) <> jsonb_array_length(p_items) then
    raise exception using errcode='22023', message='Duplicate products are not allowed';
  end if;
  select jsonb_agg(jsonb_build_object('product_id',(e->>'product_id')::uuid,'quantity',(e->>'quantity')::int) order by (e->>'product_id')::uuid)
    into v_items from jsonb_array_elements(p_items) e;
  if p_expected_total is not null and (p_expected_total::text in ('NaN','Infinity','-Infinity') or p_expected_total<0 or p_expected_total>100000 or p_expected_total<>round(p_expected_total,2)) then
    raise exception using errcode='22023', message='Invalid expected total';
  end if;
  v_hash:=sha256(convert_to(jsonb_build_object('user_id',auth.uid(),'name',v_name,'email',v_email,
    'mobile',v_mobile,'address',v_address,'pincode',p_pincode,'delivery_date',p_delivery_date,
    'slot_id',p_slot_id,'items',v_items,'notes',v_notes,'expected_total',p_expected_total)::text,'UTF8'));

  -- Small inaugural store: serialize checkout for deterministic caps/idempotency.
  -- Stock row locks also coordinate with the existing admin inventory RPC.
  perform pg_advisory_xact_lock(734109, 1);
  select * into v_prior from public.cod_order_requests where idempotency_key=p_idempotency_key;
  if found then
    if v_prior.request_hash<>v_hash then
      raise exception using errcode='22023', message='Idempotency key belongs to a different checkout; use a new key';
    end if;
    return v_prior.response;
  end if;
  if not exists(select 1 from public.store_settings where key='ordering_enabled' and value='true'::jsonb) or
     not exists(select 1 from public.store_settings where key='cod_enabled' and value='true'::jsonb) then
    raise exception using errcode='P0001', message='Ordering is currently unavailable';
  end if;
  if not exists(select 1 from public.store_settings where key='serviceable_pins' and jsonb_typeof(value)='array' and value ? p_pincode) then
    raise exception using errcode='22023', message='Delivery is unavailable for this PIN code';
  end if;
  v_now:=clock_timestamp() at time zone 'Asia/Kolkata';
  if p_delivery_date<v_now::date or p_delivery_date>v_now::date+7 then
    raise exception using errcode='22023', message='Choose delivery within the next 7 days';
  end if;
  select * into v_slot from public.delivery_slots where id=p_slot_id for update;
  if not found or not v_slot.active or v_slot.capacity<=0 or v_slot.end_time<=v_slot.start_time then
    raise exception using errcode='22023', message='Delivery slot is unavailable';
  end if;
  if p_delivery_date=v_now::date and v_slot.start_time<=v_now::time then
    raise exception using errcode='22023', message='This delivery slot has already started; choose a later slot';
  end if;
  if (select count(*) from public.orders where slot_id=p_slot_id and delivery_date=p_delivery_date and status<>'cancelled')>=v_slot.capacity then
    raise exception using errcode='P0001', message='Delivery slot is full; choose another slot';
  end if;
  -- Phone/email are unverified: conservative hard caps, not a claim of OTP verification.
  -- Count cancelled requests too so cancellation cannot bypass the abuse limits.
  if (select count(*) from public.orders where created_at>=now()-interval '24 hours' and regexp_replace(mobile,'[^0-9]','','g') in (v_mobile,'91'||v_mobile))>=3 or
     (select count(*) from public.orders where created_at>=now()-interval '24 hours' and lower(email)=v_email)>=3 or
     (select count(*) from public.orders where created_at>=now()-interval '1 hour')>=50 then
    raise exception using errcode='P0001', message='Checkout limit reached; please contact the store or try later';
  end if;
  perform 1 from public.products p where p.id in (select (e->>'product_id')::uuid from jsonb_array_elements(v_items)e) order by p.id for update;
  if (select count(*) from public.products p join jsonb_array_elements(v_items)e on p.id=(e->>'product_id')::uuid where p.active and p.price>0)<>jsonb_array_length(v_items) then
    raise exception using errcode='22023', message='One or more products are unavailable';
  end if;
  for v_rec in select p.id,p.price,p.stock,(e->>'quantity')::int qty from public.products p join jsonb_array_elements(v_items)e on p.id=(e->>'product_id')::uuid loop
    if v_rec.stock<v_rec.qty then
      raise exception using errcode='P0001', message='One or more products have insufficient stock; refresh your cart';
    end if;
    v_subtotal:=v_subtotal+v_rec.price*v_rec.qty;
  end loop;
  if v_subtotal<299 then raise exception using errcode='22023', message='Minimum subtotal is Rs299 before GST'; end if;
  if v_subtotal>50000 then raise exception using errcode='22023', message='For orders over Rs50000 please contact the store'; end if;
  v_gst:=round(v_subtotal*0.18,2); v_total:=v_subtotal+v_gst;
  if p_expected_total is not null and p_expected_total<>v_total then
    raise exception using errcode='22023', message='Prices changed; refresh your cart and confirm the new total';
  end if;
  insert into public.orders(user_id,customer_name,email,mobile,address,pincode,delivery_date,slot_id,
    subtotal,gst_rate,gst_amount,discount,delivery_charge,total,payment_method,status,notes,area)
  values(auth.uid(),v_name,v_email,v_mobile,v_address,p_pincode,p_delivery_date,p_slot_id,
    v_subtotal,18,v_gst,0,0,v_total,'COD','new',v_notes,'Ranchi '||p_pincode)
  returning id,order_number into v_order_id,v_order_number;
  for v_rec in select p.id,p.sku,p.name,p.price,(e->>'quantity')::int qty from public.products p join jsonb_array_elements(v_items)e on p.id=(e->>'product_id')::uuid loop
    insert into public.order_items(order_id,product_id,sku,product_name,unit_price,quantity,line_total)
      values(v_order_id,v_rec.id,v_rec.sku,v_rec.name,v_rec.price,v_rec.qty,v_rec.price*v_rec.qty);
    update public.products set stock=stock-v_rec.qty where id=v_rec.id;
  end loop;
  -- Do not mutate guest carts by caller-supplied session_key (not ownership proof).
  v_response:=jsonb_build_object('order_id',v_order_id,'order_number',v_order_number,
    'subtotal',v_subtotal,'gst_rate',18,'gst_amount',v_gst,'discount',0,
    'delivery_charge',0,'total',v_total,'payment_method','COD','status','new');
  insert into public.cod_order_requests(idempotency_key,request_hash,order_id,response)
    values(p_idempotency_key,v_hash,v_order_id,v_response);
  return v_response;
end;
$$;
revoke all on function public.place_cod_order(text,text,text,text,jsonb,text,date,uuid,jsonb,text,uuid,numeric) from public, anon, authenticated;
grant execute on function public.place_cod_order(text,text,text,text,jsonb,text,date,uuid,jsonb,text,uuid,numeric) to service_role;
comment on function public.place_cod_order(text,text,text,text,jsonb,text,date,uuid,jsonb,text,uuid,numeric)
  is 'Disabled until approved launch. COD only; min299 +18% GST, free delivery, atomic stock/slot/idempotency. UUID retry key required. No visitor order reads.';

-- Explicit privacy boundary. Existing authenticated admin policies are preserved.
-- Tighten item policy to authenticated so anonymous evaluation never calls the admin helper.
alter policy "order items visible to owner" on public.order_items to authenticated;
revoke all on public.orders, public.order_items, public.payments, public.order_timeline,
  public.order_internal_notes, public.order_assignments, public.order_item_preparation,
  public.delivery_proofs, public.refund_requests, public.customer_notification_events,
  public.profiles, public.addresses, public.carts, public.customer_directory
  from anon;
commit;
