import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 🔒 Content Security Policy za Paddle Integration
  async headers() {
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    return [
      {
        // Apply CSP headers to all routes
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.paddle.com https://sandbox-cdn.paddle.com https://sandbox-buy.paddle.com https://buy.paddle.com",
              "style-src 'self' 'unsafe-inline' https://cdn.paddle.com https://sandbox-cdn.paddle.com",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data: https://cdn.paddle.com https://sandbox-cdn.paddle.com",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://cdn.paddle.com https://sandbox-cdn.paddle.com https://sandbox-api.paddle.com https://api.paddle.com https://sandbox-buy.paddle.com https://buy.paddle.com https://sandbox-checkout-service.paddle.com https://checkout-service.paddle.com",
              "frame-src 'self' https://sandbox-buy.paddle.com https://buy.paddle.com https://sandbox-checkout.paddle.com https://checkout.paddle.com",
              "child-src 'self' https://sandbox-buy.paddle.com https://buy.paddle.com",
              // Allow localhost framing in development
              isDevelopment ? "frame-ancestors 'self' http://localhost:* https://localhost:*" : "frame-ancestors 'self'",
              "form-action 'self' https://sandbox-buy.paddle.com https://buy.paddle.com"
            ].filter(Boolean).join('; ')
          }
        ]
      }
    ]
  },

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

  // Server external packages
  serverExternalPackages: ['html2canvas', 'pdfkit'],

  // Security headers
  poweredByHeader: false,
  
  // Output configuration
  output: 'standalone'
};

export default nextConfig;