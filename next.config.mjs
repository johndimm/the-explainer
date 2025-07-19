/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverRuntimeConfig: {
    // Server-side configuration
  },
  publicRuntimeConfig: {
    // Client-side configuration
  },
  // Note: API body parser limits should be configured in individual API routes
  // or using middleware, not in next.config.mjs
};

export default nextConfig;
