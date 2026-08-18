import { resolveStaticAssetMounts } from '@/common/utils/static-assets.util';

describe('static asset mounts', () => {
  it('does not expose the private uploads root as a static directory', () => {
    const mounts = resolveStaticAssetMounts('/srv/lumio/uploads', '/srv/lumio/dist/public');

    expect(mounts).toEqual([
      { root: '/srv/lumio/dist/public' },
      {
        root: '/srv/lumio/uploads/custom-field-icons',
        prefix: '/uploads/custom-field-icons',
      },
    ]);
    expect(mounts).not.toContainEqual({
      root: '/srv/lumio/uploads',
      prefix: '/uploads',
    });
  });
});
