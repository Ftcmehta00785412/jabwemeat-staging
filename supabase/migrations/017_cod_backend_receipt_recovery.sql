-- A random UUID checkout key is a bearer capability for a NON-PII receipt only.
-- This endpoint never returns customer/address/items/contact data or table access.
-- Keep disabled until the same approved launch as place_cod_order.
begin;
create function public.get_cod_order_receipt(p_idempotency_key uuid)
returns jsonb language sql stable security definer
set search_path = pg_catalog, public
set statement_timeout = '5s'
as $$
  select jsonb_build_object(
    'order_id', r.response->'order_id',
    'order_number', r.response->'order_number',
    'subtotal', r.response->'subtotal',
    'gst_rate', r.response->'gst_rate',
    'gst_amount', r.response->'gst_amount',
    'discount', r.response->'discount',
    'delivery_charge', r.response->'delivery_charge',
    'total', r.response->'total',
    'payment_method', r.response->'payment_method',
    'status', r.response->'status'
  ) from public.cod_order_requests r
  where r.idempotency_key=p_idempotency_key;
$$;
revoke all on function public.get_cod_order_receipt(uuid) from public, anon, authenticated;
grant execute on function public.get_cod_order_receipt(uuid) to service_role;
comment on function public.get_cod_order_receipt(uuid) is
  'Read-only non-PII confirmation recovery by high-entropy bearer checkout UUID. NULL if unknown. Stored status is checkout-time status, not live tracking. Disabled until approved COD launch.';
commit;
