import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@yourbestpeer/ui"],
  images: {
    domains: ["lh3.googleusercontent.com"],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3001"],
    },
  },
};

export default nextConfig;
