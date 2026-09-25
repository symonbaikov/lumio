// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@/app/contexts/AuthContext';

const mocks = vi.hoisted(() => ({
  pathname: '/dashboard',
  post: vi.fn(),
  setUser: vi.fn(),
  user: null as User | null,
}));

vi.mock('next/navigation', () => ({ usePathname: () => mocks.pathname }));
vi.mock('@/app/hooks/useAuth', () => ({
  useAuth: () => ({ user: mocks.user, loading: false, setUser: mocks.setUser }),
}));
vi.mock('@/app/lib/api', () => ({ default: { post: mocks.post } }));
// The real dialog is lazy-loaded and has its own tests; a stand-in shows whether it is open.
vi.mock('next/dynamic', () => ({
  default: () =>
    function DialogStandIn(props: { open: boolean; onClose: () => void }) {
      return props.open ? (
        <button type="button" onClick={props.onClose}>
          close tutorial
        </button>
      ) : null;
    },
}));

const newAccount: User = {
  id: 'user-1',
  email: 'mia@example.com',
  name: 'Mia Hoffmann',
  role: 'user',
  onboardingCompletedAt: '2026-09-25T10:00:00.000Z',
  welcomeTutorialSeenAt: null,
};

// The store keeps "opened by itself already" for the page's lifetime, so each test
// loads fresh copies of the host and the store.
async function renderHost() {
  const [{ WelcomeTutorialHost }, store] = await Promise.all([
    import('./WelcomeTutorialHost'),
    import('./welcome-tutorial-store'),
  ]);
  render(<WelcomeTutorialHost />);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000);
  });
  return store;
}

describe('WelcomeTutorialHost', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    mocks.pathname = '/dashboard';
    mocks.user = newAccount;
    mocks.post.mockReset().mockResolvedValue({ data: { welcomeTutorialSeenAt: '2026-09-25T12:00:00.000Z' } });
    mocks.setUser.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens by itself for a new account on a sidebar page', async () => {
    await renderHost();
    expect(screen.getByRole('button', { name: 'close tutorial' })).toBeTruthy();
  });

  it('stays closed for an account that already closed it', async () => {
    mocks.user = { ...newAccount, welcomeTutorialSeenAt: '2026-09-20T09:00:00.000Z' };
    await renderHost();
    expect(screen.queryByRole('button', { name: 'close tutorial' })).toBeNull();
  });

  it('stays closed when the user object does not carry the field', async () => {
    const { welcomeTutorialSeenAt: _omitted, ...withoutField } = newAccount;
    mocks.user = withoutField;
    await renderHost();
    expect(screen.queryByRole('button', { name: 'close tutorial' })).toBeNull();
  });

  it('stays closed outside the sidebar pages', async () => {
    mocks.pathname = '/invite/token';
    await renderHost();
    expect(screen.queryByRole('button', { name: 'close tutorial' })).toBeNull();
  });

  it('records the close once and updates the user in place', async () => {
    await renderHost();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'close tutorial' }));
    });

    expect(screen.queryByRole('button', { name: 'close tutorial' })).toBeNull();
    expect(mocks.post).toHaveBeenCalledTimes(1);
    expect(mocks.post).toHaveBeenCalledWith('/users/me/welcome-tutorial');
    // Merged into the current user rather than replacing it.
    const update = mocks.setUser.mock.calls.at(-1)?.[0] as (user: User | null) => User | null;
    expect(update({ ...newAccount, avatarUrl: 'a.png' })).toMatchObject({
      avatarUrl: 'a.png',
      welcomeTutorialSeenAt: '2026-09-25T12:00:00.000Z',
    });
  });

  it('opens from the avatar menu for anyone, without recording it again', async () => {
    mocks.user = { ...newAccount, welcomeTutorialSeenAt: '2026-09-20T09:00:00.000Z' };
    const store = await renderHost();

    act(() => store.openWelcomeTutorial());
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'close tutorial' }));
    });

    expect(mocks.post).not.toHaveBeenCalled();
  });
});
