// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiPatch = vi.hoisted(() => vi.fn());
const apiGet = vi.hoisted(() => vi.fn());
const apiPost = vi.hoisted(() => vi.fn());
const routerPush = vi.hoisted(() => vi.fn());
const setUser = vi.hoisted(() => vi.fn());
const authUser = vi.hoisted(() => ({
  id: 'user-1',
  email: 'symon@example.com',
  name: 'Symon Baikov',
  timeZone: '',
  lastLogin: '2026-01-01T00:00:00.000Z',
  avatarUrl: 'https://api.dicebear.com/7.x/identicon/svg?seed=test',
}));
const i18nContent = vi.hoisted(() => {
  const createI18nProxy = (path: string[] = []) =>
    new Proxy(
      {},
      {
        get: (_target, prop) => {
          if (prop === 'value') return path.join('.');
          return createI18nProxy([...path, String(prop)]);
        },
      },
    );

  return createI18nProxy();
});

vi.mock('@/app/lib/api', () => ({
  default: {
    patch: apiPatch,
    get: apiGet,
    post: apiPost,
  },
}));

vi.mock('@/app/hooks/useAuth', () => ({
  useAuth: () => ({
    loading: false,
    setUser,
    user: authUser,
  }),
}));

vi.mock('next-intlayer', () => ({
  useIntlayer: () => i18nContent,
  useLocale: () => ({ locale: 'ru', setLocale: vi.fn() }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPush }),
}));

vi.mock('@/components/mode-toggle', () => ({
  ModeToggle: () => null,
}));

const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

describe('ProfileSettingsPage', () => {
  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    window.history.replaceState(null, '', '#profile');
    apiPatch.mockReset();
    apiGet.mockReset();
    apiPost.mockReset();
    routerPush.mockReset();
    setUser.mockReset();
    vi.restoreAllMocks();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('disables profile save button when there are no changes and shows unsaved state after edits', async () => {
    const { default: ProfileSettingsPage } = await import('./page');
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(<ProfileSettingsPage />);
    });

    await act(async () => {
      await flushPromises();
    });

    const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submitButton).toBeTruthy();
    expect(submitButton.disabled).toBe(true);

    const nameInput = container.querySelector('#profile-name') as HTMLInputElement;
    await act(async () => {
      const setValue = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set;
      setValue?.call(nameInput, 'Symon Baikov Updated');
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const updatedSubmitButton = container.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;
    expect(updatedSubmitButton.disabled).toBe(false);
    expect(container.textContent).toContain('profileCard.unsavedChanges');
  });

  it('asks confirmation before logging out all sessions', async () => {
    window.history.replaceState(null, '', '#sessions');
    apiGet.mockResolvedValue({ data: [] });
    (window.confirm as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);

    const { default: ProfileSettingsPage } = await import('./page');
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(<ProfileSettingsPage />);
    });

    await act(async () => {
      await flushPromises();
    });

    const logoutAllButton = Array.from(container.querySelectorAll('button')).find(button =>
      button.textContent?.includes('sessionsCard.logoutAllButton'),
    ) as HTMLButtonElement;

    expect(logoutAllButton).toBeTruthy();

    await act(async () => {
      logoutAllButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(window.confirm).toHaveBeenCalled();
    expect(apiPost).not.toHaveBeenCalledWith('/auth/logout-all');
  });

  it('asks confirmation before password update', async () => {
    window.history.replaceState(null, '', '#password');
    (window.confirm as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);

    const { default: ProfileSettingsPage } = await import('./page');
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(<ProfileSettingsPage />);
    });

    await act(async () => {
      await flushPromises();
    });

    const currentInput = container.querySelector('#password-current') as HTMLInputElement;
    const nextInput = container.querySelector('#password-next') as HTMLInputElement;
    const confirmInput = container.querySelector('#password-confirm') as HTMLInputElement;
    const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement;

    await act(async () => {
      currentInput.value = 'old-pass-123';
      currentInput.dispatchEvent(new Event('change', { bubbles: true }));
      nextInput.value = 'new-pass-123';
      nextInput.dispatchEvent(new Event('change', { bubbles: true }));
      confirmInput.value = 'new-pass-123';
      confirmInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await act(async () => {
      submitButton
        .closest('form')
        ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(window.confirm).toHaveBeenCalled();
    expect(apiPatch).not.toHaveBeenCalledWith('/users/me/password', expect.anything());
  });
});
