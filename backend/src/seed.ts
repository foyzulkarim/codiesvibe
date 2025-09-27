import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { EnhancedSeedService } from './database/seeding/enhanced-seed.service';

/**
 * Standalone database seeding script
 * Uses the existing EnhancedSeedService to maintain all migration logic
 */
async function runSeeding() {
  console.log('🌱 Starting database seeding...');

  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  try {
    const seedService = app.get(EnhancedSeedService);
    await seedService.seedTools();

    console.log('✅ Database seeding completed successfully');
    await app.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    await app.close();
    process.exit(1);
  }
}

// Execute seeding when script is run directly
runSeeding().catch((error) => {
  console.error('❌ Failed to start seeding process:', error);
  process.exit(1);
});