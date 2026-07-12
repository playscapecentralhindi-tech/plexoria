import { NextRequest, NextResponse } from "next/server";

const autocorrectCache = new Map<string, { corrected: string; changed: boolean }>();

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const query = searchParams.get("query");

  if (!query || query.trim().length < 3) {
    return NextResponse.json({ corrected: query || "", changed: false });
  }

  const cacheKey = query.trim().toLowerCase();
  if (autocorrectCache.has(cacheKey)) {
    return NextResponse.json(autocorrectCache.get(cacheKey));
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ corrected: query, changed: false });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    let res;
    try {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          signal: controller.signal,
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
    } finally {
      clearTimeout(timeoutId);
    }

    if (res.ok) {
      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const parsed = JSON.parse(rawText.trim());
      if (parsed && typeof parsed.corrected === "string") {
        // Cache the result
        if (autocorrectCache.size >= 500) {
          const oldestKey = autocorrectCache.keys().next().value;
          if (oldestKey !== undefined) autocorrectCache.delete(oldestKey);
        }
        autocorrectCache.set(cacheKey, parsed);
        return NextResponse.json(parsed);
      }
    }

    return NextResponse.json({ corrected: query, changed: false });
  } catch (err) {
    console.error("Autocorrect Gemini API call failed:", err);
    return NextResponse.json({ corrected: query, changed: false });
  }
}
