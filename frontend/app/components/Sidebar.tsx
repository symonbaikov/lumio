'use client';

import Skeleton from '@mui/material/Skeleton';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import { useAuth } from '@/app/hooks/useAuth';
import { usePermissions } from '@/app/hooks/usePermissions';
import { useIntlayer } from '@/app/i18n';
import { useExperimentalMode } from '@/app/lib/experimental-mode';
import { buildNavItems, isNavItemActive } from './navigation/helpers/navigation-config';

// Matches buildNavItems() length so the skeleton doesn't jump when real items land.
const NAV_ITEM_SKELETON_KEYS = Array.from({ length: 15 }, (_, i) => `nav-skeleton-${i}`);

function SidebarContent() {
  const pathname = usePathname();
  const { hasPermission } = usePermissions();
  const { loading: authLoading } = useAuth();
  const { loading: workspaceLoading } = useWorkspace();
  const { nav, supportProject, shell, userMenu } = useIntlayer('navigation');

  const isLoading = authLoading || workspaceLoading;
  const navItems = buildNavItems(nav as Parameters<typeof buildNavItems>[0]);
  const experimentalMode = useExperimentalMode();
  const visibleNavItems = navItems.filter(
    item => hasPermission(item.permission) && (!item.experimental || experimentalMode),
  );

  return (
    <>
      {/* Brand */}
      <Link href="/" className="lumio-sidebar__brand" aria-label={shell.home.value}>
        <div className="lumio-sidebar__brand-mark" />
      </Link>

      {/* Navigation */}
      <nav className="lumio-sidebar__nav" aria-label={shell.mainNavigation.value}>
        <div className="lumio-sidebar__section-label">{userMenu.workspace}</div>
        {isLoading
          ? NAV_ITEM_SKELETON_KEYS.map(key => (
              <div className="lumio-sidebar__nav-item" key={key}>
                <Skeleton variant="rounded" width={18} height={18} />
                <Skeleton variant="text" width="60%" height={16} />
              </div>
            ))
          : visibleNavItems.map(item => {
              const active = isNavItemActive(pathname ?? '', item.path);
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`lumio-sidebar__nav-item${active ? ' lumio-sidebar__nav-item--active' : ''}`}
                >
                  <span className="lumio-sidebar__nav-icon">{item.icon}</span>
                  <span className="lumio-sidebar__nav-label">{item.label}</span>
                </Link>
              );
            })}
      </nav>

      <div className="lumio-sidebar__footer">
        <a
          href="https://github.com/sponsors/symonbaikov"
          target="_blank"
          rel="noopener noreferrer"
          className="lumio-sidebar__support-link"
        >
          <span className="lumio-sidebar__support-icon">💚</span>
          {(supportProject as { value?: string })?.value ?? 'Support the project'}
        </a>
      </div>
    </>
  );
}

export default function Sidebar() {
  return (
    <aside className="lumio-shell__sidebar">
      <SidebarContent />
    </aside>
  );
}
