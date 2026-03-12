import { Logger } from '@nestjs/common';

const logger = new Logger('DevDefaults');

export const DEV_DEFAULTS = {
  JWT_SECRET: 'finflow-dev-jwt-secret-do-not-use-in-production-abc123',
  JWT_REFRESH_SECRET: 'finflow-dev-jwt-refresh-secret-do-not-use-in-production-xyz789',
  ADMIN_EMAIL: 'admin@example.com',
  ADMIN_PASSWORD: 'admin123',
  ADMIN_NAME: 'Administrator',
} as const;

let warned = false;

export function devDefault(envValue: string | undefined, key: keyof typeof DEV_DEFAULTS): string {
  if (envValue) {
    return envValue;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `Missing required environment variable: ${key}. Dev defaults are disabled in production.`,
    );
  }

  if (!warned) {
    logger.warn(
      'Using built-in dev secrets for JWT. Do NOT use in production. Set JWT_SECRET and JWT_REFRESH_SECRET env vars to suppress this warning.',
    );
    warned = true;
  }

  return DEV_DEFAULTS[key];
}
