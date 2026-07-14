"use client";

import React, { useEffect, useRef } from "react";

/**
 * AmbientBackground — 6-Layer cinematic environment
 *
 * Layer 1: Deep cinematic gradient (CSS body/root)
 * Layer 2: Soft radial glows (blue, purple, teal, amber, crimson)
 * Layer 3: Large blurred floating shapes (slow drift)
 * Layer 4: Ultra-light noise texture (1-2% opacity)
 * Layer 5: Subtle vignette
 * Layer 6: Content (rendered above this component)
 *
 * Performance: All animation is GPU-driven (transform only).
 * Ambient orbs are disabled on mobile via CSS media query.
 */
export default function AmbientBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Cursor-aware subtle highlight shift (max 2-3% intensity)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Only enable on desktop
    if (typeof window === "undefined" || window.innerWidth < 1024) return;

    let rafId: number;
    const handleMouseMove = (e: MouseEvent) => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (!container) return;
        const x = (e.clientX / window.innerWidth) * 100;
        const y = (e.clientY / window.innerHeight) * 100;
        container.style.setProperty("--cursor-x", `${x}%`);
        container.style.setProperty("--cursor-y", `${y}%`);
      });
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="ambient-bg"
      aria-hidden="true"
      style={{ "--cursor-x": "50%", "--cursor-y": "30%" } as React.CSSProperties}
    >
      {/* Layer 1: Deep cinematic gradient base */}
      <div className="ambient-bg-base" />

      {/* Layer 2 + 3: Soft radial glows — large blurred floating shapes */}
      <div className="ambient-glow ambient-glow-blue" />
      <div className="ambient-glow ambient-glow-purple" />
      <div className="ambient-glow ambient-glow-teal" />
      <div className="ambient-glow ambient-glow-amber" />
      <div className="ambient-glow ambient-glow-crimson" />

      {/* Cursor-aware subtle lighting shift (desktop only, max 2% intensity) */}
      <div
        className="absolute inset-0 pointer-events-none hidden lg:block"
        style={{
          background: `radial-gradient(circle 600px at var(--cursor-x, 50%) var(--cursor-y, 30%), rgba(255,255,255,0.018) 0%, transparent 70%)`,
          transition: "background 0.3s ease",
        }}
      />

      {/* Layer 4: Ultra-light noise texture */}
      <div className="ambient-noise" />

      {/* Layer 5: Vignette */}
      <div className="ambient-vignette" />
    </div>
  );
}
