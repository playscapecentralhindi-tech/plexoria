"use client";

import PersonPageClient from "./PersonPageClient";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function PersonPageContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  if (!id) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex flex-col items-center justify-center text-gray-400 gap-2">
        <span>No Person ID provided.</span>
      </div>
    );
  }

  return <PersonPageClient params={{ id }} />;
}

export default function PersonPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-[#EF4444]/20 border-t-[#EF4444] animate-spin"></div>
      </div>
    }>
      <PersonPageContent />
    </Suspense>
  );
}
