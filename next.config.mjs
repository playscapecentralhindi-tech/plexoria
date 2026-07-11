/** @type {import('next').NextConfig} */
const nextConfig = {
  optimizeFonts: false,
  // output: 'export',
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
      },
    ],
  },
};

export default nextConfig;
