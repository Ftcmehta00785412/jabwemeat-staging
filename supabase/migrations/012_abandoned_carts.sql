-- Abandoned cart lifecycle and automatic recovery on completed orders.
create or replace function public.mark_cart_recovered() returns trigger language plpgsql security definer set search_path=public as $$
begin
  update public.carts set status='recovered', updated_at=now()
  where status in ('active','abandoned') and ((user_id is not null and user_id=NEW.user_id) or (lower(email)=lower(NEW.email) and regexp_replace(mobile,'\\D','','g')=regexp_replace(NEW.mobile,'\\D','','g')));
  return NEW;
end; $$;
drop trigger if exists orders_recover_cart on public.orders;
create trigger orders_recover_cart after insert or update of status on public.orders for each row when (NEW.status <> 'cancelled') execute function public.mark_cart_recovered();
-- Existing carts become abandoned after 24 hours without activity; no outbound marketing is performed.
update public.carts set status='abandoned' where status='active' and updated_at < now() - interval '24 hours';
