import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free Live TV Channels — Plexoria",
  description: "Watch live TV channels and regional news broadcast streams for free online on Plexoria.",
};

export default function FreeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
