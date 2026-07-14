export type MediaType = "movie" | "tv" | "person";

export interface MediaItem {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  original_language?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  media_type?: MediaType;
  genre_ids: number[];
  popularity: number;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  vote_count: number;
}

export interface PaginatedResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

// Localize backend error messages (e.g., Chinese API error strings) to English
function localizeError(message: string): string {
  const errorMap: Record<string, string> = {
    "请求超时": "Request timed out",
    "超时": "timed out",
    "服务器错误": "Server error",
    "未找到": "Not found",
    "请稍后重试": "Please try again later",
  };
  let result = message;
  for (const [chinese, english] of Object.entries(errorMap)) {
    result = result.replace(new RegExp(chinese, "g"), english);
  }
  // If still contains non-ASCII, replace with generic message
  if (/[\u4e00-\u9fff]/.test(result)) {
    return "This title is temporarily unavailable. Please try again.";
  }
  return result;
}

// Retry with exponential backoff
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 500): Promise<T> {
  let lastError: Error | unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < retries) {
        await new Promise((res) => setTimeout(res, delayMs * Math.pow(2, i)));
      }
    }
  }
  throw lastError;
}

// Unified fetcher — always uses the /api/tmdb proxy on client-side to avoid CORS and key exposure.
// On server-side (SSR), calls TMDB directly since there's no proxy available.
const fetcher = async <T>(endpoint: string, params: Record<string, string> = {}): Promise<T> => {
  const isServer = typeof window === "undefined";

  let url: URL;

  if (isServer) {
    const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY || "0abe7993c446da1294a11718bd3f78a0";
    url = new URL(`https://api.themoviedb.org/3${endpoint}`);
    url.searchParams.append("api_key", apiKey);
  } else {
    url = new URL(`/api/tmdb${endpoint}`, window.location.origin);
  }

  Object.keys(params).forEach((key) => url.searchParams.append(key, params[key]));

  const res = await fetch(url.toString(), {
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    let errMsg = `TMDB error ${res.status}: ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.detail) errMsg = localizeError(String(body.detail));
      else if (body?.status_message) errMsg = localizeError(body.status_message);
    } catch {}
    throw new Error(errMsg);
  }

  const data = await res.json();
  return data as T;
};

const fetchWithRetry = <T>(endpoint: string, params?: Record<string, string>) =>
  withRetry(() => fetcher<T>(endpoint, params));

export const tmdb = {
  getTrending: (mediaType: MediaType | "all" = "all", timeWindow: "day" | "week" = "day") =>
    fetchWithRetry<PaginatedResponse<MediaItem>>(`/trending/${mediaType}/${timeWindow}`),

  getPopular: (mediaType: MediaType) =>
    fetchWithRetry<PaginatedResponse<MediaItem>>(`/${mediaType}/popular`),

  getTopRated: (mediaType: MediaType) =>
    fetchWithRetry<PaginatedResponse<MediaItem>>(`/${mediaType}/top_rated`),

  getUpcoming: () =>
    fetchWithRetry<PaginatedResponse<MediaItem>>(`/movie/upcoming`),

  searchMulti: (query: string) =>
    fetchWithRetry<PaginatedResponse<MediaItem>>(`/search/multi`, { query }),

  getDetails: (mediaType: MediaType, id: string) =>
    fetchWithRetry<any>(`/${mediaType}/${id}`, {
      append_to_response: "credits,videos,similar,recommendations,translations,watch/providers,external_ids",
    }),

  discover: (mediaType: MediaType, params: Record<string, string>) =>
    fetchWithRetry<PaginatedResponse<MediaItem>>(`/discover/${mediaType}`, params),

  getPerson: (id: string) =>
    fetchWithRetry<any>(`/person/${id}`, { append_to_response: "combined_credits" }),

  getGenres: (mediaType: MediaType) =>
    fetchWithRetry<{ genres: { id: number; name: string }[] }>(`/genre/${mediaType}/list`),

  getSeason: (tvId: string, seasonNumber: string) =>
    fetchWithRetry<any>(`/tv/${tvId}/season/${seasonNumber}`),
};

export function formatMovieBoxTitle(
  title: string | undefined,
  originalLang: string | undefined,
  releaseDate?: string
): string {
  if (!title) return "";

  // If title already has language tags or bracketed info, return it as is
  if (title.includes("[") || title.includes("(")) {
    return title;
  }

  const lang = (originalLang || "").toLowerCase();

  // Determine if it needs a CAM tag (released in 2025/2026)
  const isRecent = releaseDate ? (releaseDate.startsWith("2025") || releaseDate.startsWith("2026")) : false;
  const camSuffix = isRecent ? "[CAM]" : "";

  // 1. Bengali
  if (lang === "bn") {
    return `${title} [Bengali]`;
  }
  // 2. Hindi
  if (lang === "hi") {
    return `${title} [Hindi]`;
  }
  // 3. Tamil
  if (lang === "ta") {
    return `${title} [Tamil]`;
  }
  // 4. Telugu
  if (lang === "te") {
    return `${title} [Telugu]`;
  }
  // 5. Malayalam
  if (lang === "ml") {
    return `${title} [Malayalam]`;
  }
  // 6. Japanese
  if (lang === "ja") {
    if (title.toLowerCase().includes("naruto") || title.toLowerCase().includes("boruto")) {
      return `${title} [Bengali]`;
    }
    return `${title} [Japanese]`;
  }
  // 7. Korean (Korean content on Moviebox is almost always dubbed in Hindi or original)
  if (lang === "ko") {
    return `${title} [Hindi]`;
  }
  // 8. Other foreign languages / Hollywood
  if (lang !== "en" && lang !== "") {
    return `${title} [Hindi]`;
  }

  // 9. Hollywood (English)
  if (lang === "en") {
    if (isRecent) {
      return `${title}[CAM] [Hindi]`;
    }
    return `${title} [Hindi]`;
  }

  return title;
}

