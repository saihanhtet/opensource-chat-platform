import type { NextConfig } from "next";

/** Express API when Next runs on another port (`next dev`). Not used when UI is served from the same server as the API. */
const backendProxyTarget =
  process.env.BACKEND_PROXY_URL ||
  process.env.BACKEND_URL ||
  "http://127.0.0.1:3000";

const nextConfig: NextConfig = {
  turbopack: {
    root: import.meta.dirname,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendProxyTarget.replace(/\/$/, "")}/api/:path*`,
      },
      {
        source: "/socket.io/:path*",
        destination: `${backendProxyTarget.replace(/\/$/, "")}/socket.io/:path*`,
      },
    ];
  },
};

export default nextConfig;
