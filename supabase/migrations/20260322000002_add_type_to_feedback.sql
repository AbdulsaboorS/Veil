alter table public.feedback
  add column if not exists type text not null default 'feedback';
