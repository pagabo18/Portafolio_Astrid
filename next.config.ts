import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // local database and uploads must never be baked into the image
  outputFileTracingExcludes: { "*": ["./data/**", "./storage/**"] },
  serverExternalPackages: ["sharp", "@electric-sql/pglite", "postgres", "bcryptjs"],
  experimental: {
    serverActions: { bodySizeLimit: "60mb" },
  },
};

export default nextConfig;
