"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { tmdb } from "@/lib/tmdb";
import { Search, TrendingUp, Clock, X, Film, Tv } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

interface GlassCommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const h = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(h);
  }, [value, delay]);
  return debouncedValue;
}

export default function GlassCommandPalette({ open, onClose }: GlassCommandPaletteProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 280);
  const [results, setResults] = useState<any[]>([]);
  const [trending, setTrending] = useState<any[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("plexoria_recent_searches");
      if (stored) setRecentSearches(JSON.parse(stored).slice(0, 5));
    } catch {}
  }, [open]);

  // Load trending on open
  useEffect(() => {
    if (!open) return;
    tmdb.getTrending("all", "day")
      .then((res) => {
        const items = (res.results || [])
          .filter((i: any) => i.poster_path)
          .slice(0, 6);
        setTrending(items);
      })
      .catch(() => {});
  }, [open]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  // Search when query changes
  useEffect(() => {
    if (!debouncedQuery.trim() || debouncedQuery.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    tmdb.searchMulti(debouncedQuery)
      .then((res) => {
        const items = (res.results || [])
          .filter((i: any) => i.media_type !== "person" && i.poster_path)
          .slice(0, 8);
        setResults(items);
        setActiveIndex(0);
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [debouncedQuery]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const list = results.length > 0 ? results : trending;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % list.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + list.length) % list.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (query.trim() && results.length === 0) {
          saveSearch(query.trim());
          router.push(`/search?q=${encodeURIComponent(query.trim())}`);
          onClose();
        } else if (list[activeIndex]) {
          const item = list[activeIndex];
          saveSearch(item.title || item.name || "");
          router.push(`/${item.media_type || "movie"}?id=${item.id}`);
          onClose();
        }
      } else if (e.key === "Escape") {
        onClose();
      }
    },
    [results, trending, activeIndex, query, router, onClose]
  );

  const saveSearch = (term: string) => {
    if (!term) return;
    try {
      const stored = localStorage.getItem("plexoria_recent_searches");
      const prev: string[] = stored ? JSON.parse(stored) : [];
      const updated = [term, ...prev.filter((s) => s !== term)].slice(0, 5);
      localStorage.setItem("plexoria_recent_searches", JSON.stringify(updated));
    } catch {}
  };

  const displayList = debouncedQuery.length >= 2 ? results : trending;
  const listLabel = debouncedQuery.length >= 2 ? "Results" : "Trending Now";

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed top-[12vh] left-1/2 -translate-x-1/2 z-[201] w-full max-w-2xl px-4"
          >
            <div className="glass-modal rounded-2xl overflow-hidden">
              {/* Search input row */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5">
                {loading ? (
                  <div className="w-4 h-4 rounded-full border-2 border-[#EF4444]/40 border-t-[#EF4444] animate-spin shrink-0" />
                ) : (
                  <Search size={16} className="text-slate-400 shrink-0" />
                )}
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search movies, TV shows..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none font-medium"
                />
                <div className="flex items-center gap-2 shrink-0">
                  <kbd className="hidden sm:flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-500 border border-white/10 bg-white/[0.03]">
                    ESC
                  </kbd>
                  <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-colors">
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Recent searches */}
              {recentSearches.length > 0 && !query && (
                <div className="px-4 py-3 border-b border-white/5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Clock size={10} /> Recent
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((term) => (
                      <button
                        key={term}
                        onClick={() => setQuery(term)}
                        className="px-3 py-1 rounded-full text-xs font-semibold text-slate-300 bg-white/5 border border-white/5 hover:border-white/15 hover:text-white transition-all"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Results / trending list */}
              {displayList.length > 0 && (
                <div className="max-h-[50vh] overflow-y-auto scrollbar-thin">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-4 pt-3 pb-1.5 flex items-center gap-1.5">
                    <TrendingUp size={10} /> {listLabel}
                  </p>
                  {displayList.map((item: any, idx: number) => {
                    const title = item.title || item.name || "";
                    const year = (item.release_date || item.first_air_date || "").substring(0, 4);
                    const isActive = idx === activeIndex;
                    return (
                      <Link
                        key={item.id}
                        href={`/${item.media_type || "movie"}?id=${item.id}`}
                        onClick={() => { saveSearch(title); onClose(); }}
                        className={`flex items-center gap-3 px-4 py-2.5 transition-colors group ${
                          isActive ? "bg-white/5" : "hover:bg-white/[0.03]"
                        }`}
                      >
                        {/* Poster thumb */}
                        <div className="relative w-8 h-12 rounded overflow-hidden shrink-0 bg-white/5">
                          {item.poster_path && (
                            <Image
                              src={`https://image.tmdb.org/t/p/w92${item.poster_path}`}
                              alt={title}
                              fill
                              className="object-cover"
                              sizes="32px"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate group-hover:text-[#EF4444] transition-colors">
                            {title}
                          </p>
                          <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                            {item.media_type === "tv" ? <Tv size={10} /> : <Film size={10} />}
                            <span className="capitalize">{item.media_type}</span>
                            {year && <><span>•</span><span>{year}</span></>}
                            {item.vote_average > 0 && (
                              <><span>•</span><span className="text-amber-500">★ {item.vote_average.toFixed(1)}</span></>
                            )}
                          </p>
                        </div>
                        {isActive && (
                          <kbd className="text-[10px] font-mono text-slate-500 border border-white/10 bg-white/[0.03] px-1.5 py-0.5 rounded shrink-0">
                            ↵
                          </kbd>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* No results */}
              {debouncedQuery.length >= 2 && !loading && results.length === 0 && (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm text-slate-400">No results for <span className="text-white font-semibold">"{debouncedQuery}"</span></p>
                  <Link
                    href={`/search?q=${encodeURIComponent(debouncedQuery)}`}
                    onClick={onClose}
                    className="inline-block mt-3 text-xs text-[#EF4444] hover:underline font-semibold"
                  >
                    Search full catalog →
                  </Link>
                </div>
              )}

              {/* Footer hint */}
              <div className="px-4 py-2.5 border-t border-white/5 flex items-center justify-between">
                <span className="text-[10px] text-slate-600">↑↓ navigate  •  ↵ open  •  ESC close</span>
                <Link
                  href={query ? `/search?q=${encodeURIComponent(query)}` : "/search"}
                  onClick={onClose}
                  className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
                >
                  Full search page →
                </Link>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
