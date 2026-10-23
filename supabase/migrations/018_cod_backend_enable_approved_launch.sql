-- PREPARED ONLY. Do not apply until the compatible frontend is deployed and the
-- parent explicitly requests launch. This is the only migration granting checkout.
-- No gateway, stock, products, pincodes, historical orders or admin roles change.
begin;
do $$
declare v_function oid:=to_regprocedure('public.place_cod_order(text,text,text,text,jsonb,text,date,uuid,jsonb,text,uuid,numeric)');
begin
  if v_function is null or not exists(select 1 from pg_proc where oid=v_function and prosecdef and prosrc like '%pg_advisory_xact_lock%' and prosrc like '%cod_order_requests%') then
    raise exception 'Launch blocked: hardened idempotent checkout function missing';
  end if;
  if to_regprocedure('public.get_cod_order_receipt(uuid)') is null then
    raise exception 'Launch blocked: non-PII checkout receipt recovery missing';
  end if;
  if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='place_cod_order' and p.oid<>v_function) then
    raise exception 'Launch blocked: unexpected legacy checkout overload';
  end if;
  if has_table_privilege('anon','public.orders','select') or has_table_privilege('anon','public.order_items','select') or
     has_table_privilege('anon','public.orders','truncate') or has_table_privilege('authenticated','public.cod_order_requests','select') then
    raise exception 'Launch blocked: customer privacy boundary not hardened';
  end if;
  if not exists(select 1 from public.products p join public.categories c on c.id=p.category_id where p.active and c.active and p.stock>0 and p.price>0) then
    raise exception 'Launch blocked: no saleable stock; obtain inventory approval, do not invent stock';
  end if;
  if not exists(select 1 from public.delivery_slots where active and capacity>0 and end_time>start_time) then
    raise exception 'Launch blocked: no active configured delivery windows';
  end if;
  if not exists(select 1 from public.store_settings where key='serviceable_pins' and jsonb_typeof(value)='array' and jsonb_array_length(value)>0) then
    raise exception 'Launch blocked: no configured delivery pincodes';
  end if;
  if not exists(select 1 from public.store_settings where key='minimum_cart' and value='299') or
     not exists(select 1 from public.store_settings where key='gst_rate' and value='18') or
     not exists(select 1 from public.store_settings where key='delivery_charge' and value='0') or
     not exists(select 1 from public.store_settings where key='first_order_discount' and value='0') or
     not exists(select 1 from public.store_settings where key='online_payments_enabled' and value='false') or
     not exists(select 1 from public.store_settings where key='cod_enabled' and value='true') then
    raise exception 'Launch blocked: COD/minimum/GST/free-delivery/no-gateway settings differ from approval';
  end if;
end $$;
update public.store_settings set value='true' where key='ordering_enabled';
revoke all on function public.place_cod_order(text,text,text,text,jsonb,text,date,uuid,jsonb,text,uuid,numeric) from public;
grant execute on function public.place_cod_order(text,text,text,text,jsonb,text,date,uuid,jsonb,text,uuid,numeric) to anon, authenticated;
revoke all on function public.get_cod_order_receipt(uuid) from public;
grant execute on function public.get_cod_order_receipt(uuid) to anon, authenticated;
notify pgrst, 'reload schema';
commit;
