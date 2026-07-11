import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

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
    const response = await fetch(targetUrl, {
      headers,
      method: "GET",
    });

    if (!response.ok && response.status !== 206) {
      console.error(`Proxy stream target returned status ${response.status}`);
      return new NextResponse(`Target returned ${response.status}`, { status: response.status });
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
    return new NextResponse(`Proxy error: ${err.message}`, { status: 500 });
  }
}
