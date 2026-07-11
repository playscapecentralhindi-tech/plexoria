import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Member Account Login — Plexoria",
  description: "Sign in to your Plexoria member account to sync watch histories, edit library settings, and manage watchlist.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
