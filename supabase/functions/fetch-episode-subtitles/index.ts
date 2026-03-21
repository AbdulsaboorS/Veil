import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Self-contained: no shared module imports.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Cue {
  startMs: number;
  endMs: number;
  text: string;
}

/** Parse "HH:MM:SS,mmm" or "HH:MM:SS.mmm" into milliseconds. */
function parseTimestampMs(ts: string): number {
  const normalized = ts.trim().replace(",", ".");
  const [hms, msPart] = normalized.split(".");
  const [h, m, s] = hms.split(":").map(Number);
  return (h * 3600 + m * 60 + s) * 1000 + Number(msPart ?? 0);
}

/** Parse an SRT file into cues. */
function parseSrt(text: string): Cue[] {
  const cues: Cue[] = [];
  const blocks = text.replace(/\r\n/g, "\n").split(/\n{2,}/);
  for (const block of blocks) {
    const lines = block.trim().split("\n");
    if (lines.length < 2) continue;
    const timeLine = lines.find((l) => l.includes("-->"));
    if (!timeLine) continue;
    const [startRaw, endRaw] = timeLine.split("-->").map((s) => s.trim());
    const textLines = lines.filter(
      (l) => !l.includes("-->") && !/^\d+$/.test(l.trim())
    );
    const rawText = textLines.join(" ").replace(/<[^>]*>/g, "").trim();
    if (!rawText) continue;
    try {
      cues.push({
        startMs: parseTimestampMs(startRaw),
        endMs: parseTimestampMs(endRaw),
        text: rawText,
      });
    } catch {
      // skip malformed cue
    }
  }
  return cues;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { tvmazeId, season, episode } = await req.json();
    if (!tvmazeId || season == null || episode == null) {
      return new Response(
        JSON.stringify({ error: "tvmazeId, season, episode required" }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check cache first
    const { data: cached } = await supabase
      .from("subtitle_cues")
      .select("cues")
      .eq("tvmaze_id", tvmazeId)
      .eq("season", season)
      .eq("episode", episode)
      .single();

    if (cached?.cues) {
      return new Response(
        JSON.stringify({ cues: cached.cues, source: "cache" }),
        { headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    // Get show info from TVMaze (IMDB ID + title for fallback search)
    const tvmazeResp = await fetch(`https://api.tvmaze.com/shows/${tvmazeId}`);
    if (!tvmazeResp.ok) throw new Error("TVMaze lookup failed");
    const tvmazeData = await tvmazeResp.json();
    const imdbId: string | undefined = tvmazeData.externals?.imdb;
    const showName: string = tvmazeData.name ?? "";

    const apiKey = Deno.env.get("OPENSUBTITLES_API_KEY")!;
    const osHeaders = { "Api-Key": apiKey, "Content-Type": "application/json" };
    const baseParams = `&season_number=${season}&episode_number=${episode}&languages=en`;

    // Helper: run a single OpenSubtitles search and return results array
    async function osSearch(query: string): Promise<unknown[]> {
      const url = `https://api.opensubtitles.com/api/v1/subtitles?${query}${baseParams}`;
      const r = await fetch(url, { headers: osHeaders });
      if (!r.ok) return [];
      const d = await r.json();
      return d.data ?? [];
    }

    let results: unknown[] = [];

    // Strategy 1: parent_imdb_id (show-level ID + season/episode) — correct for TV
    if (imdbId) {
      const imdbNumeric = imdbId.replace(/^tt0*/, "");
      results = await osSearch(`parent_imdb_id=${imdbNumeric}`);
    }

    // Strategy 2: imdb_id — in case OS indexed this show with episode-level IDs
    if (!results.length && imdbId) {
      const imdbNumeric = imdbId.replace(/^tt0*/, "");
      results = await osSearch(`imdb_id=${imdbNumeric}`);
    }

    // Strategy 3: Title query fallback
    if (!results.length && showName) {
      const encodedName = encodeURIComponent(showName);
      results = await osSearch(`query=${encodedName}`);
    }

    if (!results.length) throw new Error("No subtitles found on OpenSubtitles");

    // Prefer SRT (simpler to parse); fall back to first result
    const srtResult =
      results.find((r: any) =>
        r?.attributes?.files?.[0]?.file_name?.toLowerCase().endsWith(".srt")
      ) ?? results[0];
    const fileId = (srtResult as any)?.attributes?.files?.[0]?.file_id;
    if (!fileId) throw new Error("No file_id in OpenSubtitles results");

    // Request download link
    const dlResp = await fetch("https://api.opensubtitles.com/api/v1/download", {
      method: "POST",
      headers: { "Api-Key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ file_id: fileId }),
    });
    if (!dlResp.ok) {
      throw new Error(`OpenSubtitles download request failed: ${dlResp.status}`);
    }
    const dlData = await dlResp.json();
    const downloadUrl: string | undefined = dlData.link;
    if (!downloadUrl) throw new Error("No download link in response");

    // Download the file
    const subResp = await fetch(downloadUrl);
    if (!subResp.ok) throw new Error("Subtitle file download failed");
    const subText = await subResp.text();

    // Parse SRT → cues
    const cues = parseSrt(subText);
    if (!cues.length) throw new Error("No cues parsed from subtitle file");

    // Cache in DB
    await supabase.from("subtitle_cues").upsert(
      { tvmaze_id: tvmazeId, season, episode, cues },
      { onConflict: "tvmaze_id,season,episode" }
    );

    return new Response(JSON.stringify({ cues, source: "opensubtitles" }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[fetch-episode-subtitles]", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
