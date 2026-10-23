-- Immutable order-time invoice data only. No PDF rendering, mail, backfill or
-- catalogue tax classification occurs in a checkout transaction.
begin;

create sequence public.order_invoice_number_seq minvalue 1 maxvalue 999999999999 no cycle;
revoke all on sequence public.order_invoice_number_seq from public, anon, authenticated;

create table public.order_invoices (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete restrict,
  invoice_number text not null unique check (length(invoice_number) between 1 and 16),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  created_at timestamptz not null default clock_timestamp()
);
alter table public.order_invoices enable row level security;
revoke all on public.order_invoices from public, anon, authenticated;
grant select on public.order_invoices to authenticated;
create policy "Invoices permission reads invoice records" on public.order_invoices
  for select to authenticated using (public.has_role_permission('Invoices','View'));

create function public.guard_order_invoice_immutable()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  raise exception using errcode='55000', message='Issued invoice records are immutable';
end;
$$;
revoke all on function public.guard_order_invoice_immutable() from public, anon, authenticated;
create trigger order_invoices_immutable before update or delete on public.order_invoices
  for each row execute function public.guard_order_invoice_immutable();

create function public.guard_issued_order_invoice_number()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if new.invoice_number is distinct from old.invoice_number and exists (
    select 1 from public.order_invoices i where i.order_id=old.id
      and i.invoice_number is distinct from new.invoice_number
  ) then
    raise exception using errcode='55000', message='Issued invoice number is immutable';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_issued_order_invoice_number() from public, anon, authenticated;
create trigger orders_issued_invoice_number_guard before update of invoice_number on public.orders
  for each row execute function public.guard_issued_order_invoice_number();

-- Private helper: order row lock serializes admin retries and the deferred
-- trigger. Existing numbers are retained, never replaced or silently reissued.
create function public.create_order_invoice_snapshot(p_order_id uuid)
returns public.order_invoices language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  o public.orders%rowtype;
  i public.order_invoices%rowtype;
  v_items jsonb; v_sum numeric; v_invalid boolean;
  v_number text; v_cgst numeric(10,2); v_sgst numeric(10,2);
  v_created timestamptz := clock_timestamp();
begin
  select * into o from public.orders where id=p_order_id for update;
  if not found then return null; end if;
  select * into i from public.order_invoices where order_id=o.id;
  if found then return i; end if;

  -- Cancellation/credit-note lifecycle is outside initial issuance. Preserve
  -- already-issued snapshots above, but never newly issue a cancelled order.
  if o.status = 'cancelled' then return null; end if;

  -- Missing historical GST is NOT evidence of zero tax. Only the existing
  -- known 18% intra-state checkout model is eligible; no HSN is invented.
  if o.gst_rate is distinct from 18 or o.gst_amount is null
     or o.gst_amount < 0 or o.subtotal < 0 or o.discount <> 0
     or o.delivery_charge <> 0 or o.total <> o.subtotal+o.gst_amount
     or lower(coalesce(o.address->>'state','')) <> 'jharkhand'
     or o.pincode not in ('834002','834003','834004') then
    return null;
  end if;
  select jsonb_agg(jsonb_build_object('sku',sku,'name',product_name,
      'quantity',quantity,'unit_price',unit_price,'line_total',line_total) order by id),
    sum(line_total), bool_or(quantity<=0 or unit_price<0 or line_total<>unit_price*quantity)
    into v_items,v_sum,v_invalid from public.order_items where order_id=o.id;
  if v_items is null or v_sum is distinct from o.subtotal or coalesce(v_invalid,true) then
    return null;
  end if;

  v_number := o.invoice_number;
  if v_number is not null and length(v_number) not between 1 and 16 then return null; end if;
  if v_number is null then
    -- 15 characters, globally unique sequence. Skip any legacy/manual number
    -- collision without ever overwriting that other order's number.
    loop
      v_number := 'JWM'||lpad(nextval('public.order_invoice_number_seq')::text,12,'0');
      exit when not exists(select 1 from public.orders where invoice_number=v_number)
        and not exists(select 1 from public.order_invoices where invoice_number=v_number);
    end loop;
  end if;
  -- Allocate an odd GST paisa to CGST and the exact remainder to SGST.
  -- Do NOT round both halves independently (that can create a paisa).
  v_cgst := round(o.gst_amount/2,2);
  v_sgst := o.gst_amount-v_cgst;
  insert into public.order_invoices(order_id,invoice_number,created_at,snapshot)
  values(o.id,v_number,v_created,jsonb_build_object(
    'supplier',jsonb_build_object('name','Urban Crave Ventures LLP',
      'gstin','20AAJFU1454F1ZJ','fssai','11126001000123',
      'address','Ground Floor, Shyama Complex, Singh More Hatia, Kalyanpur Road No. 04, Ranchi, Jharkhand - 834003, India',
      'email','support@jabwemeat.com'),
    'order',jsonb_build_object('id',o.id,'number',o.order_number,'created_at',o.created_at,
      'payment_method',o.payment_method,'status',o.status),
    'customer',jsonb_build_object('name',o.customer_name,'email',o.email,'mobile',o.mobile,
      'address',o.address,'pincode',o.pincode),
    'items',v_items,
    'totals',jsonb_build_object('subtotal',o.subtotal,'discount',o.discount,
      'delivery_charge',o.delivery_charge,'gst_rate',o.gst_rate,'gst_amount',o.gst_amount,
      'cgst_amount',v_cgst,'sgst_amount',v_sgst,'total',o.total),
    'invoice',jsonb_build_object('number',v_number,'created_at',v_created),
    'hsn_status','not_supplied'
  )) returning * into i;
  update public.orders set invoice_number=v_number where id=o.id and invoice_number is null;
  return i;
end;
$$;
revoke all on function public.create_order_invoice_snapshot(uuid) from public, anon, authenticated;

create function public.prepare_new_order_invoice()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  -- Subtransaction rolls back BOTH the record and order number on failure.
  -- Valid COD checkout must not fail because of optional invoice preparation.
  begin
    perform public.create_order_invoice_snapshot(new.id);
  exception when others then
    raise warning 'Invoice snapshot preparation deferred; authorised admin retry required';
  end;
  return new;
end;
$$;
revoke all on function public.prepare_new_order_invoice() from public, anon, authenticated;
create constraint trigger orders_prepare_invoice_after_commit
  after insert on public.orders deferrable initially deferred
  for each row execute function public.prepare_new_order_invoice();

create function public.ensure_order_invoice(p_order_id uuid)
returns jsonb language plpgsql security definer
set search_path = pg_catalog, public set statement_timeout = '5s' as $$
declare i public.order_invoices%rowtype;
begin
  if not public.has_role_permission('Invoices','Edit') then
    raise exception using errcode='42501', message='Invoices Edit permission required';
  end if;
  i := public.create_order_invoice_snapshot(p_order_id);
  if i.id is null then
    raise exception using errcode='22023', message='Invoice unavailable: complete saved tax and item data required';
  end if;
  return to_jsonb(i);
end;
$$;
revoke all on function public.ensure_order_invoice(uuid) from public, anon, authenticated;
grant execute on function public.ensure_order_invoice(uuid) to authenticated;

-- Bearer capability: NEVER accept an order id or expose the underlying mapping.
-- The key is a secret random checkout UUID (not a public receipt reference).
-- Unknown/NULL/zero keys all yield NULL. No current status or other order leaks.
create function public.get_order_invoice(p_idempotency_key uuid)
returns jsonb language plpgsql volatile security definer
set search_path = pg_catalog, public set statement_timeout = '5s' as $$
declare v_invoice jsonb;
begin
  -- PostgREST consumes this transaction-local JSON header array. Apply even
  -- when the capability is invalid so every response forbids shared caching.
  perform set_config('response.headers', '[{"Cache-Control":"private, no-store"}]', true);
  select to_jsonb(i) from public.cod_order_requests r
  join public.order_invoices i on i.order_id=r.order_id
  where r.idempotency_key=p_idempotency_key
    and p_idempotency_key <> '00000000-0000-0000-0000-000000000000'::uuid
  into v_invoice;
  return v_invoice;
end;
$$;
revoke all on function public.get_order_invoice(uuid) from public, anon, authenticated;
grant execute on function public.get_order_invoice(uuid) to anon, authenticated;
comment on table public.order_invoices is
  'Immutable issued data. HSN not supplied; GST/HSN compliance requires business review. No PDF or email generation in database.';
comment on function public.get_order_invoice(uuid) is
  'PII-bearing invoice by secret random checkout UUID capability only. Do not log, publish, put in URLs/analytics or share the key. NULL if unavailable. Use private/no-store responses.';
commit;
