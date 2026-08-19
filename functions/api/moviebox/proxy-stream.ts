function isAllowedStreamDomain(hostname: string): boolean {
  const h = hostname.toLowerCase();

  const strictDomains = [
    "aoneroom.com",
    "netfilm.world",
    "hakunaymatata.com",
    "moviebox.ph",
  ];

  if (strictDomains.some(d => h === d || h.endsWith("." + d))) {
    return true;
  }

  const cdnKeywords = [
    "wefeed",
    "cdn",
    "stream",
    "video",
    "media",
    "vod",
    "play",
    "hls",
    "cdnmovie",
    "vccloud",
    "fastly",
    "cloudfront",
    "akamaicontents",
    "storage.googleapis",
    "firebasestorage",
    "s3.amazonaws",
    "r2.cloudflarestorage",
  ];

  const parts = h.split(".");
  return parts.some(part => cdnKeywords.some(kw => part.includes(kw)));
}

export const onRequestGet = async (context: any) => {
  const { request } = context;
  const urlObj = new URL(request.url);
  const targetUrl = urlObj.searchParams.get("url");

  if (!targetUrl) {
    return new Response("Missing url parameter", { status: 400 });
  }

  const rangeHeader = request.headers.get("range");

  let parsedTarget: URL;
  try {
    parsedTarget = new URL(targetUrl);
  } catch (e) {
    return new Response("Invalid url parameter", { status: 400 });
  }

  if (parsedTarget.protocol !== "http:" && parsedTarget.protocol !== "https:") {
    return new Response("Forbidden protocol", { status: 403 });
  }

  const hostname = parsedTarget.hostname.toLowerCase();

  if (!isAllowedStreamDomain(hostname)) {
    console.warn(`[Proxy] Blocked domain: ${hostname}`);
    return new Response("Forbidden target domain", { status: 403 });
  }

  const refererHost = hostname.includes("aoneroom")
    ? "https://h5.aoneroom.com/"
    : "https://moviebox.ph/";

  const headers: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
    "Accept": "*/*",
    "Referer": refererHost,
    "Origin": refererHost.replace(/\/$/, ""),
  };

  if (rangeHeader) {
    headers["Range"] = rangeHeader;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(targetUrl, {
      headers,
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok && response.status !== 206) {
      console.error(`Proxy stream target returned status ${response.status} for: ${targetUrl}`);
      return new Response(`Target returned ${response.status}`, { status: response.status });
    }

    const contentType = response.headers.get("content-type") || "";
    const urlPath = targetUrl.split("?")[0];
    const isHls = urlPath.endsWith(".m3u8") || /mpegurl|m3u8/i.test(contentType);

    if (isHls) {
      const text = await response.text();
      const lines = text.split("\n");
      const baseUrl = new URL(targetUrl);

      const rewrittenLines = lines.map(line => {
        const trimmed = line.trim();
        if (!trimmed) return line;

        if (trimmed.startsWith("#")) {
          if (trimmed.startsWith("#EXT-X-KEY:") || trimmed.startsWith("#EXT-X-MAP:")) {
            return line.replace(/URI="([^"]+)"/g, (_match, uri) => {
              const resolvedUrl = new URL(uri, baseUrl).toString();
              const proxiedUrl = `/api/moviebox/proxy-stream?url=${encodeURIComponent(resolvedUrl)}`;
              return `URI="${proxiedUrl}"`;
            });
          }
          return line;
        }

        try {
          const resolvedUrl = new URL(trimmed, baseUrl).toString();
          return `/api/moviebox/proxy-stream?url=${encodeURIComponent(resolvedUrl)}`;
        } catch {
          return line;
        }
      });

      const rewrittenText = rewrittenLines.join("\n");

      const resHeaders = new Headers();
      resHeaders.set("content-type", contentType || "application/x-mpegURL");
      resHeaders.set("access-control-allow-origin", "*");
      resHeaders.set("cache-control", "no-cache");

      return new Response(rewrittenText, {
        status: response.status,
        headers: resHeaders,
      });
    }

    const resHeaders = new Headers();
    const copyHeaders = [
      "content-type",
      "content-length",
      "content-range",
      "accept-ranges",
      "cache-control",
      "etag",
      "last-modified",
    ];

    copyHeaders.forEach((h) => {
      const val = response.headers.get(h);
      if (val) resHeaders.set(h, val);
    });

    resHeaders.set("access-control-allow-origin", "*");
    resHeaders.set("access-control-allow-methods", "GET, OPTIONS");
    resHeaders.set("access-control-expose-headers", "content-length, content-range, accept-ranges");

    return new Response(response.body, {
      status: response.status,
      headers: resHeaders,
    });
  } catch (err: any) {
    console.error("Proxy stream error:", err);
    if (err.name === "AbortError") {
      return new Response("Gateway Timeout: Upstream server took too long to respond", { status: 504 });
    }
    return new Response(`Bad Gateway: ${err.message}`, { status: 502 });
  }
};
