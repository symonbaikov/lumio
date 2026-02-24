'use client';

import { NotificationDropdown } from '@/app/components/NotificationDropdown';
import { Button } from '@/app/components/ui/button';
import { DrawerShell } from '@/app/components/ui/drawer-shell';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { useIsMobile } from '@/app/hooks/useIsMobile';
import { useLockBodyScroll } from '@/app/hooks/useLockBodyScroll';
import { TourMenu } from '@/app/tours/components/TourMenu';
import { type DriveStep, driver } from 'driver.js';
import 'driver.js/dist/driver.css';

import { normalizeAvatarUrl } from '@/app/lib/avatar-url';
import ApartmentIcon from '@mui/icons-material/Apartment';
import EngineeringIcon from '@mui/icons-material/Engineering';
import LanguageIcon from '@mui/icons-material/Language';
import PinIcon from '@mui/icons-material/Pin';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import QuestionMarkIcon from '@mui/icons-material/QuestionMark';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import {
  Check,
  ChevronDown,
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
import { useIntlayer, useLocale } from 'next-intlayer';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';

const MOBILE_MENU_VISIBILITY_EVENT = 'lumio-mobile-menu-visibility';

type AppLanguage = 'ru' | 'en' | 'kk';

export default function Navigation() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const normalizedAvatarUrl = normalizeAvatarUrl(user?.avatarUrl);
  const { isAdmin, hasPermission } = usePermissions();
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
  const supportedBanksLabel =
    (userMenu as Record<string, any>).supportedBanks?.value ?? 'Supported banks';

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

  if (!user || pathname.startsWith('/onboarding')) {
    return null;
  }

  const navItems = [
    {
      label: nav.statements,
      path: '/statements',
      icon: <FileText size={20} />,
      permission: 'statement.view',
    },
    {
      label: nav.tables,
      path: '/custom-tables',
      icon: <Table size={20} />,
      permission: 'statement.view',
    },
    {
      label: nav.workspaces,
      path: '/workspaces',
      icon: <ApartmentIcon sx={{ fontSize: 20 }} />,
      permission: 'workspaces.view',
    },
    {
      label: nav.reports,
      path: '/reports',
      icon: <QueryStatsIcon sx={{ fontSize: 20 }} />,
      permission: 'statement.view',
    },
  ];

  const visibleNavItems = navItems.filter(item => hasPermission(item.permission));
  const isNavItemActive = (itemPath: string) =>
    pathname === itemPath || pathname.startsWith(`${itemPath}/`);

  return (
    <header className="border-b border-border bg-card shadow-sm transition-all duration-300">
      <div className="container-shared px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14">
          <div className="flex items-center">
            <Link href="/" className="shrink-0 flex items-center" data-tour-id="brand">
              <span className="text-primary ff-logo">LUMIO</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:ml-2 md:flex md:space-x-2" data-tour-id="primary-nav">
              {visibleNavItems.map(item => {
                const isActive = isNavItemActive(item.path);
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`
                        group inline-flex flex-col items-center justify-center px-3 pt-1 border-b-2 text-xs font-medium min-w-16 transition-colors duration-200
                        ${
                          isActive
                            ? 'border-primary text-primary font-semibold'
                            : 'border-transparent text-muted-foreground hover:text-primary hover:border-border'
                        }
                      `}
                  >
                    <span className="mb-1 group-hover:scale-110 transition-transform duration-200">
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
                      className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title="Help"
                    >
                      <QuestionMarkIcon sx={{ fontSize: 20 }} />
                    </button>
                  }
                />
              </>

              {/* User Menu */}
              <div className="relative ml-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="flex items-center gap-3 max-w-xs text-sm font-semibold text-foreground hover:opacity-80 transition-opacity focus:outline-none group"
                      data-tour-id="user-menu-trigger"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="truncate max-w-[150px] hidden sm:block">{user.name}</span>
                        <ChevronDown
                          size={16}
                          className="text-muted-foreground group-hover:text-foreground transition-colors"
                        />
                      </div>
                      <div className="h-8 w-8 rounded-full flex items-center justify-center overflow-hidden text-muted-foreground transition-all group-hover:bg-muted">
                        {normalizedAvatarUrl && !avatarError ? (
                          <img
                            src={normalizedAvatarUrl}
                            alt={user?.name || 'User avatar'}
                            className="h-full w-full object-cover"
                            onError={() => setAvatarError(true)}
                          />
                        ) : (
                          <User size={20} />
                        )}
                      </div>
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" className="w-[320px] p-2">
                    <DropdownMenuLabel className="px-3 py-3">
                      <div className="text-base font-semibold text-foreground truncate">
                        {user.name}
                      </div>
                      <div className="text-sm font-normal text-muted-foreground truncate">
                        {user.email}
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    <DropdownMenuItem asChild>
                      <Link href="/settings/profile">
                        <Settings size={18} className="text-muted-foreground" />
                        <span className="text-base">{userMenu.settings}</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/integrations">
                        <Plug size={18} className="text-muted-foreground" />
                        <span className="text-base">{userMenu.integrations}</span>
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem asChild>
                      <Link href="/supported-banks">
                        <EngineeringIcon sx={{ fontSize: 18 }} className="text-muted-foreground" />
                        <span className="text-base">{supportedBanksLabel}</span>
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem asChild>
                      <Link href="/statements/trash">
                        <Trash2 size={18} className="text-muted-foreground" />
                        <span className="text-base">{trashLabel}</span>
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onSelect={() => {
                        setLanguageSearch('');
                        setLanguageModalOpen(true);
                      }}
                    >
                      <LanguageIcon sx={{ fontSize: 18 }} className="text-muted-foreground" />
                      <span className="text-base">{userMenu.language}</span>
                      <DropdownMenuShortcut className="text-sm">
                        {languageLabel}
                      </DropdownMenuShortcut>
                    </DropdownMenuItem>

                    {isAdmin && (
                      <DropdownMenuItem asChild>
                        <Link href="/admin">
                          <PinIcon sx={{ fontSize: 18 }} className="text-muted-foreground" />
                          <span className="text-base">{userMenu.admin}</span>
                        </Link>
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={() => {
                        logout();
                        toast.success(userMenu.logoutSuccess.value);
                      }}
                      className="text-red-600 dark:text-red-400 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-900/40"
                    >
                      <LogOut size={18} />
                      <span className="text-base">{userMenu.logout}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center md:hidden">
              <button
                onClick={() => setMobileMenuOpen(prev => !prev)}
                className="inline-flex items-center justify-center p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted focus:outline-none"
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
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-foreground">{user.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                </div>
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
                  {userMenu.profile}
                </div>

                <Link
                  href="/settings/profile"
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-base font-medium text-foreground transition-colors hover:bg-muted"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Settings size={18} className="text-muted-foreground" />
                  <span className="flex-1">{userMenu.settings}</span>
                </Link>

                <Link
                  href="/integrations"
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-base font-medium text-foreground transition-colors hover:bg-muted"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Plug size={18} className="text-muted-foreground" />
                  <span className="flex-1">{userMenu.integrations}</span>
                </Link>

                <Link
                  href="/supported-banks"
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-base font-medium text-foreground transition-colors hover:bg-muted"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <EngineeringIcon sx={{ fontSize: 18 }} className="text-muted-foreground" />
                  <span className="flex-1">{supportedBanksLabel}</span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setLanguageSearch('');
                    setLanguageModalOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-base font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <LanguageIcon sx={{ fontSize: 18 }} className="text-muted-foreground" />
                  <span className="flex-1 text-left">{userMenu.language}</span>
                  <span className="text-sm text-muted-foreground">{languageLabel}</span>
                </button>

                {isAdmin && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-base font-medium text-foreground transition-colors hover:bg-muted"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <PinIcon sx={{ fontSize: 18 }} className="text-muted-foreground" />
                    <span className="flex-1">{userMenu.admin}</span>
                  </Link>
                )}

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

                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                    toast.success(userMenu.logoutSuccess.value);
                  }}
                  className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-base font-medium text-red-600 dark:text-red-400 hover:bg-muted transition-colors"
                >
                  <LogOut size={18} />
                  <span className="flex-1 text-left">{userMenu.logout}</span>
                </button>
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
