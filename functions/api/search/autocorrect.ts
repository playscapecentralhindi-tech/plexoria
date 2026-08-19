interface Env {
  GEMINI_API_KEY?: string;
}

const autocorrectCache = new Map<string, { corrected: string; changed: boolean }>();

export const onRequestGet = async (context: any) => {
  const { request, env } = context;
  const urlObj = new URL(request.url);
  const query = urlObj.searchParams.get("query");

  if (!query || query.trim().length < 3) {
    return new Response(JSON.stringify({ corrected: query || "", changed: false }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const cacheKey = query.trim().toLowerCase();
  if (autocorrectCache.has(cacheKey)) {
    return new Response(JSON.stringify(autocorrectCache.get(cacheKey)), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ corrected: query, changed: false }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a search correction engine. Correct the spelling of the movie, TV show, anime, or drama title if it is misspelled.
              Examples:
              - "neja 2" -> "Ne Zha 2"
              - "neza 2" -> "Ne Zha 2"
              - "avater" -> "Avatar"
              - "spidrman" -> "Spider-Man"
              - "titanic" -> "Titanic"
              
              If the query is already correct, or is not a movie/show title, or you are unsure, return the original query exactly.
              Respond ONLY in JSON format: { "corrected": "<string>", "changed": <boolean> }
              
              User query: "${query}"`
            }]
          }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      }
    );

    if (res.ok) {
      const data: any = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const parsed = JSON.parse(rawText.trim());
      if (parsed && typeof parsed.corrected === "string") {
        if (autocorrectCache.size >= 500) {
          const oldestKey = autocorrectCache.keys().next().value;
          if (oldestKey !== undefined) autocorrectCache.delete(oldestKey);
        }
        autocorrectCache.set(cacheKey, parsed);
        return new Response(JSON.stringify(parsed), {
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ corrected: query, changed: false }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Autocorrect Gemini API call failed:", err);
    return new Response(JSON.stringify({ corrected: query, changed: false }), {
      headers: { "Content-Type": "application/json" },
    });
  }
};
