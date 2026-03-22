import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Self-contained: no shared module imports.

/** Strip HTML tags and common entities from a string. */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

/** Build a JSON response with CORS headers. */
function okJson(body: Record<string, unknown>, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

/** Write a Netflix content ID → show mapping (ignores duplicate conflicts). */
async function writeNetflixMapping(
  supabase: ReturnType<typeof createClient>,
  showDbId: number,
  contentId: string | undefined
): Promise<void> {
  if (!contentId || !showDbId) return;
  try {
    await supabase
      .from("id_mappings")
      .upsert(
        { show_id: showDbId, platform: "netflix", external_id: contentId },
        { onConflict: "platform,external_id", ignoreDuplicates: true }
      );
  } catch {
    // ignore mapping errors
  }
}

const GEMINI_MODEL = "gemini-3-flash-preview";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Sanitize prompt — exact copy from sanitize-episode-context/index.ts
const SANITIZE_SYSTEM_PROMPT =
  "You are a spoiler safety sanitizer. Clean episode summaries to remove hindsight and future references. Return only the cleaned text.";

const SANITIZE_USER_TEMPLATE = `You are a spoiler safety sanitizer. Clean this episode summary to remove any hindsight or future references.

RAW EPISODE SUMMARY:
{rawText}

USER'S PROGRESS: Season {season}, Episode {episode}

INSTRUCTIONS:
Remove or rewrite any sentence that:
- References events beyond this episode
- Implies future revelations ("later revealed", "foreshadows", "will become")
- Uses hindsight language ("eventually", "over time", "as the series progresses")
- Mentions outcomes not shown yet
- References manga-only content ("In the manga...", "Later in the series...")

Preserve only what a viewer would reasonably know immediately after watching this episode.

OUTPUT: Return ONLY the cleaned summary text. No explanations, no meta-commentary.`;

async function sanitize(
  rawText: string,
  season: number,
  episode: number,
  apiKey: string
): Promise<string | null> {
  try {
    const userMessage = SANITIZE_USER_TEMPLATE
      .replace("{rawText}", rawText)
      .replace("{season}", String(season))
      .replace("{episode}", String(episode));

    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SANITIZE_SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: userMessage }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 2000 },
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { showTitle, platform, season, episode, tvmazeId, netflixContentId, rawEpisode } = await req.json();

    if (!showTitle?.trim() && !netflixContentId) {
      return new Response(
        JSON.stringify({ error: "showTitle or netflixContentId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!GOOGLE_AI_API_KEY) {
      throw new Error("GOOGLE_AI_API_KEY is not configured");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const hasEpisode = typeof season === "number" && typeof episode === "number";

    // ── Step 0: Netflix content ID fast-path ────────────────────────────────

    let showRow: { id: number; tvmaze_id: number | null; anilist_id: number | null; title: string; overview: string | null; overview_source: string | null } | null = null;
    let resolvedTitle = showTitle ?? "";

    if (netflixContentId) {
      const { data: mapping } = await supabase
        .from("id_mappings")
        .select("show_id")
        .eq("platform", "netflix")
        .eq("external_id", netflixContentId)
        .maybeSingle();

      if (mapping?.show_id) {
        const { data: show } = await supabase
          .from("shows")
          .select("id, tvmaze_id, anilist_id, title, overview, overview_source")
          .eq("id", mapping.show_id)
          .maybeSingle();

        if (show?.overview) {
          // Hot-start: return immediately without any external API calls
          return okJson({
            context: show.overview,
            source: show.overview_source,
            resolvedTitle: show.title,
            tvmazeId: show.tvmaze_id,
            anilistId: show.anilist_id,
            showDbId: show.id,
            confidence: "cached",
          }, corsHeaders);
        }

        // Show row exists but overview not yet populated — pre-seed and fall through to lazy populate
        if (show) {
          showRow = show;
          resolvedTitle = show.title ?? resolvedTitle;
        }
      }
    }

    // ── Step 1: DB lookup ────────────────────────────────────────────────────

    // Only run Step 1 DB lookup if Step 0 didn't already populate showRow
    if (!showRow) {
      if (tvmazeId) {
        const { data } = await supabase
          .from("shows")
          .select("id, tvmaze_id, anilist_id, title, overview, overview_source")
          .eq("tvmaze_id", tvmazeId)
          .maybeSingle();
        showRow = data;
      } else if (resolvedTitle) {
        const { data } = await supabase
          .from("shows")
          .select("id, tvmaze_id, anilist_id, title, overview, overview_source")
          .ilike("title", resolvedTitle)
          .maybeSingle();
        showRow = data;
      }
    }

    if (showRow) {
      if (hasEpisode) {
        const { data: epRow } = await supabase
          .from("episodes")
          .select("summary, summary_source")
          .eq("show_id", showRow.id)
          .eq("season", season)
          .eq("episode", episode)
          .maybeSingle();

        if (epRow?.summary) {
          await writeNetflixMapping(supabase, showRow.id, netflixContentId);
          return okJson({
            context: epRow.summary,
            source: epRow.summary_source,
            resolvedTitle: showRow.title ?? resolvedTitle,
            tvmazeId: showRow.tvmaze_id,
            anilistId: showRow.anilist_id,
            showDbId: showRow.id,
            confidence: "cached",
          }, corsHeaders);
        }
      } else if (showRow.overview) {
        await writeNetflixMapping(supabase, showRow.id, netflixContentId);
        return okJson({
          context: showRow.overview,
          source: showRow.overview_source,
          resolvedTitle: showRow.title ?? resolvedTitle,
          tvmazeId: showRow.tvmaze_id,
          anilistId: showRow.anilist_id,
          showDbId: showRow.id,
          confidence: "cached",
        }, corsHeaders);
      }
    }

    // ── Step 2: Lazy populate ────────────────────────────────────────────────

    let resolvedTvmazeId: number | null = tvmazeId ?? showRow?.tvmaze_id ?? null;
    let tvmazeSummary: string | null = null;
    let episodeSummary: string | null = null;
    let showDescription: string | null = null;
    let anilistId: number | null = showRow?.anilist_id ?? null;
    let tvmazeEpisodeUrl: string | null = null;

    // 2a. TVMaze search (only if we don't already have a tvmaze_id)
    if (!resolvedTvmazeId) {
      try {
        const tvmazeSearchRes = await fetch(
          `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(resolvedTitle)}`
        );
        if (tvmazeSearchRes.ok) {
          const tvmazeData = await tvmazeSearchRes.json();
          if (tvmazeData.length > 0) {
            const matched = tvmazeData[0].show;
            resolvedTvmazeId = matched.id;
            resolvedTitle = matched.name;
            if (matched.summary) {
              tvmazeSummary = stripHtml(matched.summary) || null;
            }
          }
        }
      } catch {
        // fall through
      }
    }

    // 2b. TVMaze episode (if we have both a tvmaze_id and season+episode)
    if (resolvedTvmazeId && hasEpisode) {
      const isAbsoluteEpisode = rawEpisode && parseInt(rawEpisode) > 99 && season === 1;
      try {
        if (isAbsoluteEpisode) {
          // Long-running anime: "Episode 1093" has no season context on Crunchyroll.
          // Fetch all episodes and find by airedEpisodeNumber.
          const allEpsRes = await fetch(
            `https://api.tvmaze.com/shows/${resolvedTvmazeId}/episodes?specials=0`
          );
          if (allEpsRes.ok) {
            const allEps: Array<{ id: number; url: string; season: number; number: number; airedEpisodeNumber: number; summary: string | null }> = await allEpsRes.json();
            const target = allEps.find(e => e.airedEpisodeNumber === parseInt(rawEpisode));
            if (target) {
              if (target.summary) episodeSummary = stripHtml(target.summary) || null;
              tvmazeEpisodeUrl = target.url;
            }
          }
        } else {
          const epRes = await fetch(
            `https://api.tvmaze.com/shows/${resolvedTvmazeId}/episodebynumber?season=${season}&number=${episode}`
          );
          if (epRes.ok) {
            const epData = await epRes.json();
            if (epData.summary) episodeSummary = stripHtml(epData.summary) || null;
            if (epData.url) tvmazeEpisodeUrl = epData.url;
          }
        }
      } catch {
        // fall through
      }
    }

    // 2c. AniList (if no episode summary yet)
    if (!episodeSummary) {
      try {
        const anilistQuery = `
          query ($search: String) {
            Media(search: $search, type: ANIME) {
              id
              title { romaji english }
              description(asHtml: false)
            }
          }
        `;
        const anilistRes = await fetch("https://graphql.anilist.co", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: anilistQuery, variables: { search: resolvedTitle } }),
        });
        if (anilistRes.ok) {
          const anilistData = await anilistRes.json();
          const media = anilistData?.data?.Media;
          if (media?.description?.trim()) {
            anilistId = media.id;
            const raw = stripHtml(media.description);
            if (raw) showDescription = raw;
          }
        }
      } catch {
        // fall through
      }
    }

    // 2d. Best raw context
    const bestRaw = episodeSummary ?? showDescription ?? tvmazeSummary ?? null;
    const bestSource = episodeSummary
      ? "tvmaze"
      : showDescription
      ? "anilist"
      : tvmazeSummary
      ? "tvmaze"
      : null;

    if (!bestRaw) {
      return okJson({
        context: null,
        source: null,
        resolvedTitle,
        tvmazeId: resolvedTvmazeId,
        anilistId,
        showDbId: showRow?.id ?? null,
        confidence: "inferred",
      }, corsHeaders);
    }

    // 2e. Sanitize
    const sanitized = await sanitize(
      bestRaw,
      hasEpisode ? season : 1,
      hasEpisode ? episode : 1,
      GOOGLE_AI_API_KEY
    );
    const finalContext = sanitized ?? bestRaw;

    // Add [Show overview] prefix when using show-level (not episode) context
    const contextToStore = episodeSummary
      ? finalContext
      : `[Show overview] ${finalContext}`;

    // 2f. Upsert show row
    let showDbId: number | null = showRow?.id ?? null;

    try {
      if (resolvedTvmazeId) {
        const { data } = await supabase
          .from("shows")
          .upsert(
            {
              tvmaze_id: resolvedTvmazeId,
              anilist_id: anilistId,
              title: resolvedTitle,
              overview: episodeSummary ? showRow?.overview ?? null : contextToStore,
              overview_source: episodeSummary ? showRow?.overview_source ?? null : bestSource,
            },
            { onConflict: "tvmaze_id" }
          )
          .select("id")
          .single();
        if (data) showDbId = data.id;
      } else if (anilistId) {
        const { data } = await supabase
          .from("shows")
          .upsert(
            {
              anilist_id: anilistId,
              title: resolvedTitle,
              overview: episodeSummary ? showRow?.overview ?? null : contextToStore,
              overview_source: episodeSummary ? showRow?.overview_source ?? null : bestSource,
            },
            { onConflict: "anilist_id" }
          )
          .select("id")
          .single();
        if (data) showDbId = data.id;
      } else {
        // No unique ID — SELECT first to avoid duplicates
        const { data: existing } = await supabase
          .from("shows")
          .select("id")
          .ilike("title", resolvedTitle)
          .maybeSingle();
        if (existing) {
          showDbId = existing.id;
          await supabase
            .from("shows")
            .update({
              overview: episodeSummary ? undefined : contextToStore,
              overview_source: episodeSummary ? undefined : bestSource,
            })
            .eq("id", showDbId);
        } else {
          const { data } = await supabase
            .from("shows")
            .insert({ title: resolvedTitle, overview: episodeSummary ? null : contextToStore, overview_source: episodeSummary ? null : bestSource })
            .select("id")
            .single();
          if (data) showDbId = data.id;
        }
      }
    } catch (err) {
      console.error("[get-show-context] show upsert failed:", err);
    }

    // 2g. Upsert episode row
    if (hasEpisode && showDbId && episodeSummary) {
      try {
        await supabase
          .from("episodes")
          .upsert(
            {
              show_id: showDbId,
              season,
              episode,
              summary: contextToStore,
              summary_source: bestSource,
            },
            { onConflict: "show_id,season,episode" }
          );
      } catch (err) {
        console.error("[get-show-context] episode upsert failed:", err);
      }
    }

    // 2h. Insert id_mappings (ignore conflict)
    if (showDbId) {
      const mappings: { show_id: number; platform: string; external_id: string }[] = [];
      if (resolvedTvmazeId) mappings.push({ show_id: showDbId, platform: "tvmaze", external_id: String(resolvedTvmazeId) });
      if (anilistId) mappings.push({ show_id: showDbId, platform: "anilist", external_id: String(anilistId) });
      if (netflixContentId) mappings.push({ show_id: showDbId, platform: "netflix", external_id: netflixContentId });
      if (mappings.length > 0) {
        try {
          await supabase.from("id_mappings").upsert(mappings, { onConflict: "platform,external_id", ignoreDuplicates: true });
        } catch {
          // ignore mapping errors
        }
      }
    }

    return okJson({
      context: contextToStore,
      source: bestSource,
      resolvedTitle,
      tvmazeId: resolvedTvmazeId,
      anilistId,
      showDbId,
      tvmazeEpisodeUrl,
      confidence: "inferred",
    }, corsHeaders);
  } catch (error) {
    console.error("[get-show-context] error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
