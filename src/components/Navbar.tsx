"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, Search, Bookmark, X, Film, Compass, Play, Star } from "lucide-react";
import { tmdb } from "@/lib/tmdb";

export default function Navbar() {
  const router = useRouter();
  const [searchVal, setSearchVal] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  
  // Autocomplete state
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Scroll listener to toggle transparent vs liquid-glass background
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 80) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Debounced autocomplete suggestions query
  useEffect(() => {
    if (searchVal.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await tmdb.searchMulti(searchVal);
        const matches = (res.results || [])
          .filter((item: any) => (item.media_type === "movie" || item.media_type === "tv") && item.poster_path)
          .slice(0, 5);
        setSuggestions(matches);
      } catch (err) {
        console.error("Autocomplete search error:", err);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchVal]);

  // Click outside to close autocomplete dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVal.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchVal)}`);
      setIsSearchExpanded(false);
      setShowSuggestions(false);
    }
  };

  const toggleSearch = () => {
    setIsSearchExpanded(prev => !prev);
    if (!isSearchExpanded) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  };

  return (
    <>
      <nav 
        className={`fixed top-0 w-full z-50 transition-all duration-300 select-none ${
          isScrolled 
            ? "navbar-glass py-2" 
            : "bg-transparent py-4"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12 gap-4">
            
            {/* Logo & Hamburguer menu button */}
            <div className="flex items-center gap-4 shrink-0">
              {/* Menu Button */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10 transition-colors text-white"
              >
                {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>

              <Link 
                href="/" 
                className="flex items-center gap-1.5 text-lg md:text-xl font-extrabold tracking-wider text-white hover:opacity-90 transition-opacity"
              >
                <span className="flex items-center justify-center w-6 h-6 rounded-md bg-[#E50914] text-white">
                  <Play size={13} className="fill-current ml-0.5" />
                </span>
                <span>Plex<span className="text-[#E50914]">oria</span></span>
              </Link>
            </div>

            {/* Navigation links - Desktop */}
            <div className="hidden lg:flex items-center gap-6 text-sm font-medium text-gray-300">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <Link href="/discover" className="hover:text-white transition-colors">Discover</Link>
              <Link href="/free" className="hover:text-red-400 transition-colors text-red-500 font-semibold">Free Channels</Link>
              <Link href="/watchlist" className="hover:text-white transition-colors flex items-center gap-1">
                <Bookmark size={14} /> Library
              </Link>
            </div>

            {/* Actions: Search bar & Sign In */}
            <div className="flex items-center gap-3 shrink-0 relative" ref={searchContainerRef}>
              
              {/* Expanding Search Bar */}
              <form 
                onSubmit={handleSearchSubmit}
                className={`flex items-center rounded-full transition-all duration-300 h-9 relative z-50 ${
                  isSearchExpanded 
                    ? "w-44 sm:w-64 px-3 bg-white/5 border border-white/15 shadow-inner" 
                    : "w-9 px-0 bg-transparent border border-transparent"
                }`}
              >
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search Movies & Shows..."
                  value={searchVal}
                  onFocus={() => setShowSuggestions(true)}
                  onChange={(e) => {
                    setSearchVal(e.target.value);
                    setShowSuggestions(true);
                  }}
                  className={`bg-transparent text-xs text-white placeholder-gray-500 focus:outline-none w-full transition-opacity duration-300 font-medium ${
                    isSearchExpanded ? "opacity-100 block" : "opacity-0 hidden"
                  }`}
                />
                <button 
                  type="button"
                  onClick={isSearchExpanded && searchVal.trim() ? handleSearchSubmit : toggleSearch}
                  className="text-gray-400 hover:text-white transition-colors p-1"
                >
                  <Search size={16} />
                </button>
              </form>

              {/* Autocomplete suggestions dropdown */}
              {showSuggestions && suggestions.length > 0 && isSearchExpanded && (
                <div className="absolute top-11 right-0 w-72 md:w-80 rounded-xl bg-[#12121A]/95 border border-white/10 backdrop-blur-md shadow-2xl p-2 flex flex-col gap-1 z-50">
                  {suggestions.map((item) => {
                    const year = (item.release_date || item.first_air_date || "").substring(0, 4);
                    return (
                      <Link
                        key={item.id}
                        href={`/${item.media_type || "movie"}?id=${item.id}`}
                        onClick={() => {
                          setShowSuggestions(false);
                          setSearchVal("");
                        }}
                        className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/5 transition-all group"
                      >
                        <img
                          src={`https://image.tmdb.org/t/p/w92${item.poster_path}`}
                          alt={item.title || item.name}
                          className="w-9 aspect-[2/3] object-cover rounded bg-white/5"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-white truncate group-hover:text-[#E50914] transition-colors">
                            {item.title || item.name}
                          </h4>
                          <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1.5">
                            {year ? <span>{year}</span> : null}
                            {year && <span>•</span>}
                            <span className="capitalize">{item.media_type}</span>
                            {item.vote_average > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-amber-500 font-bold flex items-center gap-0.5">
                                  ★ {item.vote_average.toFixed(1)}
                                </span>
                              </>
                            )}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* Watchlist Quick Button - Tablet/Desktop */}
              <Link 
                href="/watchlist" 
                className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                <Bookmark size={14} className="fill-current text-[#E50914]" />
                <span>Watchlist</span>
              </Link>

              {/* User Avatar Placeholder */}
              <Link href="/login" className="shrink-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#E50914] to-[#B91C1C] p-[1.5px] hover:scale-105 transition-transform duration-200">
                  <div className="w-full h-full bg-[#0A0A0F] rounded-full flex items-center justify-center text-[10px] font-bold text-white uppercase">
                    PX
                  </div>
                </div>
              </Link>

            </div>

          </div>
        </div>
      </nav>

      {/* Hamburger glass sidebar menu */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsMenuOpen(false)}
        >
          <div 
            className="absolute top-0 left-0 h-full w-72 md:w-80 liquid-glass-heavy shadow-2xl p-6 flex flex-col gap-8 z-50 animate-slide-right"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <span className="flex items-center gap-1.5 text-base font-extrabold tracking-wider text-white">
                <span className="flex items-center justify-center w-5.5 h-5.5 rounded-md bg-[#E50914] text-white">
                  <Play size={11} className="fill-current ml-0.5" />
                </span>
                <span>Plex<span className="text-[#E50914]">oria</span></span>
              </span>
              <button 
                onClick={() => setIsMenuOpen(false)}
                className="p-1 rounded-md hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 flex flex-col gap-6">
              <div>
                <h3 className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Compass size={12} className="text-[#E50914]" /> Browse Catalog
                </h3>
                <ul className="space-y-1.5 text-sm font-medium">
                  <li>
                    <Link href="/" onClick={() => setIsMenuOpen(false)} className="text-gray-300 hover:text-white hover:pl-1 transition-all block py-1">
                      Trending Catalog
                    </Link>
                  </li>
                  <li>
                    <Link href="/discover" onClick={() => setIsMenuOpen(false)} className="text-gray-300 hover:text-white hover:pl-1 transition-all block py-1">
                      Explore All Genres
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Film size={12} className="text-[#E50914]" /> Free Streaming
                </h3>
                <ul className="space-y-1.5 text-sm font-medium">
                  <li>
                    <Link href="/free" onClick={() => setIsMenuOpen(false)} className="text-emerald-400 hover:text-emerald-300 hover:pl-1 transition-all block py-1">
                      Free Movie Channels
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Bookmark size={12} className="text-yellow-500" /> Member Center</h3>
                <ul className="space-y-1.5 text-sm font-medium">
                  <li>
                    <Link href="/watchlist" onClick={() => setIsMenuOpen(false)} className="text-gray-300 hover:text-white hover:pl-1 transition-all block py-1">
                      My Streaming Library
                    </Link>
                  </li>
                  <li>
                    <Link href="/login" onClick={() => setIsMenuOpen(false)} className="text-gray-300 hover:text-white hover:pl-1 transition-all block py-1">
                      Account Sign In
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            <div className="border-t border-white/10 pt-4 flex flex-col gap-1.5">
              <span className="text-[10px] text-gray-500">Plexoria Hub v2.0</span>
              <span className="text-[9px] text-gray-600 leading-normal">
                This project is built to replicate Plexoria design. Powered by TMDB.
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
