"use client";

import React from "react";
import Link from "next/link";
import { Play, Heart, Film, Compass, Bookmark, Home, Star } from "lucide-react";
import { motion } from "framer-motion";

export default function Footer() {
  const links = [
    { href: "/", label: "Home", icon: Home },
    { href: "/discover", label: "Discover", icon: Compass },
    { href: "/free", label: "Free Channels", icon: Film },
    { href: "/watchlist", label: "My List", icon: Bookmark },
  ];

  return (
    <motion.footer
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative z-10 w-full mt-16 select-none"
    >
      {/* Gradient border top */}
      <div
        className="w-full h-px"
        style={{
          background:
            "linear-gradient(to right, transparent 0%, rgba(255,255,255,0.08) 20%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.08) 80%, transparent 100%)",
        }}
      />

      {/* Footer glass body */}
      <div className="glass-heavy">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col md:flex-row items-start justify-between gap-8">

          {/* Brand */}
          <div className="max-w-xs space-y-3">
            <motion.div whileHover={{ scale: 1.02 }} className="inline-block">
              <Link
                href="/"
                className="flex items-center gap-1.5 text-lg font-extrabold tracking-wider text-white hover:opacity-90 transition-opacity"
              >
                <span className="flex items-center justify-center w-6 h-6 rounded-md bg-[#EF4444] text-white shadow-md shadow-red-700/30">
                  <Play size={13} className="fill-current ml-0.5" />
                </span>
                <span className="whitespace-nowrap">Plex<span className="text-[#EF4444]">oria</span></span>
              </Link>
            </motion.div>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              Watch movies and TV shows free online. The ultimate streaming aggregator powered by regional channels.
            </p>
            {/* Quality badges */}
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black tracking-wider border border-white/10 px-1.5 py-0.5 rounded text-slate-400 bg-white/[0.03]">HD</span>
              <span className="text-[9px] font-black tracking-wider border border-white/10 px-1.5 py-0.5 rounded text-slate-400 bg-white/[0.03]">MULTI-SUB</span>
              <span className="text-[9px] font-black tracking-wider border border-white/10 px-1.5 py-0.5 rounded text-slate-400 bg-white/[0.03]">FREE</span>
            </div>
          </div>

          {/* Nav Links */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Navigate</span>
            {links.map(({ href, label, icon: Icon }) => (
              <motion.div
                key={href}
                whileHover={{ x: 3 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <Link
                  href={href}
                  className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors py-0.5"
                >
                  <Icon size={12} className="text-[#EF4444]" />
                  {label}
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Legal */}
          <div className="flex flex-col gap-2 max-w-xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Info</span>
            <p className="text-[10px] text-slate-600 leading-relaxed">
              Plexoria is a free streaming aggregator. All media content is sourced from publicly available sources. TMDB data courtesy of The Movie Database.
            </p>
            <div className="flex items-center gap-1 mt-1">
              <Star size={9} fill="#F59E0B" className="text-amber-500" />
              <span className="text-[9px] text-slate-600">Powered by TMDB API</span>
            </div>
          </div>

        </div>

        {/* Bottom bar */}
        <div
          className="w-full py-4 flex items-center justify-center gap-1.5 text-[10px] text-slate-500 font-medium"
          style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
        >
          <span>© {new Date().getFullYear()} Plexoria Platform. Made with</span>
          <Heart size={10} className="fill-current text-red-500 animate-pulse" />
          <span>for evaluation.</span>
        </div>
      </div>
    </motion.footer>
  );
}
