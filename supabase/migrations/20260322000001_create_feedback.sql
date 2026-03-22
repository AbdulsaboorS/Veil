create table public.feedback (
  id          bigserial primary key,
  text        text        not null,
  show_title  text,
  platform    text,
  season      text,
  episode     text,
  created_at  timestamptz default now() not null
);

-- Index for admin dashboard ordering (order=created_at.desc)
create index on public.feedback (created_at desc);

-- RLS
alter table public.feedback enable row level security;

-- Allow anon reads (admin dashboard uses anon key + password gate)
create policy "anon read" on public.feedback
  for select using (true);

-- Service role writes bypass RLS — no insert policy needed for service_role
