import { describe, expect, it } from 'vitest';

import { normalizeAvatarUrl } from '../avatar-url';

describe('normalizeAvatarUrl', () => {
  it('maps legacy uploads path to api avatars endpoint', () => {
    expect(normalizeAvatarUrl('/uploads/user-avatars/170-photo.jpg')).toMatch(
      /\/api\/v1\/users\/avatars\/170-photo\.jpg$/,
    );
  });

  it('maps absolute legacy uploads URL to api avatars endpoint', () => {
    expect(
      normalizeAvatarUrl('http://localhost:3000/uploads/user-avatars/170-photo.jpg'),
    ).toMatch(/\/api\/v1\/users\/avatars\/170-photo\.jpg$/);
  });

  it('keeps non-legacy URLs unchanged', () => {
    expect(normalizeAvatarUrl('https://cdn.example.com/avatar.jpg')).toBe(
      'https://cdn.example.com/avatar.jpg',
    );
  });
});
