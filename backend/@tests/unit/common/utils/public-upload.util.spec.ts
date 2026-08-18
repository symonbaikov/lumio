import {
  isAllowedCustomIconMime,
  sanitizePublicUploadFilename,
} from '@/common/utils/public-upload.util';

describe('public-upload.util', () => {
  it.each([
    ['image/png', '.png'],
    ['image/jpeg', '.jpg'],
    ['image/webp', '.webp'],
    ['image/gif', '.gif'],
  ])('creates a random public filename from MIME type %s', (mimetype, expectedExt) => {
    const fileName = sanitizePublicUploadFilename({
      mimetype,
      originalname: '../evil<script>.svg',
    });

    expect(fileName).toMatch(new RegExp(`^[0-9a-f-]+\\${expectedExt}$`));
    expect(fileName).not.toContain('evil');
    expect(fileName).not.toContain('/');
    expect(fileName).not.toContain('\\');
  });

  it.each(['image/svg+xml', 'text/html', 'application/octet-stream'])(
    'rejects unsafe custom icon MIME type %s',
    mimetype => {
      expect(isAllowedCustomIconMime(mimetype)).toBe(false);
    },
  );
});
