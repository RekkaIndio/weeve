import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
    ],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  async headers() {
    const headers = [
      // Android App Links - Digital Asset Links file
      // Must have application/json content type for Google Play verification
      {
        source: '/.well-known/assetlinks.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/json',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600',
          },
        ],
      },
    ];

    // Only enable cross-origin isolation (COOP/COEP) when explicitly requested.
    // This prevents blocking normal cross-origin image/audio/video resources
    // from CDNs and third-party services unless `ENABLE_CROSS_ORIGIN_ISOLATION` is set.
    if (process.env.ENABLE_CROSS_ORIGIN_ISOLATION === '1') {
      headers.push({
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
        ],
      });
    }

    return headers;
  },
};

export default nextConfig;
