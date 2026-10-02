-- Run once in the Supabase SQL editor. Tiny table the /api/keepalive cron reads to keep the project awake.
create table if not exists public.keepalive (
  id int primary key,
  created_at timestamptz not null default now()
);

insert into public.keepalive (id) values (1) on conflict do nothing;

alter table public.keepalive enable row level security;

create policy "keepalive is readable by anyone"
  on public.keepalive for select
  to anon, authenticated
  using (true);
