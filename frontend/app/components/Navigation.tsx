'use client';

import { NotificationDropdown } from '@/app/components/NotificationDropdown';
import { useIsMobile } from '@/app/hooks/useIsMobile';
import { useLockBodyScroll } from '@/app/hooks/useLockBodyScroll';
import { normalizeAvatarUrl } from '@/app/lib/avatar-url';
import { getRecord, resolveLabel } from '@/app/lib/side-panel-utils';
import { TourMenu } from '@/app/tours/components/TourMenu';
import 'driver.js/dist/driver.css';

import { HelpCircle, X } from '@/app/components/icons';
import { useIntlayer, useLocale } from '@/app/i18n';
import { tokens } from '@/lib/theme-tokens';
import { useTheme } from 'next-themes';
import { Nunito } from 'next/font/google';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';
import { LanguageDrawer } from './navigation/LanguageDrawer';
import { MobileDrawer } from './navigation/MobileDrawer';
import { UserMenuTriggerAndDropdown } from './navigation/UserMenu';
import {
  type AppLanguage,
  buildNavItems,
  isNavItemActive,
} from './navigation/helpers/navigation-config';
import { useLanguageSelection } from './navigation/hooks/useLanguageSelection';
import { useMobileMenu } from './navigation/hooks/useMobileMenu';
import { useNavigationTour } from './navigation/hooks/useNavigationTour';
import { useThemePreference } from './navigation/hooks/useThemePreference';

const nunito = Nunito({ subsets: ['latin'], weight: ['800', '900'] });
const HIDDEN_PATHS = ['/onboarding', '/login', '/register', '/shared', '/invite'];

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types, max-lines-per-function, complexity
export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, setUser } = useAuth();
  const { hasPermission } = usePermissions();
  const { currentWorkspace } = useWorkspace();
  const { locale, availableLocales, setLocale } = useLocale();
  const { setTheme } = useTheme();
  const {
    nav,
    userMenu,
    languageModal,
    languages: languageNames,
    tour,
  } = useIntlayer('navigation');
  const getText = useCallback((token: unknown): string => resolveLabel(token, ''), []);
  const isMobile = useIsMobile();
  const [portalReady, setPortalReady] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const { mobileMenuOpen, setMobileMenuOpen, mobileMenuMounted, mobileMenuVisible } =
    useMobileMenu(pathname);
  const { selectedTheme, handleThemePreferenceChange } = useThemePreference({
    userThemePreference: user?.themePreference,
    user,
    setUser,
    setTheme,
    resolveLabel,
    navTheme: getRecord(getRecord(nav)?.theme)?.description,
  });
  const langProps = useLanguageSelection({
    locale,
    availableLocales,
    setLocale,
    languageNames,
    languageModal,
    setMobileMenuOpen,
  });

  useNavigationTour({ tour, isMobile, getText });
  useLockBodyScroll(langProps.languageModalOpen || mobileMenuOpen);
  useEffect(() => {
    setPortalReady(true);
  }, []);
  useEffect(() => {
    setAvatarError(false);
  }, [user?.avatarUrl]);

  const navItems = buildNavItems(nav as Parameters<typeof buildNavItems>[0]);
  const visibleNavItems = navItems.filter(item => hasPermission(item.permission));

  const navigateFromUserMenu = useCallback(
    (path: string): void => {
      setMobileMenuOpen(false);
      router.push(path);
    },
    [router, setMobileMenuOpen],
  );

  const handleAction = useCallback(
    (key: string): void => {
      const MAP: Record<string, () => void> = {
        settings: () => {
          navigateFromUserMenu('/settings/profile');
        },
        trash: () => {
          navigateFromUserMenu('/statements/trash');
        },
        language: () => {
          langProps.openLanguageMenu();
        },
        admin: () => {
          navigateFromUserMenu('/admin');
        },
        knowledgeBase: () => {
          setMobileMenuOpen(false);
          window.open('https://symonbaikov.github.io/lumio/', '_blank', 'noopener,noreferrer');
        },
        logout: () => {
          setMobileMenuOpen(false);
          void logout();
          toast.success(userMenu.logoutSuccess.value);
        },
      };
      MAP[key]?.();
    },
    [logout, navigateFromUserMenu, langProps, setMobileMenuOpen, userMenu.logoutSuccess.value],
  );

  if (!user || HIDDEN_PATHS.some(p => pathname.startsWith(p))) {
    return null;
  }

  const userMenuProps = {
    user,
    normalizedAvatarUrl: normalizeAvatarUrl(user?.avatarUrl),
    avatarError,
    setAvatarError,
    anchorEl,
    open: Boolean(anchorEl),
    trashLabel: resolveLabel(getRecord(userMenu)?.trash, 'Trash'),
    languageLabel: langProps.languageLabel,
    userMenu: userMenu as Record<string, unknown>,
    onOpen: (e: React.MouseEvent<HTMLElement>): void => {
      setAnchorEl(e.currentTarget);
    },
    onClose: (): void => {
      setAnchorEl(null);
    },
    onAction: (key: string): void => {
      setAnchorEl(null);
      handleAction(key);
    },
  };

  return (
    <header className="lumio-navigation">
      <div className="lumio-navigation__inner">
        <div className="lumio-navigation__bar">
          <div className="lumio-navigation__brand">
            <Link href="/" className="lumio-navigation__logo-link" data-tour-id="brand">
              <div className="lumio-navigation__logo-icon">
                <Image
                  src="/images/logo.jpg"
                  alt="Lumio"
                  width={32}
                  height={32}
                  style={{ borderRadius: tokens.radius.sm, display: 'block' }}
                />
              </div>
              <span className={`lumio-navigation__logo-text ${nunito.className}`}>LUMIO</span>
            </Link>
            <nav className="lumio-navigation__primary-nav" data-tour-id="primary-nav">
              {visibleNavItems.map(item => {
                const active = isNavItemActive(pathname, item.path);
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`lumio-navigation__nav-item${active ? ' lumio-navigation__nav-item--active' : ''}`}
                  >
                    <span className="lumio-navigation__nav-icon">{item.icon}</span>
                    <span className="lumio-navigation__nav-label">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="lumio-navigation__actions">
            <div className="lumio-navigation__desktop-actions">
              <NotificationDropdown />
              <TourMenu
                trigger={
                  <button type="button" className="lumio-navigation__icon-btn" title="Help">
                    <HelpCircle size={20} />
                  </button>
                }
              />
              <div className="lumio-navigation__user-menu-area">
                <UserMenuTriggerAndDropdown {...userMenuProps} />
              </div>
            </div>
            <div className="lumio-navigation__mobile-toggle">
              <button
                onClick={() => {
                  setMobileMenuOpen(prev => !prev);
                }}
                className="lumio-navigation__mobile-btn"
                data-tour-id="mobile-menu-toggle"
                aria-label="Open menu"
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? (
                  <X size={24} />
                ) : (
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      {mobileMenuMounted && (
        <MobileDrawer
          mobileMenuVisible={mobileMenuVisible}
          visibleNavItems={visibleNavItems}
          pathname={pathname}
          setMobileMenuOpen={setMobileMenuOpen}
          selectedTheme={selectedTheme}
          handleThemePreferenceChange={handleThemePreferenceChange}
          userMenuProps={userMenuProps}
          nav={nav}
        />
      )}
      {portalReady && (
        <LanguageDrawer
          isOpen={langProps.languageModalOpen}
          onClose={langProps.closeLanguageMenu}
          languageModal={languageModal}
          languageSearch={langProps.languageSearch}
          setLanguageSearch={langProps.setLanguageSearch}
          filteredLanguages={langProps.filteredLanguages}
          normalizedLocale={langProps.normalizedLocale}
          handleLanguageSelect={(code: string): void =>
            langProps.handleLanguageSelect(code as AppLanguage)
          }
        />
      )}
    </header>
  );
}
