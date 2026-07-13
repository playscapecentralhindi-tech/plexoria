"use client";

import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { FadeUp } from "@/components/AnimatedComponents";

export default function ProfilePageClient({ params }: { params: { username: string } }) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24 min-h-screen bg-black text-slate-300">
      <FadeUp className="flex items-center gap-6 mb-12">
        <div className="w-24 h-24 bg-gradient-to-tr from-[#EF4444] to-[#B91C1C] rounded-full flex items-center justify-center text-3xl font-black text-white shadow-2xl">
          {params.username.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">{params.username}</h1>
          <p className="text-slate-500 text-xs font-semibold mt-1">Joined recently</p>
        </div>
      </FadeUp>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <FadeUp className="bg-[#0A0A0F] border border-white/5 p-6 rounded-2xl">
          <h2 className="text-lg font-extrabold mb-4 text-white">Recent Ratings</h2>
          <p className="text-slate-500 text-xs font-semibold">No ratings yet.</p>
        </FadeUp>
        <FadeUp className="bg-[#0A0A0F] border border-white/5 p-6 rounded-2xl" delay={0.1}>
          <h2 className="text-lg font-extrabold mb-4 text-white">Recent Reviews</h2>
          <p className="text-slate-500 text-xs font-semibold">No reviews yet.</p>
        </FadeUp>
      </div>
    </div>
  );
}
