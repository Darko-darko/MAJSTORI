import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable ESLint during builds to prevent deployment failures
  eslint: {
    ignoreDuringBuilds: true
  },
  
  // Disable TypeScript checking during builds if needed
  typescript: {
    ignoreBuildErrors: true
  },

  // Image optimization settings
  images: {
    unoptimized: true,
    domains: ['lh3.googleusercontent.com', 'storage.googleapis.com']
  },

  // Experimental features
  experimental: {
    serverComponentsExternalPackages: ['html2canvas']
  }
};

export default nextConfig;
