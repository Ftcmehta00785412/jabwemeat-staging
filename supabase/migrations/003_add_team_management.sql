create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique check (email = lower(email)),
  role text not null check (role in ('Owner','Admin','Manager','Staff')),
  status text not null default 'Active' check (status in ('Active','Inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger team_members_updated before update on public.team_members for each row execute function public.set_updated_at();
alter table public.team_members enable row level security;
insert into public.team_members(name,email,role,status) values ('Sita Mehra','sita.mehra@manthanworld.com','Owner','Active');
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.team_members where email=lower(coalesce(auth.jwt()->>'email','')) and status='Active');
$$;
revoke all on function public.is_admin() from public,anon,authenticated;
grant execute on function public.is_admin() to authenticated;
create policy "active team can view team" on public.team_members for select to authenticated using (public.is_admin());
create policy "active team can add team" on public.team_members for insert to authenticated with check (public.is_admin());
create policy "active team can update team" on public.team_members for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "active team can remove team" on public.team_members for delete to authenticated using (public.is_admin());
alter publication supabase_realtime add table public.team_members;
create index team_members_status_idx on public.team_members(status);
