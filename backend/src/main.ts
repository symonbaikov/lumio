import * as fs from 'fs';
import * as path from 'path';
import './common/utils/node-crypto-polyfill';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AppLogger } from './common/observability/app-logger.service';
import { requestContextMiddleware } from './common/observability/request-context.middleware';
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
  }

  const uploadsDir = resolveUploadsDir();
  // Ensure reports directory exists
  const reportsDir = path.join(uploadsDir, 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const app = await NestFactory.create(AppModule, {
    logger: new AppLogger(),
  });

  // Serve static files from public folder (frontend assets)
  const publicPath = path.join(__dirname, 'public');
  if (fs.existsSync(publicPath)) {
    (app as any).useStaticAssets(publicPath);
  }
  (app as any).useStaticAssets(uploadsDir, { prefix: '/uploads' });

  // Request context & correlation IDs
  (app as any).use(requestContextMiddleware);

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
