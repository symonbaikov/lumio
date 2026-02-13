import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const createI18nProxy = () =>
  new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (prop === 'value') return '';
        return createI18nProxy();
      },
    },
  );

vi.mock('@/app/hooks/useAuth', () => ({
  useAuth: () => ({
    loading: false,
    setUser: vi.fn(),
    user: {
      id: 'user-1',
      email: 'symon@example.com',
      name: 'Symon Baikov',
      avatarUrl: 'https://api.dicebear.com/7.x/identicon/svg?seed=test',
    },
  }),
}));

vi.mock('next-intlayer', () => ({
  useIntlayer: () => createI18nProxy(),
  useLocale: () => ({ locale: 'ru', setLocale: vi.fn() }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/components/mode-toggle', () => ({
  ModeToggle: () => null,
}));

describe('ProfileSettingsPage', () => {
  it('renders avatar image when avatarUrl exists', async () => {
    const { default: ProfileSettingsPage } = await import('./page');
    const html = renderToStaticMarkup(<ProfileSettingsPage />);

    expect(html).toContain('<img');
    expect(html).toContain('Edit photo');
    expect(html).toContain('https://api.dicebear.com/7.x/identicon/svg?seed=test');
  });
});
