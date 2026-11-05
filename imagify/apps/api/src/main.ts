import { config } from 'dotenv';
// Load .env before any module initialization: apps/api first, then the imagify root
config({ path: ['.env.local', '.env', '../../.env'] });

import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

const REQUIRED_ENV = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];

async function bootstrap() {
  const missing = REQUIRED_ENV.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}. See imagify/.env.example.`);
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule);

  configureApp(app);

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Imagify API')
    .setDescription('Collaborative AI comic story platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`🚀 API running on http://localhost:${port}`);
}

bootstrap();
