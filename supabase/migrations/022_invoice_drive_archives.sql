-- Archive metadata only; never deletes original orders, invoice snapshots or tax records.
begin;
create table public.order_invoice_drive_archives (
  invoice_id uuid primary key references public.order_invoices(id) on delete restrict,
  state text not null check(state in ('processing','archived','failed')),
  worker_id uuid,
  lease_until timestamptz,
  next_attempt_at timestamptz not null default now(),
  attempts integer not null default 0,
  archive_date date,
  folder_id text,
  file_id text,
  file_name text,
  file_url text,
  source_sha256 text,
  file_sha256 text,
  size_bytes bigint,
  verified_at timestamptz,
  last_error_code text,
  updated_at timestamptz not null default now(),
  check(state <> 'archived' or (file_id is not null and folder_id is not null
    and file_sha256 ~ '^[a-f0-9]{64}$' and source_sha256 ~ '^[a-f0-9]{64}$'
    and size_bytes > 0 and verified_at is not null))
);
alter table public.order_invoice_drive_archives enable row level security;
revoke all on public.order_invoice_drive_archives from public,anon,authenticated;
grant select on public.order_invoice_drive_archives to authenticated;
create policy "Invoice archive permission reads" on public.order_invoice_drive_archives
  for select to authenticated using (public.has_role_permission('Invoices','View'));
comment on table public.order_invoice_drive_archives is 'Private Drive archive metadata, leases and upload verification; no PDF binary. Browser writes are prohibited.';
commit;
