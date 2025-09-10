import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Enable static export for Render static site
  output: 'export',
  trailingSlash: true,
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  images: {
    unoptimized: true, // Required for static export
    formats: ['image/avif', 'image/webp'],
    domains: ['localhost', 'land-deals-backend.vercel.app', 'onrender.com'],
  },
  // Remove headers for static export (not supported)
};

export default nextConfig;
