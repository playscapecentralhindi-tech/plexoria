"use client";

import { useQuery } from "@tanstack/react-query";
import { tmdb } from "@/lib/tmdb";
import Link from "next/link";

export default function PersonPageClient({ params }: { params: { id: string } }) {
  const { data: person, isLoading, error } = useQuery({
    queryKey: ["person", params.id],
    queryFn: () => tmdb.getPerson(params.id),
  });

  if (isLoading) return <div className="min-h-screen pt-20 flex justify-center"><div className="animate-pulse w-full h-[60vh] bg-gray-900"></div></div>;
  if (error || !person) return <div className="min-h-screen pt-20 text-center text-red-500">Failed to load person details.</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col md:flex-row gap-12 pt-24">
      {/* Sidebar */}
      <div className="w-full md:w-72 shrink-0 space-y-6">
        <div className="rounded-xl overflow-hidden bg-gray-900 shadow-2xl">
          {person.profile_path ? (
            <img
              src={`https://image.tmdb.org/t/p/w500${person.profile_path}`}
              alt={person.name}
              className="w-full object-cover"
            />
          ) : (
            <div className="w-full aspect-[2/3] flex items-center justify-center text-gray-500">No Image</div>
          )}
        </div>
        
        <div>
          <h2 className="text-xl font-bold mb-4 border-b border-gray-800 pb-2">Personal Info</h2>
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-semibold text-gray-400">Known For</p>
              <p>{person.known_for_department}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-400">Gender</p>
              <p>{person.gender === 1 ? "Female" : person.gender === 2 ? "Male" : "Not specified"}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-400">Birthday</p>
              <p>{person.birthday || "-"}</p>
            </div>
            {person.deathday && (
              <div>
                <p className="font-semibold text-gray-400">Day of Death</p>
                <p>{person.deathday}</p>
              </div>
            )}
            <div>
              <p className="font-semibold text-gray-400">Place of Birth</p>
              <p>{person.place_of_birth || "-"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        <h1 className="text-4xl md:text-5xl font-bold mb-6">{person.name}</h1>
        
        {person.biography && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Biography</h2>
            <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
              {person.biography}
            </p>
          </div>
        )}

        <div>
          <h2 className="text-2xl font-bold mb-6">Known For</h2>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
            {person.combined_credits?.cast
              ?.sort((a: any, b: any) => b.popularity - a.popularity)
              .slice(0, 20)
              .map((item: any) => (
              <Link
                href={`/${item.media_type}?id=${item.id}`}
                key={item.id + item.media_type}
                className="flex-none w-36 snap-start hover:scale-105 transition-transform duration-300"
              >
                <div className="relative aspect-[2/3] w-full rounded-lg overflow-hidden bg-gray-800 mb-2">
                  {item.poster_path ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w300${item.poster_path}`}
                      alt={item.title || item.name}
                      className="object-cover w-full h-full"
                    />
                  ) : null}
                </div>
                <p className="text-sm font-medium truncate">{item.title || item.name}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
