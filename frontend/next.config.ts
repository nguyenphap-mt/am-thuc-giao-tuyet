import type { NextConfig } from "next";

// API_BACKEND_URL: Server-side rewrite destination (Cloud Run URL)
// Falls back to production Cloud Run URL; localhost for local dev via .env.local
const API_BACKEND = process.env.API_BACKEND_URL || 'https://am-thuc-api-321822391174.asia-southeast1.run.app';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${API_BACKEND}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
