'use client';

import { useIntlayer } from '@/app/i18n';
import { DEFAULT_APP_ROUTE } from '@/app/lib/default-app-route';
import { resolveLabel } from '@/app/lib/side-panel-utils';
import Box from '@mui/material/Box';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import Breadcrumbs from './Breadcrumbs';

interface GlobalBreadcrumbsProps {
  variant?: 'topbar' | 'sidepanel';
}

const HIDDEN_PATHS = new Set<string>([
  '/login',
  '/register',
  '/auth',
  '/auth/callback',
  '/workspaces',
  '/dashboard',
]);

const capitalize = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const resolveBreadcrumbHref = (slug: string) => {
  if (slug === 'settings') return '/settings/profile';
  if (slug === 'custom-tables/import') return '/custom-tables?import=1';
  return `/${slug}`;
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types, max-lines-per-function
export default function GlobalBreadcrumbs({ variant = 'topbar' }: GlobalBreadcrumbsProps) {
  const pathname = usePathname() || '/';
  const { labels } = useIntlayer('breadcrumbs') as {
    labels: Record<string, unknown>;
  };

  const items = useMemo(() => {
    if (pathname.startsWith('/onboarding')) return [];
    if (HIDDEN_PATHS.has(pathname)) return [];
    if (pathname === '/') return [];
    if (pathname.startsWith('/dashboard')) return [];

    const segments = pathname.split('/').filter(Boolean);
    // eslint-disable-next-line max-params
    const crumbs = segments.map((_, idx) => {
      const slug = segments.slice(0, idx + 1).join('/');
      const fallback = segments[idx].length > 20 ? 'Details' : capitalize(segments[idx]);
      const label = resolveLabel(labels?.[slug], fallback);
      const href = idx === segments.length - 1 ? undefined : resolveBreadcrumbHref(slug);
      return { label, href };
    });

    return [{ label: resolveLabel(labels?.[''], 'Home'), href: DEFAULT_APP_ROUTE }, ...crumbs];
  }, [labels, pathname]);

  if (!items.length) return null;

  if (variant === 'sidepanel') {
    return <Breadcrumbs items={items} />;
  }

  return (
    <div data-global-breadcrumbs>
      <Box sx={{ py: 1 }}>
        <Breadcrumbs items={items} />
      </Box>
    </div>
  );
}
