import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["bcryptjs", "multer"],
  experimental: {},
};

export default nextConfig;
