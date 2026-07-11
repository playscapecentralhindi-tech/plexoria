import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Discover Movies & TV Series — Plexoria",
  description: "Browse and filter free movies and TV shows by genre, release year, and popularity on Plexoria.",
};

export default function DiscoverLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
