import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import Loggly from 'winston-loggly-bulk';
import { v4 as uuidv4 } from 'uuid';

export interface LogContext {
  correlationId?: string;
  userId?: string;
  requestId?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  responseTime?: number;
  ip?: string;
  userAgent?: string;
  [key: string]: any;
}

export interface LogMetadata {
  function?: string;
  module?: string;
  version?: string;
  [key: string]: any;
}

@Injectable()
export class LoggerService {
  private readonly logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf((info) => {
          const logEntry = {
            timestamp: info.timestamp,
            level: info.level,
            service: 'backend',
            correlationId: info.correlationId,
            message: info.message,
            context: {
              userId: info.userId,
              requestId: info.requestId,
              method: info.method,
              url: info.url,
              statusCode: info.statusCode,
              responseTime: info.responseTime,
              ip: info.ip,
              userAgent: info.userAgent,
              ...(info.context || {}),
            },
            error: info.error
              ? {
                  stack: (info.error as Error).stack,
                  code: (info.error as any).code,
                  details: (info.error as any).details,
                }
              : undefined,
            metadata: {
              function: info.function,
              module: info.module,
              version: process.env.npm_package_version || '1.0.0',
              ...(info.metadata || {}),
            },
          };

          // Clean up undefined values
          return JSON.stringify(logEntry, (key, value) =>
            value === undefined ? null : value,
          );
        }),
      ),
      defaultMeta: {
        service: 'backend',
      },
      transports: [
        // Console transport for development
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
            winston.format.printf((info) => {
              const correlationId = typeof info.correlationId === 'string' && info.correlationId
                ? `[${info.correlationId}] `
                : '';
              const level = typeof info.level === 'string' ? info.level : 'info';
              const message = typeof info.message === 'string' ? info.message : String(info.message);
              return `${correlationId}${level}: ${message}`;
            }),
          ),
        }),

        // File transport for local logging
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          format: winston.format.json(),
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
          format: winston.format.json(),
        }),
      ],
    });

    // Add Loggly transport if enabled and token is provided
    if (process.env.LOGGLY_ENABLED === 'true' && process.env.LOGGLY_TOKEN) {
      const logglyTransport = new Loggly.Loggly({
        token: process.env.LOGGLY_TOKEN,
        subdomain: process.env.LOGGLY_SUBDOMAIN || '',
        tags: ['backend', 'nestjs'],
        json: true,
        timestamp: true,
      });

      this.logger.add(logglyTransport);
    }
  }

  info(message: string, context?: LogContext, metadata?: LogMetadata): void {
    this.logger.info(message, { ...context, ...metadata });
  }

  warn(message: string, context?: LogContext, metadata?: LogMetadata): void {
    this.logger.warn(message, { ...context, ...metadata });
  }

  error(
    message: string,
    error?: Error,
    context?: LogContext,
    metadata?: LogMetadata,
  ): void {
    this.logger.error(message, {
      error: error
        ? {
            stack: error.stack,
            code: (error as any).code,
            message: error.message,
            details: (error as any).details,
          }
        : undefined,
      ...context,
      ...metadata,
    });
  }

  debug(message: string, context?: LogContext, metadata?: LogMetadata): void {
    this.logger.debug(message, { ...context, ...metadata });
  }

  verbose(message: string, context?: LogContext, metadata?: LogMetadata): void {
    this.logger.verbose(message, { ...context, ...metadata });
  }

  // Method to log with correlation ID
  logWithContext(
    message: string,
    correlationId: string,
    level: 'info' | 'warn' | 'error' | 'debug' | 'verbose' = 'info',
    context?: LogContext,
    metadata?: LogMetadata,
  ): void {
    if (level === 'error') {
      this.error(
        message,
        undefined,
        { correlationId, ...(context || {}) },
        metadata,
      );
    } else {
      this[level](message, { correlationId, ...(context || {}) }, metadata);
    }
  }

  // Get the underlying Winston logger for advanced usage
  getLogger(): winston.Logger {
    return this.logger;
  }
}
