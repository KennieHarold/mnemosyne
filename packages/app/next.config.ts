import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compiler: {
    styledComponents: true,
  },
  serverExternalPackages: [
    "@0glabs/0g-serving-broker",
    "@0gfoundation/0g-ts-sdk",
  ],
};

export default nextConfig;
