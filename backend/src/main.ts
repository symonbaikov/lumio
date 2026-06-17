import * as fs from 'fs';
import * as path from 'path';
import './common/utils/node-crypto-polyfill';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AppLogger } from './common/observability/app-logger.service';
import { requestContextMiddleware } from './common/observability/request-context.middleware';
import { resolveStaticAssetMounts } from './common/utils/static-assets.util';
import { resolveUploadsDir } from './common/utils/uploads.util';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function bootstrap() {
  if (process.env.NODE_ENV === 'production') {
    requireEnv('DATABASE_URL');
    requireEnv('JWT_SECRET');
    requireEnv('JWT_REFRESH_SECRET');
    requireEnv('INTEGRATIONS_ENCRYPTION_KEY');
  }

  const uploadsDir = resolveUploadsDir();
  // Ensure reports directory exists
  const reportsDir = path.join(uploadsDir, 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: new AppLogger(),
  });

  // Serve only public frontend assets and explicitly public upload subtrees.
  const publicPath = path.join(__dirname, 'public');
  for (const mount of resolveStaticAssetMounts(uploadsDir, publicPath)) {
    if (fs.existsSync(mount.root)) {
      app.useStaticAssets(mount.root, mount.prefix ? { prefix: mount.prefix } : undefined);
    }
  }

  // Request context & correlation IDs
  app.use(requestContextMiddleware);

  // Global prefix for API versioning
  app.setGlobalPrefix('api/v1');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS configuration
  app.enableCors({
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
    ],
    credentials: true,
    exposedHeaders: ['x-request-id', 'x-trace-id'],
  });

  // Swagger / OpenAPI
  const config = new DocumentBuilder()
    .setTitle('Lumio API')
    .setDescription('REST API для загрузки выписок, классификации, отчётов и интеграций')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Вставьте access_token из /auth/login или /auth/refresh',
      },
      'bearer',
    )
    .addServer(process.env.API_BASE_URL || 'http://localhost:3001/api/v1')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  const logger = new Logger('Bootstrap');
  logger.log({ type: 'startup', url: `http://localhost:${port}` });
  logger.log({ type: 'startup', api: `http://localhost:${port}/api/v1` });
  logger.log({ type: 'startup', swagger: `http://localhost:${port}/api/docs` });
}

bootstrap();
