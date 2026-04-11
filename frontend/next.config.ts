import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React strict mode for better development warnings
  reactStrictMode: true,
  // Skip type-checking during build (CI runs tsc separately)
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
