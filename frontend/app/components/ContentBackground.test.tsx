// @vitest-environment jsdom
import { fireEvent, render } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ContentBackground from './ContentBackground';

const mocks = vi.hoisted(() => ({
  user: null as Record<string, unknown> | null,
}));

vi.mock('@/app/hooks/useAuth', () => ({
  useAuth: () => ({ user: mocks.user }),
}));

vi.mock('@/app/lib/avatar-url', () => ({
  resolveApiBaseForAssets: () => 'https://api.example.com/api/v1',
}));

vi.mock('next/image', () => ({
  default: ({
    fill: _fill,
    quality: _quality,
    unoptimized,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    quality?: number;
    unoptimized?: boolean;
  }) => <img {...props} alt={props.alt} data-unoptimized={String(Boolean(unoptimized))} />,
}));

const PRESET = '/workspace-backgrounds/lightscape-LtnPejWDSAY-unsplash.jpg';
const UPLOAD = '/api/v1/users/backgrounds/0b7c1c0e-5d0c-4b8e-9d5f-2a1e3c4d5e6f.jpg';

describe('ContentBackground', () => {
  beforeEach(() => {
    mocks.user = null;
    delete document.documentElement.dataset.contentBg;
  });

  it('renders nothing and keeps the surfaces opaque without a photo', () => {
    mocks.user = { id: 'user-1', contentBackground: null };

    const { container } = render(<ContentBackground />);

    expect(container.innerHTML).toBe('');
    expect(document.documentElement.dataset.contentBg).toBeUndefined();
  });

  it('shows a bundled photo through the image optimizer, dimmed to the saved level', () => {
    mocks.user = { id: 'user-1', contentBackground: PRESET, contentBackgroundDim: 60 };

    const { container } = render(<ContentBackground />);

    expect(document.documentElement.dataset.contentBg).toBe('true');
    const image = container.querySelector('img');
    expect(image?.getAttribute('src')).toBe(PRESET);
    expect(image?.dataset.unoptimized).toBe('false');
    expect(container.querySelector<HTMLElement>('.lumio-content-bg__dim')?.style.opacity).toBe(
      '0.6',
    );
  });

  it('loads an uploaded image straight from the API', () => {
    mocks.user = { id: 'user-1', contentBackground: UPLOAD };

    const { container } = render(<ContentBackground />);

    const image = container.querySelector('img');
    expect(image?.getAttribute('src')).toBe(
      'https://api.example.com/api/v1/users/backgrounds/0b7c1c0e-5d0c-4b8e-9d5f-2a1e3c4d5e6f.jpg',
    );
    expect(image?.dataset.unoptimized).toBe('true');
  });

  it('falls back to the default dim level', () => {
    mocks.user = { id: 'user-1', contentBackground: PRESET };

    const { container } = render(<ContentBackground />);

    expect(container.querySelector<HTMLElement>('.lumio-content-bg__dim')?.style.opacity).toBe(
      '0.35',
    );
  });

  it('fades the photo in once it has loaded', () => {
    mocks.user = { id: 'user-1', contentBackground: PRESET };

    const { container } = render(<ContentBackground />);
    const image = container.querySelector('img') as HTMLImageElement;
    expect(image.dataset.loaded).toBe('false');

    fireEvent.load(image);

    expect(image.dataset.loaded).toBe('true');
  });

  it('turns the glass off again when the photo is removed', () => {
    mocks.user = { id: 'user-1', contentBackground: PRESET };
    const { container, rerender } = render(<ContentBackground />);

    mocks.user = { id: 'user-1', contentBackground: null };
    rerender(<ContentBackground />);

    expect(container.innerHTML).toBe('');
    expect(document.documentElement.dataset.contentBg).toBeUndefined();
  });
});
