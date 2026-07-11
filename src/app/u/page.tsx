"use client";

import ProfilePageClient from "./ProfilePageClient";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ProfilePageContent() {
  const searchParams = useSearchParams();
  const username = searchParams.get("username") || "demo";

  return <ProfilePageClient params={{ username }} />;
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-[#EF4444]/20 border-t-[#EF4444] animate-spin"></div>
      </div>
    }>
      <ProfilePageContent />
    </Suspense>
  );
}
