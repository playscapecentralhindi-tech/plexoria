"use client";

import React from "react";

export default function AmbientBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 select-none">
      {/* Orb 1: Red Top Right */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-red-600/10 filter blur-[150px] animate-drift-1 mix-blend-screen"></div>

      {/* Orb 2: Rose Bottom Left */}
      <div className="absolute bottom-[-15%] left-[-10%] w-[600px] h-[600px] rounded-full bg-rose-500/8 filter blur-[160px] animate-drift-2 mix-blend-screen"></div>

      {/* Orb 3: Dark Red Center */}
      <div className="absolute top-[35%] left-[25%] w-[450px] h-[450px] rounded-full bg-red-800/8 filter blur-[150px] animate-drift-3 mix-blend-screen"></div>
    </div>
  );
}
