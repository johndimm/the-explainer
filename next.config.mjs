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
  
  // Aggressive redirect to test root path issue
  async redirects() {
    return [
      {
        source: '/',
        destination: '/home',
        permanent: false,
        basePath: false,
      },
    ];
  },
  
  // Add headers to prevent caching
  async headers() {
    return [
      {
        source: '/',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
