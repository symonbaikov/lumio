import * as path from 'node:path';

export type StaticAssetMount = {
  root: string;
  prefix?: string;
};

export function resolveStaticAssetMounts(
  uploadsDir: string,
  publicPath: string,
): StaticAssetMount[] {
  return [
    { root: publicPath },
    {
      root: path.join(uploadsDir, 'custom-field-icons'),
      prefix: '/uploads/custom-field-icons',
    },
  ];
}
