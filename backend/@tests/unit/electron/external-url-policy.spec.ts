import { canOpenExternalUrl } from '../../../../electron/src/external-url-policy';

describe('Electron external URL policy', () => {
  it.each(['http://example.com', 'https://example.com/path'])(
    'allows browser-safe external URL %s',
    url => {
      expect(canOpenExternalUrl(url)).toBe(true);
    },
  );

  it.each(['file:///etc/passwd', 'ssh://example.com', 'mailto:user@example.com', 'javascript:1'])(
    'blocks non-browser external URL %s',
    url => {
      expect(canOpenExternalUrl(url)).toBe(false);
    },
  );
});
