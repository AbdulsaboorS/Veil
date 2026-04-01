-- subtitle_cues is only read/written by Edge Functions using the service role.
-- Anon must not access this table (Supabase linter: rls_disabled_in_public).

alter table public.subtitle_cues enable row level security;

-- Intentionally no policies for anon/authenticated: default deny.
-- service_role bypasses RLS for fetch-episode-subtitles upserts/selects.
