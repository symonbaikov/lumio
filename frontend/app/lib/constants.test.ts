import { describe, expect, it } from 'vitest';
import { MAX_AVATAR_SIZE_BYTES } from './constants';

describe('constants', () => {
  it('defines max avatar size in bytes', () => {
    expect(MAX_AVATAR_SIZE_BYTES).toBe(2 * 1024 * 1024);
  });
});
