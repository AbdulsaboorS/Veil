-- shows: one row per unique TV show/anime
create table public.shows (
  id             bigserial primary key,
  tvmaze_id      integer unique,
  anilist_id     integer unique,
  tmdb_id        integer,
  title          text not null,
  overview       text,          -- sanitized show-level description
  overview_source text,         -- 'tvmaze' | 'anilist' | 'websearch'
  media_type     text,          -- 'anime' | 'live_action' | 'movie'
  confidence     text not null default 'inferred',
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- episodes: per-episode summaries
create table public.episodes (
  id             bigserial primary key,
  show_id        bigint not null references public.shows(id) on delete cascade,
  season         integer not null,
  episode        integer not null,
  summary        text,          -- sanitized episode summary
  summary_source text,          -- 'tvmaze' | 'anilist' | 'websearch'
  confidence     text not null default 'inferred',
  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),
  unique (show_id, season, episode)
);

-- id_mappings: platform-specific external IDs for cross-reference
create table public.id_mappings (
  id           bigserial primary key,
  show_id      bigint not null references public.shows(id) on delete cascade,
  platform     text not null check (platform in ('netflix', 'crunchyroll', 'other', 'tvmaze', 'anilist', 'tmdb')),
  external_id  text not null,
  confidence   text not null default 'inferred',
  created_at   timestamptz default now(),
  unique (platform, external_id)
);

-- Indexes
create index on public.shows (tvmaze_id);
create index on public.shows (anilist_id);
create index on public.shows (lower(title));
create index on public.episodes (show_id, season, episode);
create index on public.id_mappings (show_id, platform);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger shows_updated_at    before update on public.shows    for each row execute function public.set_updated_at();
create trigger episodes_updated_at before update on public.episodes for each row execute function public.set_updated_at();

-- RLS: public read, writes via service_role (bypasses RLS)
alter table public.shows       enable row level security;
alter table public.episodes    enable row level security;
alter table public.id_mappings enable row level security;

create policy "public read" on public.shows       for select using (true);
create policy "public read" on public.episodes    for select using (true);
create policy "public read" on public.id_mappings for select using (true);
