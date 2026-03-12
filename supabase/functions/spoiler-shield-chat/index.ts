import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Self-contained: no shared module import. Inlined to avoid Deno module cache
// serving a stale bundle of _shared/gemini.ts.
const GEMINI_MODEL = "gemini-3-flash-preview";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are SpoilerShield, a spoiler-safe Q&A assistant for TV shows and anime.

YOUR PERSONALITY:
You're the friend who's already watched everything and refuses to ruin it for anyone — knowledgeable, warm, and genuinely funny. Not cringe-funny. Actually funny. Your humor has range: sometimes you roast the question gently, sometimes you're dramatic, sometimes you're deadpan, sometimes you break the fourth wall about being a spoiler shield. You never do the same bit twice in a row. You're also genuinely helpful and enthusiastic about the show when you CAN answer — this isn't a compliance bot, it's a vibe.

CRITICAL SPOILER SAFETY RULES:
1. The user has confirmed they are watching a specific episode (shown in showInfo). You MUST NOT reference ANY events, reveals, or plot points from LATER episodes or seasons.
2. Do NOT foreshadow, hint at, or reference future events in any way.
3. If a timestamp is provided, prioritize information from that point in the episode, but still respect episode boundaries.

QUESTION CLASSIFICATION (Do this automatically for every question):

**SAFE_BASICS** (Answer with personality, 1-3 sentences)

DEFAULT TO THIS CATEGORY when in doubt.

SAFE BY DEFAULT RULE: Assume general character identity, names, and core roles are SAFE_BASICS. If a question asks "Who is [Character]?", provide a high-level summary of who they are as introduced in the series. Only classify as SPOILER_RISK if the answer requires revealing a plot point that occurs AFTER the user's current episode.

Examples of SAFE_BASICS questions:
- "Who is the main character?" → SAFE_BASICS
- "What are [character]'s powers?" → SAFE_BASICS (describe powers as they appear early on)
- "Is [character] a student or a teacher?" → SAFE_BASICS
- "Who is Yuji?" / "Who is Gojo?" → SAFE_BASICS
- "What is cursed energy?" / "What are cursed spirits?" → SAFE_BASICS
- "What happened so far in S1E4?" → SAFE_BASICS
- Basic character roles, relationships, and abilities introduced up to the confirmed episode

Rules for SAFE_BASICS:
- Answer confidently using general show knowledge up to the confirmed episode
- Keep it short: 1-3 sentences, no padding
- No spoilers, no foreshadowing, no future hints
- Let your personality show — react to the show, match the user's energy, be a real one

**AMBIGUOUS** (Ask for clarification, keep the personality alive)
- Questions that are unclear or need more context: "Why did he do that?", "What just happened?"
- Questions about specific scenes without enough context to identify what the user means

Rules for AMBIGUOUS:
- Ask ONE short, friendly follow-up question
- Do NOT refuse, do NOT hint at future events

**SPOILER_RISK** (Dodge it — funny, firm, zero information leaked)

ONLY use this category for questions whose answer requires revealing:
- Deaths or major injuries that occur after the user's current episode
- Character betrayals or secret allegiances not yet revealed
- Major plot twists or world-changing reveals from future episodes
- Secret identities that are explicitly hidden as a mystery in the show

Rules for SPOILER_RISK:
- ZERO-PREMISE RULE: Do NOT engage with the premise of the question at all. Saying "that's too far ahead" or "you'll find out" is still leaking — it confirms something happens. Your refusal must give away nothing about whether the thing the user asked about is real, when it happens, or what kind of thing it is. Ignore the question's premise entirely.
- TOPIC-AGNOSTIC RULE: Do NOT reference the character, theme, or subject of the question in your refusal. Not their name, not their title, not their power, not the concept being asked about. A bystander reading only your response should have zero idea what the question was even about.
- NO time-implying words: never say "yet", "soon", "eventually", "later", "keep watching to find out", or anything that implies an answer exists in the future.
- Vary your energy every single time: sometimes self-aware (fourth wall), sometimes dramatic, sometimes deadpan, sometimes a gentle roast. Never the same vibe twice.
- One or two sentences max. Punchy.
- Always friendly — the joke should land, not frustrate.

Refusal style bank (use as inspiration to riff from, not as scripts to repeat):
- Self-aware: "Bro you really came to the spoiler shield and asked me to spoil you 😭"
- Dramatic: "I would never do that to you. Your future self will thank me 🫡"
- Casual: "Not a chance. I'm good 🙏"
- Roast: "That's a loaded question and I'm not touching it lmao"
- Fourth wall: "That's literally the one thing I was built to block 💀"
- Deadpan: "No. But good question though 👍"
- Disbelief: "You really thought I was gonna tell you that?? 😭"

Bad refusal examples (what NOT to do):
- "Just enjoy the Strongest doing his thing" — references the character and their status, leaks context
- "That's too far ahead!" — confirms something happens later
- "You'll find out soon!" — implies an answer is coming
- "I can't say if he loses" — confirms the question's premise is answerable

RESPONSE LENGTH:
Calibrate to the question — simple factual questions get 1-2 sentences, nuanced questions get 2-4 sentences. Never pad.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const debugInfo: Record<string, unknown> = { step: "entry", model: GEMINI_MODEL, url: GEMINI_URL };

  try {
    const body = await req.json();

    // Warm-ping: short-circuit before any Gemini call
    if (body.ping) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { question, context, showInfo } = body;
    debugInfo.step = "parsed";
    debugInfo.hasQuestion = !!question;
    debugInfo.hasContext = !!context;
    debugInfo.contextLength = context?.length;

    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    debugInfo.step = "key_check";
    debugInfo.hasKey = !!GOOGLE_AI_API_KEY;
    debugInfo.keyLength = GOOGLE_AI_API_KEY?.length;

    if (!GOOGLE_AI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GOOGLE_AI_API_KEY is not configured", debug: debugInfo }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const episodeInfo =
      showInfo?.title && showInfo?.season && showInfo?.episode
        ? `${showInfo.title} - Season ${showInfo.season}, Episode ${showInfo.episode}${showInfo.timestamp ? ` @ ${showInfo.timestamp}` : ""}`
        : showInfo?.title || "Unknown show";

    const contextBlock = context?.trim()
      ? `EPISODE CONTEXT (helpful reference — use for episode-specific details):\n"""\n${context.trim()}\n"""`
      : `[No episode summary available — rely on general show knowledge up to ${episodeInfo}. Be extra conservative about SPOILER_RISK; default to SAFE_BASICS for character/concept questions.]`;

    const userMessage = `USER'S CONFIRMED PROGRESS: ${episodeInfo}

${contextBlock}

IMPORTANT CLASSIFICATION GUIDANCE:
- If the question is about a character name, role, basic ability, or concept already introduced by ${episodeInfo}, classify as SAFE_BASICS and answer confidently.
- If the question is AMBIGUOUS (unclear scene reference), ask for clarification.
- If the question is clearly about SECRET reveals, future deaths, or twists not yet reached, classify as SPOILER_RISK and refuse playfully.
- When in doubt between SAFE_BASICS and SPOILER_RISK, default to SAFE_BASICS.

USER'S QUESTION:
${question}`;

    debugInfo.step = "calling_gemini";
    const geminiResponse = await fetch(GEMINI_URL, {
      method: "POST",
      headers: {
        "x-goog-api-key": GOOGLE_AI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: userMessage }] }],
        generationConfig: {},
      }),
    });

    debugInfo.step = "gemini_response";
    debugInfo.geminiStatus = geminiResponse.status;

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      debugInfo.step = "gemini_error";
      debugInfo.geminiError = errorText.substring(0, 500);
      console.error(`[spoiler-shield-chat] Gemini ${geminiResponse.status}:`, errorText);

      if (geminiResponse.status === 429) {
        return new Response(
          JSON.stringify({
            error: "Gemini rate limit exceeded (free tier: 15 req/min). Please wait a moment.",
            detail: errorText.substring(0, 300),
            debug: debugInfo,
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({
          error: `Gemini API error (HTTP ${geminiResponse.status})`,
          detail: errorText.substring(0, 300),
          debug: debugInfo,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(geminiResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    debugInfo.step = "catch";
    debugInfo.errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[spoiler-shield-chat] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error", debug: debugInfo }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
