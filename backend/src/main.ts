import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { EnhancedSeedService } from './database/seeding/enhanced-seed.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });
  const configService = app.get(ConfigService);

  // Enable CORS with support for subdomain architecture
  const corsOrigins =
    (process.env.CORS_ORIGIN && process.env.CORS_ORIGIN.split(',')) ||
    (process.env.NODE_ENV === 'production'
      ? ['http://localhost', 'http://api.localhost']
      : ['http://localhost:3000', 'http://localhost', 'http://api.localhost']);

  app.enableCors({
    origin: corsOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global validation pipe with enhanced error messages
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      errorHttpStatusCode: 400,
    }),
  );

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

  // Optionally run tools seeding on startup when SEED_TOOLS=true
  const shouldSeed =
    (process.env.SEED_TOOLS || configService.get<string>('SEED_TOOLS')) ===
    'true';
  const exitAfterSeed =
    (process.env.EXIT_AFTER_SEED ||
      configService.get<string>('EXIT_AFTER_SEED')) === 'true';
  if (shouldSeed) {
    const seedService = app.get(EnhancedSeedService);
    await seedService.seedTools();

    // If EXIT_AFTER_SEED=true, do not start HTTP server; exit cleanly
    if (exitAfterSeed) {
      console.log(
        '✅ Seeding finished. EXIT_AFTER_SEED=true => exiting without starting server.',
      );
      await app.close();
      process.exit(0);
      return;
    }
  }

  const port = configService.get<number>('port') || 4000;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 Swagger documentation: http://localhost:${port}/docs`);
  console.log(`🏥 Health check: http://localhost:${port}/health`);
  console.log(`🔧 API endpoints: http://localhost:${port}/api`);
}

bootstrap().catch((error) => {
  console.error('❌ Application failed to start:', error);
  process.exit(1);
});
