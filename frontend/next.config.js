const path = require('path');
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const normalizeTarget = url => String(url || '').replace(/\/$/, '');

// Used to proxy API requests through the Next server to the backend when running as a single service
const apiProxyTarget = normalizeTarget(process.env.API_PROXY_TARGET || 'http://127.0.0.1:3001');

const { withIntlayerSync } = require('next-intlayer/server');

const intlayerAliases = {
  intlayer: './node_modules/intlayer/dist/cjs/index.cjs',
  '@intlayer/config/built': './node_modules/@intlayer/config/dist/cjs/built.cjs',
  'react-intlayer$': './node_modules/react-intlayer/dist/cjs/index.cjs',
  'react-intlayer/server$': './node_modules/react-intlayer/dist/cjs/server/index.cjs',
};

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  output: 'standalone',

  // Auto-memoizes components and hooks (React 19 + Next 16). See plan: re-render audit 2026-09.
  reactCompiler: true,

  // Stamped at build time so the UI can tell whether a newer commit exists upstream.
  env: {
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
  outputFileTracingRoot: __dirname,

  serverExternalPackages: ['esbuild'],

  // Turbopack's persistent on-disk cache for dev (default: on in Next 16.3+)
  // corrupts the manifest it writes under a Docker bind mount, causing every
  // app-router route to 500 with "ENOENT build-manifest.json". Disabling it
  // makes dev compile in-memory only, which fixes Fast Refresh here.
  experimental: {
    turbopackFileSystemCacheForDev: false,
  },

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
      'react-intlayer$': path.resolve(__dirname, 'node_modules/react-intlayer/dist/cjs/index.cjs'),
      'react-intlayer/server$': path.resolve(
        __dirname,
        'node_modules/react-intlayer/dist/cjs/server/index.cjs',
      ),
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

module.exports = withBundleAnalyzer(withIntlayerSync(nextConfig));
