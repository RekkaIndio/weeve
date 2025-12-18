import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  async headers() {
    // Only enable cross-origin isolation (COOP/COEP) when explicitly requested.
    // This prevents blocking normal cross-origin image/audio/video resources
    // from CDNs and third-party services unless `ENABLE_CROSS_ORIGIN_ISOLATION` is set.
    if (process.env.ENABLE_CROSS_ORIGIN_ISOLATION !== '1') {
      return [];
    }

    return [
      {
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
      },
    ];
  },
};

export default nextConfig;
