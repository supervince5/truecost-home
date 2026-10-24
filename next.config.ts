import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a self-contained server for the Cloud Run container.
  output: "standalone",
  poweredByHeader: false,
};

export default nextConfig;
