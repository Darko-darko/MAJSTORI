import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Image optimization - standardno
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      }
    ]
  },

  // FIXED: Moved serverComponentsExternalPackages to serverExternalPackages
  serverExternalPackages: ['html2canvas'],

  // REMOVED: swcMinify (deprecated in Next.js 15)
  poweredByHeader: false,
  
  // Output configuration
  output: 'standalone'
};

export default nextConfig;