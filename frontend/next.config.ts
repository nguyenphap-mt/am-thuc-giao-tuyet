import type { NextConfig } from "next";

// API proxy is handled by /src/app/api/v1/[...path]/route.ts
// which preserves trailing slashes via 404-retry mechanism.
// Do NOT add rewrites here — they strip trailing slashes and conflict
// with the route handler. (BUG-20260216-006)

const nextConfig: NextConfig = {};

export default nextConfig;
