import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Self-contained: no shared module imports.
const GEMINI_MODEL = "gemini-3-flash-preview";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Warm-ping: short-circuit before any Gemini call
    if (body.ping) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { question, showTitle, season, episode } = body;

    if (!question?.trim()) {
      return new Response(
        JSON.stringify({ isSpoilerRisk: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!GOOGLE_AI_API_KEY) {
      // Conservative fallback: treat as spoiler-risk if we can't classify
      console.error("[classify-question] GOOGLE_AI_API_KEY not configured");
      return new Response(
        JSON.stringify({ isSpoilerRisk: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const show = showTitle || "this show";
    const s = season || "?";
    const e = episode || "?";

    const userPrompt =
      `The user is watching ${show} at Season ${s} Episode ${e}.\n` +
      `Does answering the following question require revealing plot points, deaths, character betrayals, ` +
      `or secret reveals that occur AFTER Season ${s} Episode ${e}?\n` +
      `Question: ${question}\n` +
      `Answer YES or NO only.`;

    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: {
        "x-goog-api-key": GOOGLE_AI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: "You are a spoiler-risk classifier. Answer only YES or NO. No punctuation, no explanation." }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 5 },
      }),
    });

    if (!response.ok) {
      console.error("[classify-question] Gemini error:", response.status);
      // Conservative fallback
      return new Response(
        JSON.stringify({ isSpoilerRisk: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
    const isSpoilerRisk = text.toUpperCase().startsWith("YES");

    return new Response(
      JSON.stringify({ isSpoilerRisk }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[classify-question] error:", error);
    // Conservative fallback on any error
    return new Response(
      JSON.stringify({ isSpoilerRisk: true }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
