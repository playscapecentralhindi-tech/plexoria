"use client";

import { createClient } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";

export default function ProfilePageClient({ params }: { params: { username: string } }) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24 min-h-screen">
      <div className="flex items-center gap-6 mb-12">
        <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center text-3xl font-bold">
          {params.username.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-3xl font-bold">{params.username}</h1>
          <p className="text-gray-400">Joined recently</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
          <h2 className="text-xl font-bold mb-4">Recent Ratings</h2>
          <p className="text-gray-500 text-sm">No ratings yet.</p>
        </div>
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
          <h2 className="text-xl font-bold mb-4">Recent Reviews</h2>
          <p className="text-gray-500 text-sm">No reviews yet.</p>
        </div>
      </div>
    </div>
  );
}
