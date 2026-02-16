import type { NextConfig } from "next";

// API_BACKEND_URL: Server-side rewrite destination (Cloud Run URL)
// Falls back to production Cloud Run URL; localhost for local dev via .env.local
const API_BACKEND = process.env.API_BACKEND_URL || 'https://am-thuc-api-321822391174.asia-southeast1.run.app';

const nextConfig: NextConfig = {
  // BUGFIX: BUG-20260216-005 — Users Tab 404
  // Next.js default strips trailing slashes before applying rewrites.
  // Backend has redirect_slashes=False and requires trailing slashes on some routes.
  // Without this, frontend's /api/v1/users/ becomes /api/v1/users → 404 on backend.
  skipTrailingSlashRedirect: true,
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
