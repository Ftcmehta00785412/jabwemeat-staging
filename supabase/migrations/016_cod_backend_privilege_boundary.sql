-- RLS does not protect TRUNCATE. Browser roles do not need table ownership-like
-- privileges. Preserve authenticated admin SELECT/INSERT/UPDATE/DELETE policies.
begin;
revoke all on all tables in schema public from anon;
grant select on public.products, public.categories, public.delivery_slots, public.store_settings to anon;
revoke truncate, references, trigger on all tables in schema public from public, authenticated;
-- MAINTAIN exists on Postgres 17+; no browser role needs maintenance rights.
do $$ begin
  if current_setting('server_version_num')::int>=170000 then
    execute 'revoke maintain on all tables in schema public from public, anon, authenticated';
  end if;
end $$;
revoke all on sequence public.order_number_seq from public, anon, authenticated;
-- Checkout is still deliberately disabled after this migration.
revoke all on function public.place_cod_order(text,text,text,text,jsonb,text,date,uuid,jsonb,text,uuid,numeric) from public, anon, authenticated;
commit;
