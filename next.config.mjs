/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { proxyClientMaxBodySize: "110mb" },
  async rewrites() {
    const api = (
      process.env.API_INTERNAL_URL ||
      process.env.NEXT_PUBLIC_API_URL_DOCKER ||
      process.env.NEXT_PUBLIC_API_URL_HOST ||
      "http://localhost:81"
    ).replace(/\/$/, "");
    return [{ source: "/api/:path*", destination: `${api}/api/:path*` }];
  },
};

export default nextConfig;
