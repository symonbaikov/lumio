// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StatementsSidePanel from './StatementsSidePanel';

const pushMock = vi.hoisted(() => vi.fn());
const capturedConfigRef = vi.hoisted(() => ({
  current: null as null | {
    footer?: {
      content?: React.ReactElement<{
        onScan: () => void;
        onLocalUpload: () => void;
      }>;
    };
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock('next-intlayer', () => ({
  useIntlayer: () => ({}),
}));

vi.mock('@/app/hooks/useAuth', () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock('@/app/components/side-panel', () => ({
  useSidePanelConfig: ({ config }: { config: unknown }) => {
    capturedConfigRef.current = config as {
      footer?: {
        content?: React.ReactElement<{
          onScan: () => void;
          onLocalUpload: () => void;
        }>;
      };
    };
  },
}));

vi.mock('@/app/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('StatementsSidePanel FAB navigation', () => {
  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    pushMock.mockReset();
    capturedConfigRef.current = null;
  });

  it('redirects to submit with scan drawer query from non-submit pages', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(<StatementsSidePanel activeItem="top-spenders" />);
    });

    const onScan = capturedConfigRef.current?.footer?.content?.props.onScan;
    expect(onScan).toBeTypeOf('function');

    await act(async () => {
      onScan?.();
    });

    expect(pushMock).toHaveBeenCalledWith('/statements/submit?openExpenseDrawer=scan');

    await act(async () => {
      root.unmount();
    });
  });
});
