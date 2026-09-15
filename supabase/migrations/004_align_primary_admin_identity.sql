-- Keep the primary administrator identity consistent across legacy and team records.
delete from public.admin_users
where email = 'sita.mehra@manthanworld.com';

insert into public.admin_users (email, display_name)
values ('vinay@manthanworld.com', 'Vinay Mehta')
on conflict (email) do update
set display_name = excluded.display_name;

delete from public.team_members
where email = 'sita.mehra@manthanworld.com';

insert into public.team_members (name, email, role, status)
values ('Vinay Mehta', 'vinay@manthanworld.com', 'Admin', 'Active')
on conflict (email) do update
set name = excluded.name;
