"use client";

import React from "react";
import Link from "next/link";
import { Film, Heart, Play } from "lucide-react";

export default function Footer() {
  return (
    <footer className="relative z-10 w-full mt-20 border-t border-white/10 bg-black/40 backdrop-blur-md select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
        
        {/* Brand Description */}
        <div className="max-w-sm space-y-3">
          <Link 
            href="/" 
            className="flex items-center gap-1.5 text-lg font-extrabold tracking-wider text-white hover:opacity-90 transition-opacity"
          >
            <span className="flex items-center justify-center w-5.5 h-5.5 rounded-md bg-[#EF4444] text-white">
              <Play size={11} className="fill-current ml-0.5" />
            </span>
            <span>Plex<span className="text-[#EF4444]">oria</span></span>
          </Link>
          <p className="text-xs text-gray-400 leading-relaxed font-medium">
            Watch Movies Free Online, Watch TV Series Online. The ultimate Netflix-style streaming aggregator powered by regional channels.
          </p>
        </div>




      </div>

      <div className="w-full border-t border-white/5 py-4 bg-black/60 flex items-center justify-center gap-1 text-[10px] text-gray-500 font-medium">
        <span>© {new Date().getFullYear()} Plexoria Platform. Made with</span>
        <Heart size={10} className="fill-current text-red-500 animate-pulse" />
        <span>for evaluation.</span>
      </div>
    </footer>
  );
}
