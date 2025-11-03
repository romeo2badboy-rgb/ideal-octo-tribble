/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Handle VRM files
    config.module.rules.push({
      test: /\.vrm$/,
      type: 'asset/resource',
    });
    return config;
  },
};

module.exports = nextConfig;
