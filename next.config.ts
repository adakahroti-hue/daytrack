import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prefetch semua Link saat masuk viewport → klik tab terasa instan
  // (default Next hanya prefetch saat hover; ini lebih agresif untuk app internal)
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns"],
  },
};

export default nextConfig;
