import type { Meta, StoryObj } from '@storybook/react';
import {
  BarChart3,
  Database,
  FileText,
  FolderOpen,
  Layers,
  LogOut,
  Menu,
  Moon,
  Settings,
  Sun,
  User,
  X,
} from 'lucide-react';
import { useState } from 'react';

/**
 * NavigationContent - Pure presentational component for navigation
 * For Storybook testing without intlayer/next-themes dependencies
 */
interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  active?: boolean;
}

interface NavigationContentProps {
  navItems: NavItem[];
  user?: { name: string; email: string } | null;
  theme?: 'light' | 'dark';
  onThemeToggle?: () => void;
  onLogout?: () => void;
  onNavClick?: (href: string) => void;
  isMobileMenuOpen?: boolean;
  onMobileMenuToggle?: () => void;
}

function NavigationContent({
  navItems,
  user,
  theme = 'light',
  onThemeToggle,
  onLogout,
  onNavClick,
  isMobileMenuOpen = false,
  onMobileMenuToggle,
}: NavigationContentProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-linear-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">FF</span>
              </div>
              <span className="text-lg font-bold text-gray-900">Lumio</span>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map(item => (
                <button
                  key={item.href}
                  onClick={() => onNavClick?.(item.href)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    item.active
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={onThemeToggle}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              title={theme === 'light' ? 'Тёмная тема' : 'Светлая тема'}
            >
              {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </button>

            {/* User menu */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-linear-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-gray-700">
                    {user.name}
                  </span>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                    <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      <User className="h-4 w-4" />
                      Профиль
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      <Settings className="h-4 w-4" />
                      Настройки
                    </button>
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          onLogout?.();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="h-4 w-4" />
                        Выйти
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                Войти
              </button>
            )}

            {/* Mobile menu button */}
            <button
              onClick={onMobileMenuToggle}
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <nav className="px-4 py-3 space-y-1">
            {navItems.map(item => (
              <button
                key={item.href}
                onClick={() => {
                  onNavClick?.(item.href);
                  onMobileMenuToggle?.();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  item.active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}

// Story meta
const meta: Meta<typeof NavigationContent> = {
  title: 'Components/Navigation',
  component: NavigationContent,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

// Mock data
const mockNavItems: NavItem[] = [
  {
    label: 'Выписки',
    href: '/statements',
    icon: <FileText className="h-4 w-4" />,
    active: true,
  },
  {
    label: 'Хранилище',
    href: '/storage',
    icon: <FolderOpen className="h-4 w-4" />,
  },
  { label: 'Таблицы', href: '/tables', icon: <Layers className="h-4 w-4" /> },
  {
    label: 'Отчёты',
    href: '/reports',
    icon: <BarChart3 className="h-4 w-4" />,
  },
];

const mockUser = {
  name: 'Иван Петров',
  email: 'ivan@example.com',
};

// Desktop logged in
export const Desktop: Story = {
  args: {
    navItems: mockNavItems,
    user: mockUser,
    theme: 'light',
    onThemeToggle: () => alert('Theme toggled'),
    onLogout: () => alert('Logout clicked'),
    onNavClick: (href: string) => alert(`Navigate to: ${href}`),
  },
};

// Desktop logged out
export const LoggedOut: Story = {
  args: {
    navItems: mockNavItems,
    user: null,
    theme: 'light',
    onNavClick: (href: string) => alert(`Navigate to: ${href}`),
  },
};

// Dark theme
export const DarkTheme: Story = {
  args: {
    navItems: mockNavItems,
    user: mockUser,
    theme: 'dark',
    onThemeToggle: () => alert('Theme toggled'),
  },
  decorators: [
    Story => (
      <div className="bg-gray-900 min-h-screen">
        <Story />
      </div>
    ),
  ],
};

// Mobile viewport
export const Mobile: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile',
    },
  },
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <NavigationContent
        navItems={mockNavItems}
        user={mockUser}
        theme="light"
        isMobileMenuOpen={isOpen}
        onMobileMenuToggle={() => setIsOpen(!isOpen)}
        onNavClick={(href: string) => alert(`Navigate to: ${href}`)}
        onLogout={() => alert('Logout')}
      />
    );
  },
};

// Mobile menu open
export const MobileMenuOpen: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile',
    },
  },
  args: {
    navItems: mockNavItems,
    user: mockUser,
    theme: 'light',
    isMobileMenuOpen: true,
    onMobileMenuToggle: () => {},
    onNavClick: (href: string) => alert(`Navigate to: ${href}`),
  },
};
