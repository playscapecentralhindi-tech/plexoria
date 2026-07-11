import { NextRequest, NextResponse } from "next/server";

// Simple in-memory cache for development and production speedups
const cache = new Map<string, { data: any; expiry: number }>();
const LIST_CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache TTL for lists
const DETAIL_CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours cache TTL for details

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const { path } = params;
  const searchParams = req.nextUrl.searchParams;
  
  // Construct the TMDB API URL
  const endpoint = path.join("/");
  const url = new URL(`${process.env.TMDB_API_BASE}/${endpoint}`);
  
  // Append original query parameters
  searchParams.forEach((value, key) => {
    url.searchParams.append(key, value);
  });
  
  // Append TMDB v3 API Key
  if (process.env.TMDB_API_KEY) {
    url.searchParams.append("api_key", process.env.TMDB_API_KEY);
  }

  const cacheKey = url.toString();
  const cached = cache.get(cacheKey);
  const now = Date.now();

  if (cached && cached.expiry > now) {
    console.log(`[Cache Hit] Serving TMDB request: ${endpoint}`);
    return NextResponse.json(cached.data);
  }

  try {
    const logUrl = new URL(url.toString());
    logUrl.searchParams.delete("api_key");
    console.log(`[Cache Miss] Querying TMDB: ${logUrl.toString()}`);
    
    const res = await fetch(url.toString(), {
      headers: {
        "Content-Type": "application/json",
      },
      next: { revalidate: 3600 }, // Fallback to Next.js native ISR
    });

    if (!res.ok) {
      console.error(`TMDB API Error: ${res.status} ${res.statusText}`);
      return NextResponse.json(
        { error: "TMDB request failed" },
        { status: res.status }
      );
    }

    const data = await res.json();
    
    // Save to in-memory cache with size-based boundary (Max 200 entries, FIFO eviction)
    if (cache.size >= 200) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey !== undefined) {
        cache.delete(oldestKey);
      }
    }
    const isDetail = path.includes("movie") || path.includes("tv") || path.includes("person");
    const cacheTtl = isDetail ? DETAIL_CACHE_TTL : LIST_CACHE_TTL;
    cache.set(cacheKey, { data, expiry: now + cacheTtl });

    return NextResponse.json(data);
  } catch (error) {
    console.error("TMDB proxy error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
