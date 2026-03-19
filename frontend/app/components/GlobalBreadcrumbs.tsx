'use client';

import { useIntlayer } from '@/app/i18n';
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

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const resolveBreadcrumbHref = (slug: string) => {
  if (slug === 'settings') return '/settings/profile';
  if (slug === 'custom-tables/import') return '/custom-tables?import=1';
  return `/${slug}`;
};

const resolveLabel = (value: unknown, fallback: string) => {
  if (typeof value === 'string') {
    return value;
  }

  if (value && typeof value === 'object' && 'value' in value) {
    const tokenValue = (value as { value?: string }).value;
    if (typeof tokenValue === 'string') {
      return tokenValue;
    }
  }

  return fallback;
};

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
    const crumbs = segments.map((_, idx) => {
      const slug = segments.slice(0, idx + 1).join('/');
      const fallback = segments[idx].length > 20 ? 'Details' : capitalize(segments[idx]);
      const label = resolveLabel(labels?.[slug], fallback);
      const href = idx === segments.length - 1 ? undefined : resolveBreadcrumbHref(slug);
      return { label, href };
    });

    return [{ label: resolveLabel(labels?.[''], 'Home'), href: '/' }, ...crumbs];
  }, [labels, pathname]);

  if (!items.length) return null;

  if (variant === 'sidepanel') {
    return <Breadcrumbs items={items} />;
  }

  return (
    <div data-global-breadcrumbs className="bg-transparent">
      <div className="container-shared px-4 py-2 sm:px-6 lg:px-8">
        <Breadcrumbs items={items} />
      </div>
    </div>
  );
}
