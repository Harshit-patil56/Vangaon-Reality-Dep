import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    domains: ['localhost', 'land-deals-backend.vercel.app', 'onrender.com', '64.227.128.245', 'vangaonreality.dpdns.org'],
  },
};

export default nextConfig;
