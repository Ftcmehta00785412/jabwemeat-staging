-- STAGING ONLY: preserve the restored catalogue without opening public orders.
-- No order, payment, stock, customer or cart records are changed.
-- Both guest and signed-in storefront calls are blocked at the database layer.
-- Do not restore these grants until checkout validation, slot capacity,
-- idempotency and abuse protection have been reviewed and tested.

revoke execute on function public.place_cod_order(text,text,text,text,jsonb,text,date,uuid,jsonb,text)
  from public, anon, authenticated;
revoke execute on function public.save_cart(text,text,text,text,text,jsonb)
  from public, anon, authenticated;

-- Trigger-only helpers are not public APIs. Existing triggers remain installed.
revoke execute on function public.initialize_order_item_preparation()
  from public, anon, authenticated;
revoke execute on function public.initialize_order_operations()
  from public, anon, authenticated;
revoke execute on function public.log_order_notification_event()
  from public, anon, authenticated;
revoke execute on function public.snapshot_order_item_weight()
  from public, anon, authenticated;
