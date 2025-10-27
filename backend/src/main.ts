import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { LoggerService } from './common/logger/logger.service';
import helmet from 'helmet';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });
  const configService = app.get(ConfigService);
  const logger = app.get(LoggerService);

  // Security headers middleware
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      noSniff: true,
      frameguard: { action: 'deny' },
      xssFilter: true,
    }),
  );

  // Request size limits to prevent payload attacks
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // Enable CORS for specific domains
  app.enableCors({
    origin: [
      'https://codiesvibe.com',
      'https://www.codiesvibe.com',
      'http://localhost:3000', // For local development
      'http://localhost:5173', // For Vite dev server
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    maxAge: 86400, // Cache preflight for 24 hours
  });

  // Global validation pipe with enhanced error messages
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true, // Reverted back to secure default
      transformOptions: {
        enableImplicitConversion: true,
      },
      errorHttpStatusCode: 400,
    }),
  );

  // Trust proxy for Nginx reverse proxy (SIMPLIFIED FOR DEMO)
  (app as any).set('trust proxy', true);

  // Set global prefix for all routes
  app.setGlobalPrefix('api', {
    exclude: ['/health', '/docs'], // Keep health and docs at root level
  });

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('NestJS REST API Backend')
    .setDescription(
      'Secure REST API with GitHub OAuth authentication and Tool management',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  // Database seeding is now handled by a separate seed script (src/seed.ts)

  const port = configService.get<number>('port') || 4000;
  await app.listen(port);

  logger.info(
    '🚀 Application started successfully',
    {
      port,
      environment: process.env.NODE_ENV || 'development',
      swaggerUrl: `http://localhost:${port}/docs`,
      healthUrl: `http://localhost:${port}/health`,
      apiUrl: `http://localhost:${port}/api`,
    },
    {
      function: 'bootstrap',
      module: 'Main',
    },
  );
}

bootstrap().catch((error) => {
  // Fallback to console error for bootstrap failures
  console.error('❌ Application failed to start:', error);
  process.exit(1);
});
