/**
 * @type {import('next').NextConfig}
 * Configuration for Next.js static export.
 */
const nextConfig = {
  // Enables React's Strict Mode. Recommended for development.
  reactStrictMode: true,

  // --- Static Site Generation (SSG) ---
  // Exports the site as static HTML/CSS/JS files for hosting without a Node.js server.
  output: 'export', // <-- THIS LINE IS CRUCIAL

  // --- Compiler Options ---
  // Enable if using styled-components. Remove if not.
  compiler: {
    styledComponents: true,
  },

  // --- Image Optimization ---
  // Configure allowed remote hosts for next/image.
  images: {
    // Use remotePatterns (preferred over deprecated domains).
    remotePatterns: [
      {
        protocol: 'https', // Or 'http' if needed
        hostname: 'audionals.com',
      },
    ],
    // Disable built-in optimization for static export compatibility
    unoptimized: true, // <-- THIS LINE IS NEEDED
  },

  // --- Custom HTTP Headers ---
  // NOTE: These likely WON'T be applied during static export.
  // Configure them on your actual web server or hosting platform instead.
  async headers() {
    return [
      {
        source: '/(.*)', // Matches all paths
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ];
  },

  // i18n block REMOVED - Incompatible with output: 'export'
};

module.exports = nextConfig;