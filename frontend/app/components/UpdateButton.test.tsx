import { describe, expect, it } from 'vitest';
import { isUpdateAvailable } from './UpdateButton';

describe('isUpdateAvailable', () => {
  it('is true when the release was published after the build', () => {
    expect(isUpdateAvailable('2026-01-01T00:00:00Z', '2026-01-02T00:00:00Z')).toBe(true);
  });

  it('is false when the build already contains the release', () => {
    expect(isUpdateAvailable('2026-01-02T00:00:00Z', '2026-01-01T00:00:00Z')).toBe(false);
    expect(isUpdateAvailable('2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')).toBe(false);
  });

  it('is false when either timestamp is missing or unparseable', () => {
    expect(isUpdateAvailable(undefined, '2026-01-02T00:00:00Z')).toBe(false);
    expect(isUpdateAvailable('2026-01-01T00:00:00Z', undefined)).toBe(false);
    expect(isUpdateAvailable('not-a-date', '2026-01-02T00:00:00Z')).toBe(false);
  });
});
