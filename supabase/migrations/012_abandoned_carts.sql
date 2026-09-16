-- Abandoned cart lifecycle and dashboard permissions.
alter type public.cart_status add value if not exists 'abandoned';
alter table public.role_permissions drop constraint if exists role_permissions_area_check;
alter table public.role_permissions add constraint role_permissions_area_check check (area in ('Dashboard','Orders','Inventory','Customers','Abandoned Carts','Invoices','Delivery slots','Team'));
insert into public.role_permissions(role, area, permission) values
 ('Owner','Abandoned Carts','Full'), ('Admin','Abandoned Carts','Full'), ('Manager','Abandoned Carts','Edit'), ('Staff','Abandoned Carts','View')
on conflict (role, area) do nothing;
