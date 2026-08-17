'use client';

import {
  BarChart2,
  FileText,
  LayoutDashboard,
  Menu,
  Plus,
  Receipt,
  ScanLine,
  Upload,
} from '@/app/components/icons';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { isNavItemActive } from '../navigation/helpers/navigation-config';
import { MobileMenuDrawer } from './MobileMenuDrawer';

const HIDDEN_PATHS = ['/onboarding', '/login', '/register', '/shared', '/invite', '/chat'];

const FAB_ACTIONS = [
  {
    id: 'upload',
    label: 'Upload',
    icon: Upload,
    href: '/statements/submit?openExpenseDrawer=scan',
  },
  { id: 'scan', label: 'Scan', icon: ScanLine, href: '/statements/submit?openExpenseDrawer=scan' },
  {
    id: 'expense',
    label: 'Expense',
    icon: Receipt,
    href: '/statements/submit?openExpenseDrawer=manual',
  },
] as const;

export default function MobileBottomBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);

  const closeFab = useCallback(() => setFabOpen(false), []);

  // Close FAB on route change
  useEffect(() => {
    closeFab();
  }, [pathname, closeFab]);

  // Close FAB on escape
  useEffect(() => {
    if (!fabOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeFab();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [fabOpen, closeFab]);

  if (HIDDEN_PATHS.some(p => pathname?.startsWith(p))) {
    return null;
  }

  return (
    <>
      {/* FAB backdrop */}
      {fabOpen && (
        <div className="lumio-bottom-bar__fab-backdrop" onClick={closeFab} aria-hidden="true" />
      )}

      {/* FAB radial menu (upward) */}
      <div
        className={`lumio-bottom-bar__fab-menu${fabOpen ? ' lumio-bottom-bar__fab-menu--open' : ''}`}
      >
        {FAB_ACTIONS.map((action, index) => (
          <button
            key={action.id}
            type="button"
            className="lumio-bottom-bar__fab-action"
            style={{ '--fab-index': index } as React.CSSProperties}
            onClick={() => {
              router.push(action.href);
              closeFab();
            }}
          >
            <span className="lumio-bottom-bar__fab-action-icon">
              <action.icon size={18} />
            </span>
            <span className="lumio-bottom-bar__fab-action-label">{action.label}</span>
          </button>
        ))}
      </div>

      <nav
        className={`lumio-bottom-bar${fabOpen ? ' lumio-bottom-bar--fab-open' : ''}`}
        aria-label="Mobile navigation"
      >
        {/* Tab 1: Dashboard */}
        <Link
          href="/dashboard"
          className={`lumio-bottom-bar__tab${isNavItemActive(pathname ?? '', '/dashboard') ? ' lumio-bottom-bar__tab--active' : ''}`}
        >
          <LayoutDashboard size={22} />
        </Link>

        {/* Tab 2: Statements */}
        <Link
          href="/statements"
          className={`lumio-bottom-bar__tab${isNavItemActive(pathname ?? '', '/statements') ? ' lumio-bottom-bar__tab--active' : ''}`}
        >
          <FileText size={22} />
        </Link>

        {/* Tab 3: FAB — Quick Actions */}
        <button
          type="button"
          className="lumio-bottom-bar__fab"
          onClick={() => setFabOpen(prev => !prev)}
          aria-label="Quick actions"
        >
          <Plus
            size={24}
            style={{
              transition: 'transform 0.25s',
              transform: fabOpen ? 'rotate(45deg)' : 'rotate(0deg)',
            }}
          />
        </button>

        {/* Tab 4: Reports */}
        <Link
          href="/reports"
          className={`lumio-bottom-bar__tab${isNavItemActive(pathname ?? '', '/reports') ? ' lumio-bottom-bar__tab--active' : ''}`}
        >
          <BarChart2 size={22} />
        </Link>

        {/* Tab 5: Menu */}
        <button
          type="button"
          className="lumio-bottom-bar__tab"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
      </nav>

      <MobileMenuDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
