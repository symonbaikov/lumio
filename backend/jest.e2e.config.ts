import type { Config } from 'jest';
import baseConfig from './jest.base.config';

const config: Config = {
  ...baseConfig,
  displayName: 'e2e',
  testMatch: ['<rootDir>/@tests/e2e/**/*.e2e-spec.ts'],
  maxWorkers: 1,
  testTimeout: 30000,
};

export default config;
