/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  async rewrites() {
    const api = process.env.API_INTERNAL_URL || 'http://localhost:3001';
    return [{ source: '/api/:path*', destination: `${api}/:path*` }];
  },
};

module.exports = nextConfig;
