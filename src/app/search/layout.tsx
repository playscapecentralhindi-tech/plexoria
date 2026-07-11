import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search Results — Plexoria",
  description: "Search for free movies, TV series, actors, and regional dubbed contents on Plexoria.",
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
