import type { NextConfig } from "next";

/**
 * Static export for GitHub Pages. NEXT_PUBLIC_BASE_PATH is "/<repo>" on
 * project pages (set by the workflow) and "" for user pages / custom domains.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
