export type MediaType = "movie" | "tv" | "person";

export interface MediaItem {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
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

// Client-side fetcher with direct API fallback for static export
const fetcher = async <T>(endpoint: string, params: Record<string, string> = {}): Promise<T> => {
  const isServer = typeof window === 'undefined';
  const isStaticDeploy = !isServer && (window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1'));
  
  let url: URL;
  
  if (isServer || isStaticDeploy) {
    const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY || "0abe7993c446da1294a11718bd3f78a0";
    url = new URL(`https://api.themoviedb.org/3${endpoint}`);
    url.searchParams.append("api_key", apiKey);
  } else {
    url = new URL(`/api/tmdb${endpoint}`, window.location.origin);
  }
  
  Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDB error: ${res.statusText}`);
  return res.json();
};

export const tmdb = {
  getTrending: (mediaType: MediaType | "all" = "all", timeWindow: "day" | "week" = "day") => 
    fetcher<PaginatedResponse<MediaItem>>(`/trending/${mediaType}/${timeWindow}`),
  
  getPopular: (mediaType: MediaType) => 
    fetcher<PaginatedResponse<MediaItem>>(`/${mediaType}/popular`),
    
  getTopRated: (mediaType: MediaType) => 
    fetcher<PaginatedResponse<MediaItem>>(`/${mediaType}/top_rated`),
    
  getUpcoming: () => 
    fetcher<PaginatedResponse<MediaItem>>(`/movie/upcoming`),

  searchMulti: (query: string) => 
    fetcher<PaginatedResponse<MediaItem>>(`/search/multi`, { query }),

  getDetails: (mediaType: MediaType, id: string) => 
    fetcher<any>(`/${mediaType}/${id}`, { append_to_response: "credits,videos,similar,recommendations,translations,watch/providers,external_ids" }),
    
  discover: (mediaType: MediaType, params: Record<string, string>) => 
    fetcher<PaginatedResponse<MediaItem>>(`/discover/${mediaType}`, params),
  
  getPerson: (id: string) => 
    fetcher<any>(`/person/${id}`, { append_to_response: "combined_credits" }),
    
  getGenres: (mediaType: MediaType) => 
    fetcher<{ genres: { id: number; name: string }[] }>(`/genre/${mediaType}/list`),
    
  getSeason: (tvId: string, seasonNumber: string) => 
    fetcher<any>(`/tv/${tvId}/season/${seasonNumber}`),
};
