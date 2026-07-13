import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import Providers from "@/components/providers";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AmbientBackground from "@/components/AmbientBackground";
import BackToTop from "@/components/BackToTop";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700"],
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Plexoria — Watch Movies & TV Series Free Online",
  description: "Watch Movies Free Online, Watch TV Series Online. Stream popular regional dramas and Hollywood movies.",
  referrer: "no-referrer",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "Plexoria",
              "url": "https://plexoria.vercel.app",
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://plexoria.vercel.app/search?q={search_term_string}",
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${outfit.variable} antialiased bg-black text-white font-sans`}
      >
        <Providers>
          <AmbientBackground />
          <Navbar />
          <div className="pt-14 min-h-[calc(100vh-80px)] relative z-10">
            {children}
          </div>
          <Footer />
          <BackToTop />
        </Providers>
      </body>
    </html>
  );
}
