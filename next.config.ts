import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ✅ NIŠTA SE NE IGNORIŠTE - sve greške će biti vidljive!
  
  // ✅ Image optimization - standardno
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

  // ✅ Experimental features - samo potrebno za html2canvas
  experimental: {
    serverComponentsExternalPackages: ['html2canvas']
  },

  // ✅ Standard optimizations
  swcMinify: true,
  poweredByHeader: false,
  
  // ✅ Output configuration
  output: 'standalone'
};

export default nextConfig;