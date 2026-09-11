'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { HelpCircle, Settings, X } from '@/app/components/icons';
import { usePermissions } from '@/app/hooks/usePermissions';
import { useIntlayer } from '@/app/i18n';
import { buildNavItems, isNavItemActive } from '../navigation/helpers/navigation-config';

interface MobileMenuDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function MobileMenuDrawer({ open, onClose }: MobileMenuDrawerProps) {
  const pathname = usePathname();
  const { hasPermission } = usePermissions();
  const { nav } = useIntlayer('navigation');

  const navItems = buildNavItems(nav as Parameters<typeof buildNavItems>[0]);
  const visibleNavItems = navItems.filter(item => hasPermission(item.permission));

  // Close on route change
  useEffect(() => {
    onClose();
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`lumio-mobile-drawer__backdrop${open ? ' lumio-mobile-drawer__backdrop--visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        className={`lumio-mobile-drawer${open ? ' lumio-mobile-drawer--open' : ''}`}
        aria-label="Menu"
      >
        <div className="lumio-mobile-drawer__header">
          <span className="lumio-mobile-drawer__title">Menu</span>
          <button
            type="button"
            className="lumio-mobile-drawer__close"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="lumio-mobile-drawer__nav">
          <div className="lumio-mobile-drawer__section-label">Workspace</div>
          {visibleNavItems.map(item => {
            const active = isNavItemActive(pathname ?? '', item.path);
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`lumio-mobile-drawer__item${active ? ' lumio-mobile-drawer__item--active' : ''}`}
                onClick={onClose}
              >
                <span className="lumio-mobile-drawer__item-icon">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="lumio-mobile-drawer__footer">
          <Link href="/settings/profile" className="lumio-mobile-drawer__item" onClick={onClose}>
            <span className="lumio-mobile-drawer__item-icon">
              <Settings size={18} />
            </span>
            <span>Settings</span>
          </Link>
          <button
            type="button"
            className="lumio-mobile-drawer__item"
            onClick={() => {
              window.open('https://symonbaikov.github.io/lumio/', '_blank', 'noopener,noreferrer');
              onClose();
            }}
          >
            <span className="lumio-mobile-drawer__item-icon">
              <HelpCircle size={18} />
            </span>
            <span>Help</span>
          </button>
        </div>
      </aside>
    </>
  );
}
