'use client';

import React from 'react';
import { Check, Clock3, Moon, PlayCircle, Sun, X } from '@/app/components/icons';
import { NotificationDropdown } from '@/app/components/NotificationDropdown';
import { getRecord, resolveLabel } from '@/app/lib/side-panel-utils';
import { TourMenu } from '@/app/tours/components/TourMenu';
import { isNavItemActive } from './helpers/navigation-config';
import type { NavItem, UserMenuTriggerProps } from './types';
import { UserMenuTriggerAndDropdown } from './UserMenu';

type ThemeKey = 'light' | 'dark' | 'auto';

const THEME_OPTS: { key: ThemeKey; label: string; icon: React.JSX.Element }[] = [
  { key: 'light', label: 'Light', icon: <Sun size={18} /> },
  { key: 'dark', label: 'Dark', icon: <Moon size={18} /> },
  { key: 'auto', label: 'Auto', icon: <Clock3 size={18} /> },
];

type MobileDrawerProps = {
  mobileMenuVisible: boolean;
  visibleNavItems: NavItem[];
  pathname: string;
  setMobileMenuOpen: (v: boolean) => void;
  selectedTheme: string;
  handleThemePreferenceChange: (key: ThemeKey) => Promise<void>;
  userMenuProps: UserMenuTriggerProps;
  nav: unknown;
};

// eslint-disable-next-line max-lines-per-function
export function MobileDrawer({
  mobileMenuVisible,
  visibleNavItems,
  pathname,
  setMobileMenuOpen,
  selectedTheme,
  handleThemePreferenceChange,
  userMenuProps,
  nav,
}: MobileDrawerProps): React.JSX.Element {
  const overlayClass = `lumio-navigation__mobile-drawer-overlay${mobileMenuVisible ? ' lumio-navigation__mobile-drawer-overlay--visible' : ' lumio-navigation__mobile-drawer-overlay--hidden'}`;
  const drawerClass = `lumio-navigation__mobile-drawer${mobileMenuVisible ? '' : ' lumio-navigation__mobile-drawer--closed'}`;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 70,
        pointerEvents: mobileMenuVisible ? undefined : 'none',
      }}
    >
      <div
        className={overlayClass}
        role="button"
        tabIndex={0}
        aria-label="Close menu"
        onClick={() => {
          setMobileMenuOpen(false);
        }}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setMobileMenuOpen(false);
          }
        }}
      />
      <dialog
        className={drawerClass}
        aria-modal="true"
        open
        onCancel={e => {
          e.preventDefault();
          setMobileMenuOpen(false);
        }}
      >
        <div className="lumio-navigation__mobile-drawer-header">
          <div style={{ minWidth: 0 }}>
            <UserMenuTriggerAndDropdown {...userMenuProps} mobile />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <NotificationDropdown iconSize={22} />
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
              }}
              className="lumio-navigation__mobile-drawer-close-btn"
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="lumio-navigation__mobile-drawer-body">
          <MobileNavLinks
            navItems={visibleNavItems}
            pathname={pathname}
            setMobileMenuOpen={setMobileMenuOpen}
          />
          <div className="lumio-navigation__mobile-divider" />
          <div className="lumio-navigation__mobile-section-label">Theme</div>
          {THEME_OPTS.map(opt => {
            const active = selectedTheme === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                className={`lumio-navigation__mobile-menu-btn${active ? ' lumio-navigation__mobile-menu-btn--active' : ''}`}
                onClick={() => {
                  void handleThemePreferenceChange(opt.key);
                }}
              >
                <span
                  className={
                    active
                      ? 'lumio-navigation__mobile-nav-icon--active'
                      : 'lumio-navigation__mobile-nav-icon'
                  }
                >
                  {opt.icon}
                </span>
                <span style={{ flex: 1, textAlign: 'left' }}>{opt.label}</span>
                {active && <Check size={18} />}
              </button>
            );
          })}
          <div className="lumio-navigation__mobile-divider" />
          <TourMenu
            trigger={
              <button type="button" className="lumio-navigation__mobile-menu-btn">
                <PlayCircle size={18} className="lumio-navigation__mobile-nav-icon" />
                <span style={{ flex: 1, textAlign: 'left' }}>
                  {resolveLabel(getRecord(nav as Record<string, unknown>)?.tours, 'Tours')}
                </span>
              </button>
            }
          />
        </div>
      </dialog>
    </div>
  );
}

function MobileNavLinks({
  navItems,
  pathname,
  setMobileMenuOpen,
}: {
  navItems: NavItem[];
  pathname: string;
  setMobileMenuOpen: (v: boolean) => void;
}): React.JSX.Element {
  return (
    <div style={{ paddingTop: 4, paddingBottom: 8 }}>
      {navItems.map(item => {
        const active = isNavItemActive(pathname, item.path);
        return (
          <a
            key={item.path}
            href={item.path}
            className={`lumio-navigation__mobile-nav-item${active ? ' lumio-navigation__mobile-nav-item--active' : ''}`}
            onClick={() => {
              setMobileMenuOpen(false);
            }}
          >
            <span
              className={
                active
                  ? 'lumio-navigation__mobile-nav-icon--active'
                  : 'lumio-navigation__mobile-nav-icon'
              }
            >
              {item.icon}
            </span>
            <span style={{ flex: 1 }}>{item.label}</span>
          </a>
        );
      })}
    </div>
  );
}
