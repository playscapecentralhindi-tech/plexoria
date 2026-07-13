"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { tmdb } from "@/lib/tmdb";
import Link from "next/link";
import MovieCard from "@/components/MovieCard";
import { FadeUp } from "@/components/AnimatedComponents";

export default function PersonPageClient({ params }: { params: { id: string } }) {
  const { data: person, isLoading, error } = useQuery({
    queryKey: ["person", params.id],
    queryFn: () => tmdb.getPerson(params.id),
  });

  useEffect(() => {
    if (person?.name) {
      document.title = `${person.name} — Plexoria`;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute("content", `Read biography, filmography credits, personal details, and popular movies starring ${person.name} on Plexoria.`);
      }
    }
  }, [person]);

  if (isLoading) return <div className="min-h-screen pt-20 flex justify-center items-center bg-black"><div className="animate-spin w-12 h-12 rounded-full border-4 border-[#EF4444]/25 border-t-[#EF4444]"></div></div>;
  if (error || !person) return <div className="min-h-screen pt-20 flex items-center justify-center bg-black text-[#EF4444]">Failed to load person details.</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col md:flex-row gap-12 pt-24 min-h-screen text-slate-300">
      {/* Sidebar */}
      <FadeUp className="w-full md:w-72 shrink-0 space-y-6">
        <div className="rounded-2xl overflow-hidden bg-[#0A0A0F] border border-white/5 shadow-2xl">
          {person.profile_path ? (
            <img
              src={`https://image.tmdb.org/t/p/w500${person.profile_path}`}
              alt={person.name}
              className="w-full object-cover"
            />
          ) : (
            <div className="w-full aspect-[2/3] flex items-center justify-center text-slate-500">No Image</div>
          )}
        </div>
        
        <div className="bg-[#0A0A0F] border border-white/5 p-6 rounded-2xl">
          <h2 className="text-lg font-extrabold mb-4 border-b border-white/5 pb-2 text-white">Personal Info</h2>
          <div className="space-y-4 text-xs font-semibold">
            <div>
              <p className="text-slate-400">Known For</p>
              <p className="text-white mt-0.5">{person.known_for_department}</p>
            </div>
            <div>
              <p className="text-slate-400">Gender</p>
              <p className="text-white mt-0.5">{person.gender === 1 ? "Female" : person.gender === 2 ? "Male" : "Not specified"}</p>
            </div>
            <div>
              <p className="text-slate-400">Birthday</p>
              <p className="text-white mt-0.5">{person.birthday || "-"}</p>
            </div>
            {person.deathday && (
              <div>
                <p className="text-slate-400">Day of Death</p>
                <p className="text-white mt-0.5">{person.deathday}</p>
              </div>
            )}
            <div>
              <p className="text-slate-400">Place of Birth</p>
              <p className="text-white mt-0.5">{person.place_of_birth || "-"}</p>
            </div>
          </div>
        </div>
      </FadeUp>

      {/* Main Content */}
      <div className="flex-1 space-y-8">
        <FadeUp>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">{person.name}</h1>
        </FadeUp>
        
        {person.biography && (
          <FadeUp className="bg-[#0A0A0F] border border-white/5 p-6 rounded-2xl">
            <h2 className="text-lg font-extrabold mb-4 border-b border-white/5 pb-2 text-white">Biography</h2>
            <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap select-text">
              {person.biography}
            </p>
          </FadeUp>
        )}

        <FadeUp className="space-y-4">
          <h2 className="text-lg font-extrabold border-b border-white/5 pb-2 text-white">Known For</h2>
          <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-thin snap-x">
            {person.combined_credits?.cast
              ?.filter((item: any) => item.poster_path)
              ?.sort((a: any, b: any) => b.popularity - a.popularity)
              .slice(0, 20)
              .map((item: any) => (
                <MovieCard
                  key={item.id + item.media_type}
                  item={item}
                  mediaType={item.media_type}
                />
            ))}
          </div>
        </FadeUp>
      </div>
    </div>
  );
}
