import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@demo-app/api-contracts",
    "@demo-app/database",
    "@demo-app/design-tokens",
  ],
};

export default nextConfig;