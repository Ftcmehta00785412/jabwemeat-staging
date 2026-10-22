-- Restore anonymous catalogue reads without exposing the admin helper.
-- Existing public SELECT policies referenced is_admin(), but anonymous users
-- intentionally cannot execute that function. Split visitor and signed-in
-- policies so the catalogue loads without granting any administrative access.
-- No product, customer, stock, order, payment or team records are changed.

alter policy "public products" on public.products to authenticated;
create policy "anonymous active products" on public.products
  for select to anon using (active);

alter policy "public categories" on public.categories to authenticated;
create policy "anonymous active categories" on public.categories
  for select to anon using (active);

alter policy "public slots" on public.delivery_slots to authenticated;
create policy "anonymous active slots" on public.delivery_slots
  for select to anon using (active);

-- Settings administration must never target the anonymous role.
-- The separate public read-only settings policy is preserved.
alter policy "admins manage settings" on public.store_settings to authenticated;
