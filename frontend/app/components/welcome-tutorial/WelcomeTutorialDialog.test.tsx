// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { IntlayerProviderContent } from 'react-intlayer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WelcomeTutorialDialog from './WelcomeTutorialDialog';
import { TUTORIAL_SCREENS } from './welcome-tutorial-screens';
import type { TutorialStep } from './welcome-tutorial-steps';

const mocks = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/app/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1', name: 'Mia Hoffmann', email: 'mia@example.com', role: 'user' } }),
}));

const STEPS: TutorialStep[] = [
  {
    id: 'dashboard',
    path: '/dashboard',
    label: 'Dashboard',
    title: 'Dashboard',
    icon: <span />,
    fragments: TUTORIAL_SCREENS.dashboard,
  },
  {
    id: 'crypto',
    path: '/crypto',
    label: 'Crypto',
    title: 'Crypto',
    icon: <span />,
    fragments: TUTORIAL_SCREENS.crypto,
  },
];

// Which pages are visible depends on permissions; that is tested with the step builder.
vi.mock('./useTutorialSteps', () => ({ useTutorialSteps: () => STEPS }));

function renderDialog(onClose: () => void): void {
  render(
    <IntlayerProviderContent locale="en" setLocale={() => undefined}>
      <WelcomeTutorialDialog open onClose={onClose} />
    </IntlayerProviderContent>,
  );
}

const heading = (): HTMLElement => screen.getByRole('heading', { level: 2 });
const press = (key: string): boolean => fireEvent.keyDown(screen.getByRole('dialog'), { key });
const click = (name: string): boolean => fireEvent.click(screen.getByRole('button', { name }));

describe('WelcomeTutorialDialog', () => {
  beforeEach(() => {
    mocks.push.mockReset();
  });

  it('greets the user by first name and walks from the intro through the steps to the outro', () => {
    renderDialog(vi.fn());
    expect(heading().textContent).toBe('Welcome to Lumio, Mia');

    click('Start the tour');
    expect(heading().textContent).toBe('Your month at a glance');
    expect(screen.getByText('1 of 2')).toBeTruthy();

    press('ArrowRight');
    expect(heading().textContent).toBe('Wallets next to your bank accounts');

    click('Next');
    expect(heading().textContent).toBe('You’re all set');

    click('Back');
    expect(heading().textContent).toBe('Wallets next to your bank accounts');

    press('ArrowLeft');
    expect(heading().textContent).toBe('Your month at a glance');
  });

  it('jumps to a step from the stepper', () => {
    renderDialog(vi.fn());
    click('Start the tour');
    click('Crypto');
    expect(heading().textContent).toBe('Wallets next to your bank accounts');
  });

  it('moves focus to the heading of each new screen', () => {
    renderDialog(vi.fn());
    click('Start the tour');
    expect(document.activeElement).toBe(heading());

    press('ArrowRight');
    click('Next');
    expect(document.activeElement).toBe(heading());
  });

  it('closes on Escape and on Hide, but not on a click beside the dialog', () => {
    const onClose = vi.fn();
    renderDialog(onClose);

    const container = document.querySelector('.MuiDialog-container') as HTMLElement;
    fireEvent.mouseDown(container);
    fireEvent.click(container);
    expect(onClose).not.toHaveBeenCalled();

    press('Escape');
    expect(onClose).toHaveBeenCalledTimes(1);

    click('Start the tour');
    click('Hide tutorial');
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('closes and opens the upload from the outro', () => {
    const onClose = vi.fn();
    renderDialog(onClose);
    click('Start the tour');
    press('ArrowRight');
    click('Next');

    click('Upload a statement');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mocks.push).toHaveBeenCalledWith('/statements?upload=1');
  });
});
