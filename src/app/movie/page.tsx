"use client";

import MediaDetail from "@/components/MediaDetail";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function MoviePageContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  if (!id) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex flex-col items-center justify-center text-gray-400 gap-2">
        <span>No Movie ID provided.</span>
      </div>
    );
  }

  return <MediaDetail mediaType="movie" id={id} />;
}

export default function MoviePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-[#EF4444]/20 border-t-[#EF4444] animate-spin"></div>
      </div>
    }>
      <MoviePageContent />
    </Suspense>
  );
}
