import { INestApplication, ValidationPipe } from '@nestjs/common';

/**
 * Shared HTTP setup used by main.ts and the e2e tests.
 */
export function configureApp(app: INestApplication): void {
  // Global prefix
  app.setGlobalPrefix('api/v1');

  // CORS
  app.enableCors({
    origin: process.env.WEB_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
}
