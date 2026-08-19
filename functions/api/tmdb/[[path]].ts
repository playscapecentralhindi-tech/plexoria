interface Env {
  TMDB_API_BASE?: string;
  TMDB_API_KEY?: string;
  NEXT_PUBLIC_TMDB_API_KEY?: string;
}

const cache = new Map<string, { data: any; expiry: number }>();
const LIST_CACHE_TTL = 10 * 60 * 1000;
const DETAIL_CACHE_TTL = 2 * 60 * 60 * 1000;
const DEFAULT_TMDB_KEY = "0abe7993c446da1294a11718bd3f78a0";

export const onRequestGet = async (context: any) => {
  const { request, env, params } = context;
  const urlObj = new URL(request.url);
  const searchParams = urlObj.searchParams;

  const pathParts = Array.isArray(params.path)
    ? params.path
    : typeof params.path === "string"
    ? [params.path]
    : [];
  const endpoint = pathParts.join("/");

  const tmdbBase = env.TMDB_API_BASE || "https://api.themoviedb.org/3";
  const tmdbKey = env.TMDB_API_KEY || env.NEXT_PUBLIC_TMDB_API_KEY || DEFAULT_TMDB_KEY;

  const targetUrl = new URL(`${tmdbBase}/${endpoint}`);
  searchParams.forEach((value, key) => {
    targetUrl.searchParams.append(key, value);
  });
  targetUrl.searchParams.append("api_key", tmdbKey);

  const cacheKey = targetUrl.toString();
  const cached = cache.get(cacheKey);
  const now = Date.now();

  if (cached && cached.expiry > now) {
    return new Response(JSON.stringify(cached.data), {
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const res = await fetch(targetUrl.toString(), {
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ error: "TMDB request failed" }), {
        status: res.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    if (cache.size >= 200) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey !== undefined) cache.delete(oldestKey);
    }
    const isDetail = endpoint.includes("movie") || endpoint.includes("tv") || endpoint.includes("person");
    const cacheTtl = isDetail ? DETAIL_CACHE_TTL : LIST_CACHE_TTL;
    cache.set(cacheKey, { data, expiry: now + cacheTtl });

    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
