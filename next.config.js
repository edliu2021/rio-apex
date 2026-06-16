/** @type {import('next').NextConfig} */
const nextConfig = {
  // better-sqlite3 is a native module; keep it out of the bundle.
  experimental: {
    serverComponentsExternalPackages: ["better-sqlite3"],
  },
  // Don't fail the production build on ESLint findings (type-checking still runs).
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
