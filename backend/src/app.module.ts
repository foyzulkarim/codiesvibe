import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { DatabaseModule } from './database/database.module';
import { ToolsModule } from './tools/tools.module';
import { HealthModule } from './health/health.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AppController } from './app.controller';
import configuration from './config/configuration';
import { SeedingModule } from './database/seeding/seeding.module';
import { IpGuard } from './common/guards/ip-guard.guard';
import { AuthModule } from './auth/auth.module';
import { SessionService } from './auth/session.service';
import { SessionGuard } from './common/guards/session.guard';
import { LoggerModule } from './common/logger/logger.module';
import { CorrelationInterceptor } from './common/logger/correlation.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
      cache: true,
      expandVariables: true,
      validationOptions: {
        allowUnknown: false,
        abortEarly: true,
      },
    }),
    ThrottlerModule.forRootAsync({
      useFactory: () => [
        {
          name: 'strict',
          ttl: 1000, // 1 second
          limit: 5, // 5 requests per second (reduced from 10)
        },
        {
          name: 'short',
          ttl: 10000, // 10 seconds
          limit: 20, // 20 requests per 10 seconds
        },
        {
          name: 'medium',
          ttl: 60000, // 1 minute
          limit: 50, // 50 requests per minute (reduced from 100)
        },
        {
          name: 'long',
          ttl: 3600000, // 1 hour
          limit: 500, // 500 requests per hour (reduced from 1000)
        },
      ],
    }),
    LoggerModule, // Global logger module
    DatabaseModule,
    ToolsModule,
    HealthModule,
    SeedingModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: IpGuard,
    },
    SessionService, // Provide SessionService for SessionGuard
    {
      provide: APP_GUARD,
      useClass: SessionGuard,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: CorrelationInterceptor,
    },
  ],
})
export class AppModule {}
