const normalizeTarget = url => String(url || '').replace(/\/$/, '');

// Used to proxy API requests through the Next server to the backend when running as a single service
const apiProxyTarget = normalizeTarget(process.env.API_PROXY_TARGET || 'http://127.0.0.1:3001');

const { withIntlayerSync } = require('next-intlayer/server');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: __dirname,

  serverExternalPackages: [
    'intlayer',
    'next-intlayer',
    '@intlayer/core',
    '@intlayer/dictionaries-entry',
    'react-intlayer',
  ],

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    return config;
  },

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${apiProxyTarget}/api/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${apiProxyTarget}/uploads/:path*`,
      },
    ];
  },
};

module.exports = withIntlayerSync(nextConfig);
