"use client";

import React from "react";
import Link from "next/link";
import { Play, Heart, Film, Compass, Bookmark, Home } from "lucide-react";
import { motion } from "framer-motion";
import { fadeIn } from "@/lib/animations";

export default function Footer() {
  const links = [
    { href: "/", label: "Home", icon: Home },
    { href: "/discover", label: "Discover", icon: Compass },
    { href: "/free", label: "Free Channels", icon: Film },
    { href: "/watchlist", label: "My List", icon: Bookmark },
  ];

  return (
    <motion.footer
      variants={fadeIn}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="relative z-10 w-full mt-20 border-t border-white/5 glass-card select-none"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col md:flex-row items-start justify-between gap-8">

        {/* Brand */}
        <div className="max-w-xs space-y-3">
          <motion.div whileHover={{ scale: 1.02 }} className="inline-block">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-lg font-extrabold tracking-wider text-white hover:opacity-90 transition-opacity"
            >
              <span className="flex items-center justify-center w-6 h-6 rounded-md bg-[#EF4444] text-white">
                <Play size={13} className="fill-current ml-0.5" />
              </span>
              <span>Plex<span className="text-[#EF4444]">oria</span></span>
            </Link>
          </motion.div>
          <p className="text-xs text-slate-400 leading-relaxed font-medium">
            Watch movies and TV shows free online. The ultimate streaming aggregator powered by regional channels.
          </p>
        </div>

        {/* Nav Links */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Navigate</span>
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              <Icon size={12} className="text-[#EF4444]" />
              {label}
            </Link>
          ))}
        </div>

        {/* Legal */}
        <div className="flex flex-col gap-2 max-w-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Info</span>
          <p className="text-[10px] text-slate-600 leading-relaxed">
            Plexoria is a free streaming aggregator. All media content is sourced from publicly available sources. TMDB data courtesy of The Movie Database.
          </p>
        </div>

      </div>

      <div className="w-full border-t border-white/5 py-4 bg-black/30 flex items-center justify-center gap-1.5 text-[10px] text-slate-500 font-medium">
        <span>© {new Date().getFullYear()} Plexoria Platform. Made with</span>
        <Heart size={10} className="fill-current text-red-500 animate-pulse" />
        <span>for evaluation.</span>
      </div>
    </motion.footer>
  );
}
