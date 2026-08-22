import type { MetadataRoute } from 'next';

/**
 * Served at /manifest.webmanifest and linked automatically by Next.
 * ponytail: no service worker, so this gives iOS "Add to Home Screen" and
 * standalone chrome, not Chrome's install prompt or offline support — add a
 * worker only once there is a real offline story worth caching for.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Lumio',
    // biome-ignore lint/style/useNamingConvention: key name is fixed by the web app manifest spec
    short_name: 'Lumio',
    description: 'Import, categorize, and analyze bank statement data.',
    // biome-ignore lint/style/useNamingConvention: key name is fixed by the web app manifest spec
    start_url: '/dashboard',
    display: 'standalone',
    // biome-ignore lint/style/useNamingConvention: key name is fixed by the web app manifest spec
    background_color: '#ffffff',
    // biome-ignore lint/style/useNamingConvention: key name is fixed by the web app manifest spec
    theme_color: '#0584c7',
    icons: [
      {
        src: '/images/favicon-new.png',
        sizes: '192x192 512x512 1024x1024',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
