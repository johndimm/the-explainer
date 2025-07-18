/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  api: {
    bodyParser: {
      sizeLimit: '15mb', // Allow up to 15MB for PDF uploads (base64 encoding makes files ~33% larger)
    },
    responseLimit: false, // No limit on response size
  },
};

export default nextConfig;
