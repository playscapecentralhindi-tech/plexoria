import { NextRequest, NextResponse } from "next/server";

// export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  // Get the Range header from the client's request (critical for video seeking)
  const rangeHeader = req.headers.get("range");

  let parsedTarget: URL;
  try {
    parsedTarget = new URL(targetUrl);
  } catch (e) {
    return new NextResponse("Invalid url parameter", { status: 400 });
  }

  // SSRF Protection: Restrict protocol and allowed streaming domains
  if (parsedTarget.protocol !== "http:" && parsedTarget.protocol !== "https:") {
    return new NextResponse("Forbidden protocol", { status: 403 });
  }

  const hostname = parsedTarget.hostname.toLowerCase();
  const isAllowedHost =
    hostname === "aoneroom.com" || hostname.endsWith(".aoneroom.com") ||
    hostname === "netfilm.world" || hostname.endsWith(".netfilm.world") ||
    hostname === "hakunaymatata.com" || hostname.endsWith(".hakunaymatata.com");

  if (!isAllowedHost) {
    return new NextResponse("Forbidden target domain", { status: 403 });
  }

  // Determine CDN domain to set appropriate Referer bypass
  const refererHost = hostname.includes("aoneroom") 
    ? "https://h5.aoneroom.com/" 
    : "https://netfilm.world/";

  const headers: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
    "Accept": "*/*",
    "Referer": refererHost,
  };

  if (rangeHeader) {
    headers["Range"] = rangeHeader;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s connection setup timeout

    const response = await fetch(targetUrl, {
      headers,
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok && response.status !== 206) {
      console.error(`Proxy stream target returned status ${response.status}`);
      return new NextResponse(`Target returned ${response.status}`, { status: response.status });
    }

    const contentType = response.headers.get("content-type") || "";
    const isHls = targetUrl.split("?")[0].endsWith(".m3u8") || 
                  /mpegurl|m3u8/i.test(contentType);

    if (isHls) {
      const text = await response.text();
      const lines = text.split("\n");
      const baseUrl = new URL(targetUrl);
      const rewrittenLines = lines.map(line => {
        const trimmed = line.trim();
        if (!trimmed) return line;

        if (trimmed.startsWith("#")) {
          if (trimmed.startsWith("#EXT-X-KEY:") || trimmed.startsWith("#EXT-X-MAP:")) {
            return line.replace(/URI="([^"]+)"/g, (match, uri) => {
              const resolvedUrl = new URL(uri, baseUrl).toString();
              const proxiedUrl = `/api/moviebox/proxy-stream?url=${encodeURIComponent(resolvedUrl)}`;
              return `URI="${proxiedUrl}"`;
            });
          }
          return line;
        }

        const resolvedUrl = new URL(trimmed, baseUrl).toString();
        return `/api/moviebox/proxy-stream?url=${encodeURIComponent(resolvedUrl)}`;
      });
      const rewrittenText = rewrittenLines.join("\n");

      const resHeaders = new Headers();
      const copyHeaders = [
        "content-type",
        "cache-control",
      ];

      copyHeaders.forEach((h) => {
        const val = response.headers.get(h);
        if (val) {
          resHeaders.set(h, val);
        }
      });

      if (!resHeaders.has("content-type")) {
        resHeaders.set("content-type", contentType || "application/x-mpegURL");
      }

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
    ];

    copyHeaders.forEach((h) => {
      const val = response.headers.get(h);
      if (val) {
        resHeaders.set(h, val);
      }
    });

    return new Response(response.body, {
      status: response.status,
      headers: resHeaders,
    });
  } catch (err: any) {
    console.error("Proxy stream error:", err);
    if (err.name === "AbortError") {
      return new NextResponse("Gateway Timeout: Upstream server took too long to respond", { status: 504 });
    }
    return new NextResponse(`Bad Gateway: Proxy error: ${err.message}`, { status: 502 });
  }
}
