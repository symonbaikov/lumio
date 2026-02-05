import { ConfigService } from '@nestjs/config';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => {
  const nodeEnv = configService.get<string>('NODE_ENV') || 'development';
  const isProd = nodeEnv === 'production';
  const runMigrationsEnv = (configService.get<string>('RUN_MIGRATIONS') || '').toLowerCase();
  // Default to running migrations everywhere unless explicitly disabled.
  // This prevents production deployments from silently missing new tables/enums.
  const shouldRunMigrations = runMigrationsEnv !== 'false';
  const migrationsGlob = __filename.endsWith('.ts')
    ? 'src/migrations/*.ts'
    : 'dist/migrations/*.js';
  const databaseUrl =
    configService.get<string>('DATABASE_URL') ||
    'postgresql://finflow:finflow@localhost:5432/finflow';

  return {
    type: 'postgres',
    url: databaseUrl,
    autoLoadEntities: true,
    synchronize: false,
    logging: !isProd,
    migrations: [migrationsGlob],
    migrationsRun: shouldRunMigrations,
  };
};
