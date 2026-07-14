import { NextRequest, NextResponse } from "next/server";

interface ServerMetric {
  id: number;
  name: string;
  url: string;
  status: string;
  statusCode: number;
  latency: number;
}

export async function POST(req: NextRequest) {
  try {
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return NextResponse.json({ error: "Malformed JSON payload" }, { status: 400 });
    }

    const { mediaType, id, season, episode } = body;

    if (!mediaType || !id) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    if (
      typeof mediaType !== "string" ||
      (mediaType !== "movie" && mediaType !== "tv") ||
      (typeof id !== "string" && typeof id !== "number")
    ) {
      return NextResponse.json({ error: "Invalid parameter types" }, { status: 400 });
    }

    // 5 base providers
    const baseProviders = [
      { id: 1, name: "VidSrc Master", url: `https://vidsrc.to/embed/${mediaType}/${id}${mediaType === "tv" ? `/${season}/${episode}` : ""}` },
      { id: 2, name: "Embed.su Multi", url: `https://embed.su/embed/${mediaType}/${id}${mediaType === "tv" ? `/${season}/${episode}` : ""}` },
      { id: 3, name: "VidSrc CC", url: `https://vidsrc.cc/v2/embed/${mediaType}/${id}${mediaType === "tv" ? `/${season}/${episode}` : ""}` },
      { id: 4, name: "AutoEmbed Multi", url: `https://player.autoembed.cc/embed/${mediaType}/${id}${mediaType === "tv" ? `/${season}/${episode}` : ""}` },
      { id: 5, name: "VidLink AdFree", url: `https://vidlink.pro/${mediaType}/${id}${mediaType === "tv" ? `/${season}/${episode}` : ""}` }
    ];

    // Check all 5 providers in parallel
    const metrics: ServerMetric[] = await Promise.all(
      baseProviders.map(async (provider) => {
        const startTime = Date.now();
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1200);

          const res = await fetch(provider.url, {
            method: "GET",
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
            },
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          return {
            id: provider.id,
            name: provider.name,
            url: provider.url,
            status: res.status >= 200 && res.status < 400 ? "online" : "offline",
            statusCode: res.status,
            latency: Date.now() - startTime
          };
        } catch (err) {
          return {
            id: provider.id,
            name: provider.name,
            url: provider.url,
            status: "offline",
            statusCode: 500,
            latency: 9999
          };
        }
      })
    );

    const apiKey = process.env.GEMINI_API_KEY;
    let decision = {
      bestServerId: 5, // Default fallback to VidLink
      reason: "Heuristic default fallback"
    };

    if (apiKey) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: `You are an expert streaming traffic load balancer. Analyze the following real-time latency and status metrics for 5 video embed servers. 
                  Choose the best server based on these guidelines:
                  1. Prefer servers that are "online".
                  2. Among online servers, prefer the one with the lowest latency.
                  3. If all servers are offline, return server ID 5 as a fallback.
                  
                  Respond ONLY in clean JSON format: { "bestServerId": <number>, "reason": "<string>" }
                  
                  Metrics: ${JSON.stringify(metrics)}`
                }]
              }],
              generationConfig: {
                responseMimeType: "application/json"
              }
            })
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
          const parsed = JSON.parse(rawText.trim());
          if (parsed && typeof parsed.bestServerId === "number") {
            decision = parsed;
          }
        }
      } catch (err) {
        console.error("Gemini API call failed, falling back to heuristics:", err);
      }
    }

    // Heuristic fallback if Gemini didn't make the decision or key is missing
    if (decision.reason === "Heuristic default fallback") {
      const onlineSorted = metrics
        .filter(m => m.status === "online")
        .sort((a, b) => a.latency - b.latency);

      if (onlineSorted.length > 0) {
        decision = {
          bestServerId: onlineSorted[0].id,
          reason: `Heuristics: Selected fastest online server (${onlineSorted[0].latency}ms latency)`
        };
      }
    }

    return NextResponse.json({
      decision,
      metrics
    });
  } catch (error) {
    console.error("Error in gemini-decide route:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
