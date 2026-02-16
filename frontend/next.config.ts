import type { NextConfig } from "next";

// API_BACKEND_URL: Server-side rewrite destination (Cloud Run URL)
// NEXT_PUBLIC_API_URL: Client-side base URL (should be /api/v1 in production to use proxy)
const API_BACKEND = process.env.API_BACKEND_URL || 'http://localhost:8000';

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
