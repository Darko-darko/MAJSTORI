import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 🔒 Content Security Policy za FastSpring + Paddle + Cloudflare Turnstile
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
              // ✅ SCRIPTS: Cloudflare Turnstile + Paddle + FastSpring + Google Ads
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://challenges.cloudflare.com https://cdn.paddle.com https://sandbox-cdn.paddle.com https://sandbox-buy.paddle.com https://buy.paddle.com https://d1f8f9xcsvx3ha.cloudfront.net https://*.onfastspring.com https://www.googletagmanager.com https://www.googleadservices.com https://pagead2.googlesyndication.com https://www.google.com https://googleads.g.doubleclick.net",
              // ✅ STYLES: Paddle + FastSpring
              "style-src 'self' 'unsafe-inline' https://cdn.paddle.com https://sandbox-cdn.paddle.com https://*.onfastspring.com",
              // ✅ IMAGES: Allow all HTTPS (za FastSpring product images)
              "img-src 'self' data: https: blob:",
              // ✅ FONTS: Paddle + FastSpring
              "font-src 'self' data: https://cdn.paddle.com https://sandbox-cdn.paddle.com https://*.onfastspring.com",
              // ✅ CONNECT: Cloudflare + Supabase + Paddle + FastSpring API + Google Ads
              "connect-src 'self' https://challenges.cloudflare.com https://*.supabase.co wss://*.supabase.co https://cdn.paddle.com https://sandbox-cdn.paddle.com https://sandbox-api.paddle.com https://api.paddle.com https://sandbox-buy.paddle.com https://buy.paddle.com https://sandbox-checkout-service.paddle.com https://checkout-service.paddle.com https://api.fastspring.com https://*.onfastspring.com https://www.googletagmanager.com https://googleads.g.doubleclick.net https://pagead2.googlesyndication.com https://www.google.com https://www.googleadservices.com https://www.google-analytics.com https://analytics.google.com https://*.sentry.io https://*.ingest.sentry.io https://*.ingest.de.sentry.io",
              // ✅ FRAMES: Cloudflare + Paddle + FastSpring Popup + Google Ads
              "frame-src 'self' https://challenges.cloudflare.com https://sandbox-buy.paddle.com https://buy.paddle.com https://sandbox-checkout.paddle.com https://checkout.paddle.com https://*.onfastspring.com https://googleads.g.doubleclick.net https://www.googletagmanager.com https://td.doubleclick.net",
              // ✅ CHILD: Paddle + FastSpring
              "child-src 'self' https://sandbox-buy.paddle.com https://buy.paddle.com https://*.onfastspring.com",
              // Allow localhost framing in development
              isDevelopment ? "frame-ancestors 'self' http://localhost:* https://localhost:*" : "frame-ancestors 'self'",
              // ✅ FORM ACTION: Paddle + FastSpring
              "form-action 'self' https://sandbox-buy.paddle.com https://buy.paddle.com https://*.onfastspring.com"
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

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "pro-meister",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  // tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  }
});
