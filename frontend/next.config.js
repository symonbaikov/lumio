const path = require('path');

const normalizeTarget = url => String(url || '').replace(/\/$/, '');

// Used to proxy API requests through the Next server to the backend when running as a single service
const apiProxyTarget = normalizeTarget(process.env.API_PROXY_TARGET || 'http://127.0.0.1:3001');

const { withIntlayerSync } = require('next-intlayer/server');

const intlayerAliases = {
  intlayer: './node_modules/intlayer/dist/cjs/index.cjs',
  '@intlayer/config/built': './node_modules/@intlayer/config/dist/cjs/built.cjs',
  'react-intlayer': './node_modules/react-intlayer/dist/cjs/index.cjs',
};

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
    '@intlayer/config',
    '@intlayer/cli',
    'esbuild',
  ],

  turbopack: {
    resolveAlias: {
      ...intlayerAliases,
    },
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    config.resolve.alias = {
      ...config.resolve.alias,
      intlayer: path.resolve(__dirname, 'node_modules/intlayer/dist/cjs/index.cjs'),
      '@intlayer/config/built': path.resolve(
        __dirname,
        'node_modules/@intlayer/config/dist/cjs/built.cjs',
      ),
      'react-intlayer': path.resolve(__dirname, 'node_modules/react-intlayer/dist/cjs/index.cjs'),
    };
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
