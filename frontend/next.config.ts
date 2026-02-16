import type { NextConfig } from "next";

// API proxy is now handled by /src/app/api/v1/[...path]/route.ts
// which preserves trailing slashes (required by backend with redirect_slashes=False)
// See BUG-20260216-005

const nextConfig: NextConfig = {
  // No rewrites needed — catch-all API route handler handles proxying
};

export default nextConfig;

