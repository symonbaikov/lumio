import { sanitizeAvatarFilename } from '@/common/utils/avatar-filename.util';

describe('sanitizeAvatarFilename', () => {
  it('replaces spaces and unsafe characters', () => {
    expect(sanitizeAvatarFilename('photo 2026-01-02 16.36.23.jpeg', 1770)).toBe(
      '1770-photo_2026-01-02_16.36.23.jpeg',
    );
  });

  it('falls back to extension-safe default name', () => {
    expect(sanitizeAvatarFilename('@@@.png', 7)).toBe('7-avatar.png');
  });

  it('keeps only basename and strips traversal', () => {
    expect(sanitizeAvatarFilename('../../my avatar.jpg', 9)).toBe('9-my_avatar.jpg');
  });
});
