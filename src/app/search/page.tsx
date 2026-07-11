"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { tmdb } from "@/lib/tmdb";
import { Search } from "lucide-react";
import MovieCard, { SkeletonCard } from "@/components/MovieCard";
import { motion } from "framer-motion";

// Hook for debouncing input
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

interface SemanticParsed {
  isSemantic: boolean;
  mediaType: "movie" | "tv";
  params: Record<string, string>;
  description: string;
}

function parseSemanticQuery(query: string): SemanticParsed | null {
  const normalized = query.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
  if (normalized.length < 3) return null;

  // Language mappings
  const languageKeywords = {
    hi: ["hindi", "hidi", "bollywood"],
    ko: ["korean", "k drama", "kdrama", "k dramas", "kdramas"],
    ja: ["japanese", "anime"],
    ta: ["tamil", "kollywood"],
    te: ["telugu", "tollywood"],
    en: ["english", "hollywood"],
    ms: ["malay", "malaysian"]
  };

  const trendKeywords = ["trending", "popular", "top", "famous"];
  const latestKeywords = ["latest", "new", "recent", "recent", "lated", "week"];

  // Detect language
  let langCode: string | null = null;
  let detectedLangName = "";
  for (const [code, list] of Object.entries(languageKeywords)) {
    if (list.some(keyword => normalized.includes(keyword))) {
      langCode = code;
      detectedLangName = code === "hi" ? "Hindi" : code === "ko" ? "Korean" : code === "ja" ? "Japanese" : code === "ta" ? "Tamil" : code === "te" ? "Telugu" : code === "en" ? "English" : "Malay";
      break;
    }
  }

  // Detect media type
  let mediaType: "movie" | "tv" = "movie";
  if (normalized.includes("show") || normalized.includes("series") || normalized.includes("drama") || normalized.includes("tv")) {
    mediaType = "tv";
  }

  // Detect latest vs trending
  const isLatest = latestKeywords.some(keyword => normalized.includes(keyword));
  const isTrending = trendKeywords.some(keyword => normalized.includes(keyword));

  const isSemantic = !!langCode || isLatest || isTrending;
  if (!isSemantic) return null;

  const params: Record<string, string> = {};
  if (langCode) {
    params.with_original_language = langCode;
  }

  const today = new Date().toISOString().split("T")[0];
  
  if (isLatest) {
    if (mediaType === "movie") {
      params.sort_by = "primary_release_date.desc";
      params["primary_release_date.lte"] = today;
      params["vote_count.gte"] = "2";
    } else {
      params.sort_by = "first_air_date.desc";
      params["first_air_date.lte"] = today;
      params["vote_count.gte"] = "1";
    }
  } else {
    params.sort_by = "popularity.desc";
  }

  let description = "";
  if (isLatest) description += "Latest ";
  else if (isTrending) description += "Trending ";
  else description += "Popular ";

  if (detectedLangName) description += `${detectedLangName} `;
  description += mediaType === "movie" ? "Movies" : "TV Series";

  return {
    isSemantic: true,
    mediaType,
    params,
    description
  };
}



function SearchContent() {
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") || "";
  
  const [query, setQuery] = useState(urlQuery);
  const debouncedQuery = useDebounce(query, 400);
  const semanticInfo = parseSemanticQuery(debouncedQuery);

  // Sync state if URL changes
  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);



  const { data, isLoading } = useQuery({
    queryKey: ["search", debouncedQuery],
    queryFn: () => {
      if (semanticInfo) {
        return tmdb.discover(semanticInfo.mediaType, semanticInfo.params);
      }
      return tmdb.searchMulti(debouncedQuery);
    },
    enabled: debouncedQuery.length > 1,
  });

  const results = (data?.results?.filter(i => i.media_type !== "person") || []).filter((item: any) => item.poster_path);

  const [suggestion, setSuggestion] = useState<string | null>(null);

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Fetch suggestions when query changes (with very fast 150ms debounce)
  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(() => {
      tmdb.searchMulti(query)
        .then(res => {
          const items = (res?.results || [])
            .filter((item: any) => item.media_type !== "person")
            .slice(0, 10);
          setSuggestions(items);
        })
        .catch(err => console.error("Suggestions fetch failed:", err));
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);



  useEffect(() => {
    setSuggestion(null);
    if (debouncedQuery.length < 3 || semanticInfo) return;

    let active = true;
    const resultsEmpty = data && results.length === 0;

    if (resultsEmpty) {
      fetch(`/api/search/autocorrect?query=${encodeURIComponent(debouncedQuery)}`)
        .then(res => res.json())
        .then(resData => {
          if (active && resData.changed && resData.corrected) {
            setSuggestion(resData.corrected);
          }
        })
        .catch(err => console.error("Autocorrect fetch failed:", err));
    }

    return () => {
      active = false;
    };
  }, [debouncedQuery, data, semanticInfo, results]);



  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.04 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 select-none relative z-10">
      
      {/* Search Input Box */}
      <div ref={searchContainerRef} className="relative max-w-2xl mx-auto mb-16">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-12 pr-4 py-3.5 bg-[#12121A] border border-white/10 focus:border-[#EF4444]/50 rounded-xl text-base text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#EF4444]/30 transition-all shadow-inner font-medium"
          placeholder="Search for movies, TV shows..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
        />

        {/* Real-time Autocomplete suggestions dropdown overlay */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#111116]/95 border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50 flex flex-col divide-y divide-white/5 backdrop-blur-md">
            {suggestions.map((item) => {
              const displayTitle = item.title || item.name;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setQuery(displayTitle);
                    setShowSuggestions(false);
                  }}
                  className="w-full flex items-center px-4 py-3 text-left text-xs font-semibold text-gray-200 hover:bg-white/5 hover:text-white transition-colors gap-3"
                >
                  <Search className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                  <span className="truncate">{displayTitle}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Loading states grid */}
      {isLoading && debouncedQuery.length > 1 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {[...Array(8)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Semantic search description banner */}
      {results.length > 0 && !isLoading && (
        <div className="flex flex-col gap-1.5 mb-8 text-left max-w-7xl mx-auto">
          <span className="text-[10px] uppercase tracking-widest text-[#EF4444] font-black">
            {semanticInfo ? "Plexoria Search Engine Intelligence" : "General Directory search"}
          </span>
          <h2 className="text-xl md:text-2xl font-extrabold text-white">
            {semanticInfo ? (
              <span>Showing <span className="text-[#EF4444]">{semanticInfo.description}</span> for <span className="italic text-gray-400">"{debouncedQuery}"</span></span>
            ) : (
              <span>Results for <span className="italic text-gray-400">"{debouncedQuery}"</span></span>
            )}
          </h2>
        </div>
      )}

      {/* Search results grid */}
      {results.length > 0 && !isLoading && (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6"
        >
          {results.map((item) => (
            <motion.div key={item.id} variants={itemVariants}>
              <MovieCard item={item} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Empty states */}
      {results.length === 0 && debouncedQuery.length > 1 && !isLoading && (
        <div className="flex flex-col gap-6 max-w-md mx-auto mt-16">
          {suggestion && (
            <div className="text-center p-6 bg-[#EF4444]/5 border border-[#EF4444]/20 rounded-2xl">
              <span className="text-lg block mb-1">💡</span>
              <p className="text-xs text-gray-300 font-medium">
                Did you mean:{" "}
                <button
                  onClick={() => {
                    setQuery(suggestion);
                  }}
                  className="text-[#EF4444] font-extrabold hover:underline transition-colors hover:text-red-400"
                >
                  {suggestion}
                </button>
                ?
              </p>
            </div>
          )}
          <div className="text-center text-gray-400 p-8 bg-white/2 border border-white/5 rounded-2xl">
            <span className="text-3xl block mb-2">🔍</span>
            <p className="font-semibold text-sm">No results found for "{debouncedQuery}"</p>
            <p className="text-xs text-gray-500 mt-1">Double check spellings or try looking up another title.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="text-center mt-20 text-gray-400">Loading Search...</div>}>
      <SearchContent />
    </Suspense>
  );
}
