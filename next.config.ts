import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // Produces a standalone folder (with node_modules tree-shaken) for Docker.
  // The runner image only needs .next/standalone + .next/static + public/.
  output: 'standalone',

  // Silence multi-lockfile workspace root warning
  turbopack: {
    root: path.resolve(__dirname),
  },

  // Proxy /api/v1 → NestJS BE in development
  // In production, handled by BFF route handlers
  async rewrites() {
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/v1/:path*',
          destination: `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/v1/:path*`,
        },
      ];
    }
    return [];
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https:; frame-ancestors 'none';",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
