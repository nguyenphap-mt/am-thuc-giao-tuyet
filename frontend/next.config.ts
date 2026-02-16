import type { NextConfig } from "next";

// Server-side env var for rewrites destination (Cloud Run backend)
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
