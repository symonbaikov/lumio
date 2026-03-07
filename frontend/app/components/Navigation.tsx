'use client';

import { NotificationDropdown } from '@/app/components/NotificationDropdown';
import { DrawerShell } from '@/app/components/ui/drawer-shell';
import { useIsMobile } from '@/app/hooks/useIsMobile';
import { useLockBodyScroll } from '@/app/hooks/useLockBodyScroll';
import { normalizeAvatarUrl } from '@/app/lib/avatar-url';
import { TourMenu } from '@/app/tours/components/TourMenu';
import { type DriveStep, driver } from 'driver.js';
import 'driver.js/dist/driver.css';

import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownSection,
  DropdownTrigger,
} from '@heroui/react';
import ApartmentIcon from '@mui/icons-material/Apartment';
import AssignmentAddIcon from '@mui/icons-material/AssignmentAdd';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ElectricBoltIcon from '@mui/icons-material/ElectricBolt';
import FiberSmartRecordIcon from '@mui/icons-material/FiberSmartRecord';
import LanguageIcon from '@mui/icons-material/Language';
import QuestionMarkIcon from '@mui/icons-material/QuestionMark';
import SchoolIcon from '@mui/icons-material/School';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import {
  Check,
  ChevronLeft,
  Database,
  Edit3,
  FileText,
  Laptop,
  LogOut,
  Menu,
  Moon,
  PlayCircle,
  Plug,
  Search,
  Settings,
  Sun,
  Table,
  Tags,
  Trash2,
  User,
  Wallet,
  X,
} from 'lucide-react';
import { useIntlayer, useLocale } from "@/app/i18n";
import { useTheme } from 'next-themes';
import { Nunito } from 'next/font/google';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';
import { canAccessWorkspaceActivity } from '../lib/workspace-activity-access';

const nunito = Nunito({ subsets: ['latin'], weight: ['800', '900'] });

const MOBILE_MENU_VISIBILITY_EVENT = 'lumio-mobile-menu-visibility';

type AppLanguage = 'ru' | 'en' | 'kk';

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const normalizedAvatarUrl = normalizeAvatarUrl(user?.avatarUrl);
  const { isAdmin, hasPermission } = usePermissions();
  const { currentWorkspace } = useWorkspace();
  const { locale, availableLocales, setLocale } = useLocale();
  const { setTheme, theme: selectedTheme } = useTheme();
  const {
    nav,
    userMenu,
    languageModal,
    languages: languageNames,
    tour,
  } = useIntlayer('navigation');
  const trashLabel = (userMenu as Record<string, any>).trash?.value ?? 'Trash';

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileMenuMounted, setMobileMenuMounted] = useState(false);
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
  const [languageModalOpen, setLanguageModalOpen] = useState(false);
  const [languageSearch, setLanguageSearch] = useState('');
  const [portalReady, setPortalReady] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const isMobile = useIsMobile();

  useLockBodyScroll(languageModalOpen || mobileMenuOpen);

  const getText = useCallback((token: unknown) => {
    if (typeof token === 'string') return token;
    if (token && typeof token === 'object' && 'value' in token) {
      const value = (token as { value?: string }).value;
      return typeof value === 'string' ? value : '';
    }
    return '';
  }, []);

  type PopoverType = NonNullable<DriveStep['popover']>;

  const buildTourSteps = useCallback<() => DriveStep[]>(() => {
    if (typeof document === 'undefined') {
      return [];
    }

    const isElementVisible = (element: Element) => {
      const rect = element.getClientRects();
      if (!rect.length) return false;
      const style = window.getComputedStyle(element as HTMLElement);
      return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    };

    type TourCandidate = {
      selector: string;
      title: string;
      description: string;
      side?: PopoverType['side'];
      align?: PopoverType['align'];
    };

    const candidates: TourCandidate[] = [
      {
        selector: '[data-tour-id="brand"]',
        title: getText(tour.steps.brand.title),
        description: getText(tour.steps.brand.description),
        side: 'bottom',
        align: 'start',
      },
      {
        selector: '[data-tour-id="primary-nav"]',
        title: getText(tour.steps.navigation.title),
        description: getText(tour.steps.navigation.description),
        side: 'bottom',
        align: 'start',
      },

      {
        selector: '[data-tour-id="user-menu-trigger"]',
        title: getText(tour.steps.userMenu.title),
        description: getText(tour.steps.userMenu.description),
        side: 'bottom',
        align: 'end',
      },
    ];

    if (isMobile) {
      candidates.splice(1, 0, {
        selector: '[data-tour-id="mobile-menu-toggle"]',
        title: getText(tour.steps.mobileMenu.title),
        description: getText(tour.steps.mobileMenu.description),
        side: 'bottom',
        align: 'end',
      });
    }

    return candidates.flatMap<DriveStep>(candidate => {
      const element = document.querySelector(candidate.selector);
      if (!element || !isElementVisible(element)) {
        return [];
      }

      return [
        {
          element,
          popover: {
            title: candidate.title,
            description: candidate.description,
            side: candidate.side ?? 'bottom',
            align: candidate.align ?? 'start',
          },
        },
      ];
    });
  }, [getText, tour]);

  useEffect(() => setPortalReady(true), []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (mobileMenuOpen) {
      setMobileMenuMounted(true);
      const frame = window.requestAnimationFrame(() => {
        setMobileMenuVisible(true);
      });

      return () => {
        window.cancelAnimationFrame(frame);
      };
    }

    if (!mobileMenuMounted) {
      return;
    }

    setMobileMenuVisible(false);
    const timer = window.setTimeout(() => {
      setMobileMenuMounted(false);
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [mobileMenuOpen, mobileMenuMounted]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileMenuOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent(MOBILE_MENU_VISIBILITY_EVENT, {
        detail: { open: mobileMenuOpen },
      }),
    );

    return () => {
      window.dispatchEvent(
        new CustomEvent(MOBILE_MENU_VISIBILITY_EVENT, {
          detail: { open: false },
        }),
      );
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    setAvatarError(false);
  }, [user?.avatarUrl]);

  const languages = useMemo(
    () =>
      [
        {
          code: 'ru' as const,
          label: languageNames.ru.value,
          note: languageModal.defaultLanguageNote.value,
        },
        { code: 'en' as const, label: languageNames.en.value },
        { code: 'kk' as const, label: languageNames.kk.value },
      ].filter(l => availableLocales.map(String).includes(l.code)) satisfies Array<{
        code: AppLanguage;
        label: string;
        note?: string;
      }>,
    [availableLocales, languageModal.defaultLanguageNote, languageNames],
  );

  const languageLabel = useMemo(() => {
    const normalizedLocale = (locale as AppLanguage) || 'ru';
    return languages.find(l => l.code === normalizedLocale)?.label ?? languageNames.ru.value;
  }, [locale, languages, languageNames.ru.value]);

  const normalizedLocale = (locale as AppLanguage) || 'ru';

  const filteredLanguages = useMemo(() => {
    const query = languageSearch.trim().toLowerCase();
    if (!query) {
      return languages;
    }

    return languages.filter(lang => lang.label.toLowerCase().includes(query));
  }, [languageSearch, languages]);

  const handleLanguageSelect = useCallback(
    (code: AppLanguage) => {
      setLocale(code);
      setLanguageModalOpen(false);
      setLanguageSearch('');
      const selectedLabel = languages.find(l => l.code === code)?.label ?? languageNames.ru.value;
      toast.success(`${languageModal.savedToastPrefix.value}: ${selectedLabel}`);
      setTimeout(() => {
        window.location.reload();
      }, 50);
    },
    [languageModal.savedToastPrefix.value, languageNames.ru.value, languages, setLocale],
  );

  const navItems = [
    {
      label: (nav as any).dashboard,
      path: '/',
      icon: <DashboardIcon sx={{ fontSize: 18 }} />,
      permission: 'statement.view',
    },
    {
      label: nav.statements,
      path: '/statements',
      icon: <FileText size={18} />,
      permission: 'statement.view',
    },
    {
      label: nav.tables,
      path: '/custom-tables',
      icon: <Table size={18} />,
      permission: 'statement.view',
    },
    {
      label: nav.workspaces,
      path: '/workspaces',
      icon: <ApartmentIcon sx={{ fontSize: 18 }} />,
      permission: 'workspaces.view',
    },
    {
      label: nav.reports,
      path: '/reports',
      icon: <AssignmentAddIcon sx={{ fontSize: 18 }} />,
      permission: 'statement.view',
    },
  ];

  const visibleNavItems = navItems.filter(item => hasPermission(item.permission));
  const isNavItemActive = (itemPath: string) =>
    pathname === itemPath || pathname.startsWith(`${itemPath}/`);

  const openLanguageMenu = useCallback(() => {
    setLanguageSearch('');
    setLanguageModalOpen(true);
    setMobileMenuOpen(false);
  }, []);

  const navigateFromUserMenu = useCallback(
    (path: string) => {
      setMobileMenuOpen(false);
      router.push(path);
    },
    [router],
  );

  const handleUserMenuAction = useCallback(
    (key: React.Key) => {
      switch (String(key)) {
        case 'settings':
          navigateFromUserMenu('/settings/profile');
          return;
        case 'integrations':
          navigateFromUserMenu('/integrations');
          return;
        case 'trash':
          navigateFromUserMenu('/statements/trash');
          return;
        case 'language':
          openLanguageMenu();
          return;
        case 'admin':
          navigateFromUserMenu('/admin');
          return;
        case 'knowledgeBase':
          setMobileMenuOpen(false);
          window.open('https://symonbaikov.github.io/lumio/', '_blank', 'noopener,noreferrer');
          return;
        case 'logout':
          setMobileMenuOpen(false);
          logout();
          toast.success(userMenu.logoutSuccess.value);
          return;
        default:
      }
    },
    [logout, navigateFromUserMenu, openLanguageMenu, userMenu.logoutSuccess.value],
  );

  if (
    !user ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/shared') ||
    pathname.startsWith('/invite')
  ) {
    return null;
  }

  const renderUserActionsMenu = (mobile = false) => (
    <Dropdown placement={mobile ? 'bottom-start' : 'bottom-end'}>
      <DropdownTrigger>
        <Button
          radius="full"
          size="md"
          className="min-w-[100px] h-[40px] px-5 !bg-white !text-[#0a66c2] font-semibold text-[15px] hover:scale-105 active:scale-95 transition-transform"
          data-tour-id={mobile ? undefined : 'user-menu-trigger'}
        >
          <span className="inline-flex items-center gap-2.5 tracking-wide">
            <FiberSmartRecordIcon sx={{ fontSize: 18, color: '#0a66c2' }} />
            {((userMenu as any).moreActions?.value as string) || 'Menu'}
          </span>
        </Button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label="User menu actions"
        className="w-[320px]"
        disabledKeys={['profile-info']}
        itemClasses={{
          base: 'gap-3 px-3 py-2.5 data-[hover=true]:bg-muted data-[focus=true]:bg-muted',
          title: 'text-base',
        }}
        onAction={handleUserMenuAction}
      >
        <DropdownSection showDivider>
          <DropdownItem
            key="profile-info"
            textValue={`${user.name} ${user.email}`}
            className="h-auto cursor-default rounded-xl px-3 py-3 opacity-100"
          >
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-muted text-muted-foreground flex items-center justify-center">
                {normalizedAvatarUrl && !avatarError ? (
                  <img
                    src={normalizedAvatarUrl}
                    alt={user.name || 'User avatar'}
                    className="h-full w-full object-cover"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <User size={20} />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-base font-semibold text-foreground truncate">{user.name}</div>
                <div className="text-sm font-normal text-muted-foreground truncate">
                  {user.email}
                </div>
              </div>
            </div>
          </DropdownItem>
        </DropdownSection>

        <DropdownSection showDivider>
          <DropdownItem
            key="settings"
            startContent={<Settings size={18} className="text-muted-foreground" />}
          >
            {userMenu.settings}
          </DropdownItem>
          <DropdownItem
            key="integrations"
            startContent={<Plug size={18} className="text-muted-foreground" />}
          >
            {userMenu.integrations}
          </DropdownItem>
          <DropdownItem
            key="trash"
            startContent={<Trash2 size={18} className="text-muted-foreground" />}
          >
            {trashLabel}
          </DropdownItem>
          <DropdownItem
            key="language"
            startContent={<LanguageIcon sx={{ fontSize: 18 }} className="text-muted-foreground" />}
            endContent={<span className="text-sm text-muted-foreground">{languageLabel}</span>}
          >
            {userMenu.language}
          </DropdownItem>

          {isAdmin || canAccessWorkspaceActivity(currentWorkspace?.memberRole) ? (
            <DropdownItem
              key="admin"
              startContent={
                <ElectricBoltIcon sx={{ fontSize: 18 }} className="text-muted-foreground" />
              }
            >
              {userMenu.admin}
            </DropdownItem>
          ) : null}
          <DropdownItem
            key="knowledgeBase"
            startContent={<SchoolIcon sx={{ fontSize: 18 }} className="text-muted-foreground" />}
          >
            {(userMenu as any).knowledgeBase}
          </DropdownItem>
        </DropdownSection>

        <DropdownSection>
          <DropdownItem
            key="logout"
            color="danger"
            startContent={<LogOut size={18} />}
            className="text-danger data-[hover=true]:bg-danger/10 data-[hover=true]:text-danger data-[focus=true]:bg-danger/10 data-[focus=true]:text-danger"
          >
            {userMenu.logout}
          </DropdownItem>
        </DropdownSection>
      </DropdownMenu>
    </Dropdown>
  );

  return (
    <header className="border-b border-white/10 bg-[#1a2130] shadow-sm transition-all duration-300">
      <div className="container-shared px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14">
          <div className="flex items-center">
            <Link href="/" className="shrink-0 flex items-center gap-3" data-tour-id="brand">
              <div className="flex items-center justify-center w-8 h-8 bg-[#0a66c2] rounded-[10px] border-[2px] border-white shrink-0">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  role="img"
                  aria-labelledby="lumioLogo"
                >
                  <title id="lumioLogo">Lumio Logo</title>
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <span
                className={`text-white text-[19px] tracking-[0.2em] font-extrabold ${nunito.className}`}
              >
                LUMIO
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:ml-6 md:flex md:space-x-1" data-tour-id="primary-nav">
              {visibleNavItems.map(item => {
                const isActive = isNavItemActive(item.path);
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`
                        group inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors duration-200
                        ${
                          isActive
                            ? 'bg-white/10 text-white'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }
                      `}
                  >
                    <span className="opacity-70 group-hover:opacity-100 transition-opacity">
                      {item.icon}
                    </span>
                    <span className="hidden lg:block">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-4">
              <>
                <NotificationDropdown />
                <TourMenu
                  trigger={
                    <button
                      className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                      title="Help"
                    >
                      <QuestionMarkIcon sx={{ fontSize: 20 }} />
                    </button>
                  }
                />
              </>

              {/* User Menu */}
              <div className="relative ml-3">{renderUserActionsMenu()}</div>
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center md:hidden">
              <button
                onClick={() => setMobileMenuOpen(prev => !prev)}
                className="inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-white hover:bg-white/10 focus:outline-none"
                data-tour-id="mobile-menu-toggle"
                aria-label="Open menu"
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Drawer (slides from right) */}
      <div className="md:hidden">
        {mobileMenuMounted ? (
          <div className={`fixed inset-0 z-[70] ${mobileMenuVisible ? '' : 'pointer-events-none'}`}>
            <div
              className={`absolute inset-0 bg-black/30 transition-opacity duration-200 ${
                mobileMenuVisible ? 'opacity-100' : 'opacity-0'
              }`}
              role="button"
              tabIndex={0}
              aria-label="Close menu"
              onClick={() => setMobileMenuOpen(false)}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setMobileMenuOpen(false);
                }
              }}
            />

            <dialog
              className={`fixed inset-y-0 right-0 left-auto w-[88vw] max-w-sm border-l border-border bg-card text-card-foreground shadow-2xl transform-gpu will-change-transform transition-transform duration-300 ease-out ${
                mobileMenuVisible ? 'translate-x-0' : 'translate-x-full'
              }`}
              style={{
                padding: 0,
                margin: 0,
                left: 'auto',
              }}
              aria-modal="true"
              open
              onCancel={event => {
                event.preventDefault();
                setMobileMenuOpen(false);
              }}
            >
              <div className="flex items-center justify-between border-b border-border bg-card px-4 py-4">
                <div className="min-w-0">{renderUserActionsMenu(true)}</div>
                <div className="flex items-center gap-2">
                  <NotificationDropdown
                    triggerClassName="h-9 w-9 text-muted-foreground hover:bg-muted hover:text-foreground"
                    iconSize={22}
                  />
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Close menu"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="h-[calc(100vh-64px)] overflow-y-auto bg-card px-2 py-2">
                <div className="pt-1 pb-2">
                  {visibleNavItems.map(item => {
                    const isActive = isNavItemActive(item.path);

                    return (
                      <Link
                        key={item.path}
                        href={item.path}
                        className={`flex items-center gap-3 rounded-xl px-3 py-3 text-base font-medium transition-colors ${
                          isActive ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'
                        }`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <span className={isActive ? 'text-primary' : 'text-muted-foreground'}>
                          {item.icon}
                        </span>
                        <span className="flex-1">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>

                <div className="my-2 h-px bg-border" />

                <div className="bg-card px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Theme
                </div>

                {(
                  [
                    {
                      key: 'light' as const,
                      label: 'Light',
                      icon: <Sun size={18} />,
                    },
                    {
                      key: 'dark' as const,
                      label: 'Dark',
                      icon: <Moon size={18} />,
                    },
                    {
                      key: 'system' as const,
                      label: 'System',
                      icon: <Laptop size={18} />,
                    },
                  ] as const
                ).map(opt => {
                  const active = (selectedTheme || 'system') === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      className={`w-full flex items-center gap-3 rounded-xl px-3 py-3 text-base font-medium transition-colors ${
                        active ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'
                      }`}
                      onClick={() => setTheme(opt.key)}
                    >
                      <span className={active ? 'text-primary' : 'text-muted-foreground'}>
                        {opt.icon}
                      </span>
                      <span className="flex-1 text-left">{opt.label}</span>
                      {active && <Check size={18} />}
                    </button>
                  );
                })}

                <div className="my-2 h-px bg-border" />

                <TourMenu
                  trigger={
                    <button
                      type="button"
                      className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-base font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      <PlayCircle size={18} className="text-muted-foreground" />
                      <span className="flex-1 text-left">
                        {((nav as any)?.tours?.value as string) ?? 'Туры'}
                      </span>
                    </button>
                  }
                />
              </div>
            </dialog>
          </div>
        ) : null}
      </div>

      {portalReady && (
        <DrawerShell
          isOpen={languageModalOpen}
          onClose={() => {
            setLanguageModalOpen(false);
            setLanguageSearch('');
          }}
          title={
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setLanguageModalOpen(false);
                  setLanguageSearch('');
                }}
                className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close language drawer"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span>{languageModal.title}</span>
            </div>
          }
          position="right"
          width="lg"
          showCloseButton={false}
          className="max-w-full border-l-0 bg-[#fbfaf8] sm:max-w-lg"
        >
          <div className="flex h-full flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto pb-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={languageSearch}
                  onChange={event => setLanguageSearch(event.target.value)}
                  placeholder="Search"
                  className="w-full rounded-2xl border border-primary bg-white py-3 pl-11 pr-4 text-base text-gray-900 outline-none"
                />
              </div>

              <div className="space-y-2">
                {filteredLanguages.length > 0 ? (
                  filteredLanguages.map(lang => {
                    const selected = normalizedLocale === lang.code;
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => handleLanguageSelect(lang.code)}
                        className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition-colors ${
                          selected
                            ? 'bg-[#ebe8e2] text-foreground'
                            : 'text-foreground hover:bg-[#f1efea]'
                        }`}
                      >
                        <span className="font-medium">{lang.label}</span>
                        {selected ? <Check className="h-5 w-5 text-primary" /> : null}
                      </button>
                    );
                  })
                ) : (
                  <p className="rounded-xl bg-white px-4 py-3 text-sm text-gray-500">
                    No languages found
                  </p>
                )}
              </div>
            </div>
          </div>
        </DrawerShell>
      )}
    </header>
  );
}
