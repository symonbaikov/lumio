'use client';

import { NotificationDropdown } from '@/app/components/NotificationDropdown';
import { HelpCircle, Menu } from '@/app/components/icons';
import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import { useAuth } from '@/app/hooks/useAuth';
import { usePermissions } from '@/app/hooks/usePermissions';
import { useIntlayer, useLocale } from '@/app/i18n';
import { normalizeAvatarUrl } from '@/app/lib/avatar-url';
import { getRecord, resolveLabel } from '@/app/lib/side-panel-utils';
import { canAccessWorkspaceActivity } from '@/app/lib/workspace-activity-access';
import { AiAssistantTopBarButton } from '@/app/plugins/ai-assistant/AiAssistantTopBarButton';
import { McpServerTopBarButton } from '@/app/plugins/mcp-server/McpServerTopBarButton';
import { TourMenu } from '@/app/tours/components/TourMenu';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { tokens } from '@/lib/theme-tokens';
import Image from 'next/image';
import GlobalBreadcrumbs from './GlobalBreadcrumbs';
import { LanguageDrawer } from './navigation/LanguageDrawer';
import { UserMenuTriggerAndDropdown } from './navigation/UserMenu';
import { useLanguageSelection } from './navigation/hooks/useLanguageSelection';
import { useThemePreference } from './navigation/hooks/useThemePreference';

const SIDEBAR_OPEN_EVENT = 'lumio-sidebar-open';
const HIDDEN_PATHS = ['/onboarding', '/login', '/register', '/shared', '/invite'];

export default function TopBar() {
  const pathname = usePathname();
  const { user, logout, setUser } = useAuth();
  const { isAdmin } = usePermissions();
  const { currentWorkspace } = useWorkspace();
  const { setTheme } = useTheme();
  const { locale, availableLocales, setLocale } = useLocale();
  const { userMenu, languageModal, languages: languageNames } = useIntlayer('navigation');
  const router = useRouter();
  const [avatarError, setAvatarError] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const { handleThemePreferenceChange } = useThemePreference({
    userThemePreference: user?.themePreference,
    user,
    setUser,
    setTheme,
    resolveLabel,
    navTheme: undefined,
  });

  const langProps = useLanguageSelection({
    locale,
    availableLocales,
    setLocale,
    languageNames,
    languageModal,
    setMobileMenuOpen: () => {},
  });

  const navigateFromUserMenu = useCallback(
    (path: string): void => {
      router.push(path);
    },
    [router],
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
          window.open('https://symonbaikov.github.io/lumio/', '_blank', 'noopener,noreferrer');
        },
        logout: () => {
          void logout();
          toast.success(userMenu.logoutSuccess.value);
        },
      };
      MAP[key]?.();
    },
    [logout, navigateFromUserMenu, langProps, userMenu.logoutSuccess.value],
  );

  if (!user || HIDDEN_PATHS.some(p => pathname?.startsWith(p))) {
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
    isAdmin,
    canAccessActivity: canAccessWorkspaceActivity(currentWorkspace?.memberRole),
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
    <>
      <header className="lumio-topbar">
        <button
          type="button"
          className="lumio-topbar__hamburger"
          aria-label="Open navigation"
          onClick={() => window.dispatchEvent(new Event(SIDEBAR_OPEN_EVENT))}
        >
          <Menu size={20} />
        </button>

        <Link href="/dashboard" className="lumio-topbar__mobile-logo">
          <Image
            src="/images/logo.jpg"
            alt="Lumio"
            width={28}
            height={28}
            style={{ display: 'block', borderRadius: tokens.radius.sm }}
          />
          <span className="lumio-topbar__mobile-logo-text">Lumio</span>
        </Link>

        <div className="lumio-topbar__breadcrumbs">
          <GlobalBreadcrumbs variant="topbar" />
        </div>

        <div className="lumio-topbar__right">
          <AiAssistantTopBarButton />
          <McpServerTopBarButton />
          <NotificationDropdown iconSize={18} />
          <TourMenu
            trigger={
              <button type="button" className="lumio-topbar__icon-btn" title="Help">
                <HelpCircle size={18} />
              </button>
            }
          />
          <UserMenuTriggerAndDropdown {...userMenuProps} />
        </div>
      </header>

      <LanguageDrawer
        isOpen={langProps.languageModalOpen}
        onClose={langProps.closeLanguageMenu}
        languageModal={languageModal}
        languageSearch={langProps.languageSearch}
        setLanguageSearch={langProps.setLanguageSearch}
        filteredLanguages={langProps.filteredLanguages}
        normalizedLocale={langProps.normalizedLocale}
        handleLanguageSelect={langProps.handleLanguageSelect as (code: string) => void}
      />
    </>
  );
}
