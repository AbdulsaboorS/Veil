-- Subtitle cues cache: stores pre-parsed timestamp→text cues per episode.
-- Fetched once from OpenSubtitles, cached forever. Eliminates repeated API calls.
CREATE TABLE IF NOT EXISTS subtitle_cues (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tvmaze_id  integer     NOT NULL,
  season     integer     NOT NULL,
  episode    integer     NOT NULL,
  cues       jsonb       NOT NULL,  -- [{startMs, endMs, text}]
  created_at timestamptz DEFAULT now(),
  UNIQUE (tvmaze_id, season, episode)
);
