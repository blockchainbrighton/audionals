/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true, // Enable React Strict Mode for better development feedback
  swcMinify: true, // Enable faster builds with SWC
  basePath: '/audinalinscriptionapps/audinalinscriptionapp', // Set the subdirectory path
};

module.exports = nextConfig;