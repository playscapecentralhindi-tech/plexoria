import { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Watchlist Library — Plexoria",
  description: "View and manage your saved movies, TV shows, and personalized streaming library on Plexoria.",
};

export default function WatchlistLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
