// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@/app/hooks/useAuth';
import { useAppearance } from './useAppearance';

const mocks = vi.hoisted(() => ({
  patch: vi.fn(),
  post: vi.fn(),
  setUser: vi.fn(),
}));

vi.mock('@/app/lib/api', () => ({
  default: { patch: mocks.patch, post: mocks.post },
}));

const messages = { successFallback: 'Saved', errorFallback: 'Failed' };

const user: User = { id: 'user-1', email: 'a@b.c', name: 'A', role: 'user' };

const PRESET_FILE = 'lightscape-LtnPejWDSAY-unsplash.jpg';
const UPLOAD = '/api/v1/users/backgrounds/0b7c1c0e.jpg';

describe('useAppearance content background', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('starts without a photo and with the default dim level', () => {
    const { result } = renderHook(() => useAppearance(user, mocks.setUser, messages));

    expect(result.current.contentBackground).toBeNull();
    expect(result.current.contentBackgroundDim).toBe(35);
  });

  it('saves a bundled photo as its public path', async () => {
    mocks.patch.mockResolvedValue({ data: { user: {} } });
    const { result } = renderHook(() => useAppearance(user, mocks.setUser, messages));

    await act(async () => {
      result.current.selectPresetBackground(PRESET_FILE);
    });

    const saved = `/workspace-backgrounds/${PRESET_FILE}`;
    expect(mocks.patch).toHaveBeenCalledWith('/users/me/preferences', { contentBackground: saved });
    expect(mocks.setUser).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-1', contentBackground: saved }),
    );
  });

  it('uploads an image and applies the stored path', async () => {
    mocks.post.mockResolvedValue({ data: { contentBackground: UPLOAD } });
    const { result } = renderHook(() => useAppearance(user, mocks.setUser, messages));
    const file = new File(['image'], 'beach.jpg', { type: 'image/jpeg' });

    await act(async () => {
      await result.current.uploadContentBackground(file);
    });

    const [url, body] = mocks.post.mock.calls[0];
    expect(url).toBe('/users/me/content-background');
    expect((body as FormData).get('background')).toBe(file);
    expect(mocks.setUser).toHaveBeenCalledWith(
      expect.objectContaining({ contentBackground: UPLOAD }),
    );
    expect(JSON.parse(localStorage.getItem('user') ?? '{}').contentBackground).toBe(UPLOAD);
  });

  it('lets the card report a failed upload', async () => {
    mocks.post.mockRejectedValue(new Error('Only JPEG, PNG, WebP and GIF images are allowed'));
    const { result } = renderHook(() => useAppearance(user, mocks.setUser, messages));

    await expect(
      result.current.uploadContentBackground(new File(['x'], 'doc.pdf')),
    ).rejects.toThrow('Only JPEG, PNG, WebP and GIF images are allowed');
    expect(mocks.setUser).not.toHaveBeenCalled();
  });

  it('removes the photo', async () => {
    mocks.patch.mockResolvedValue({ data: { user: {} } });
    const withPhoto = { ...user, contentBackground: UPLOAD };
    const { result } = renderHook(() => useAppearance(withPhoto, mocks.setUser, messages));

    await act(async () => {
      result.current.removeContentBackground();
    });

    expect(mocks.patch).toHaveBeenCalledWith('/users/me/preferences', { contentBackground: null });
    expect(mocks.setUser).toHaveBeenCalledWith(expect.objectContaining({ contentBackground: null }));
  });

  it('previews the dim level while dragging and saves it on release', async () => {
    mocks.patch.mockResolvedValue({ data: { user: {} } });
    const { result } = renderHook(() => useAppearance(user, mocks.setUser, messages));

    act(() => {
      result.current.previewContentBackgroundDim(50);
    });
    expect(mocks.patch).not.toHaveBeenCalled();
    expect(mocks.setUser).toHaveBeenLastCalledWith(
      expect.objectContaining({ contentBackgroundDim: 50 }),
    );

    await act(async () => {
      result.current.saveContentBackgroundDim(55);
    });
    expect(mocks.patch).toHaveBeenCalledWith('/users/me/preferences', { contentBackgroundDim: 55 });
  });
});
