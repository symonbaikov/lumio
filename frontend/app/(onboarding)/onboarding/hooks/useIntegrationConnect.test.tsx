// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useIntegrationConnect } from './useIntegrationConnect';

describe('useIntegrationConnect', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('selects integration connection views instead of opening settings pages', async () => {
    const openMock = vi.spyOn(window, 'open').mockImplementation(() => null);
    const refreshIntegrationStatuses = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useIntegrationConnect({
        refreshIntegrationStatuses,
      }),
    );

    await act(async () => {
      await result.current.handleConnectIntegration('s3Compatible');
      await result.current.handleConnectIntegration('webdav');
      await result.current.handleConnectIntegration('imap');
      await result.current.handleConnectIntegration('smtp');
      await result.current.handleConnectIntegration('aiCompatible');
      await result.current.handleConnectIntegration('telegram');
      await result.current.handleConnectIntegration('appUrl');
    });

    expect(openMock).not.toHaveBeenCalled();
    expect(result.current.activeIntegrationKey).toBe('appUrl');
    expect(refreshIntegrationStatuses).toHaveBeenCalledTimes(7);

    await act(async () => {
      await result.current.handleCloseIntegration();
    });

    expect(result.current.activeIntegrationKey).toBeNull();
    expect(refreshIntegrationStatuses).toHaveBeenCalledTimes(8);
  });
});
