import winston from 'winston';
import * as Loggly from 'winston-loggly-bulk';
import { v4 as uuidv4 } from 'uuid';

export interface SearchLogContext {
  correlationId?: string;
  service: string;
  ip?: string;
  userAgent?: string;
  method?: string;
  path?: string;
  query?: string;
  queryLength?: number;
  limit?: number;
  resultCount?: number;
  executionTimeMs?: number;
  timestamp?: string;
  [key: string]: any;
}

export interface SearchLogMetadata {
  function?: string;
  module?: string;
  phase?: string;
  version?: string;
  [key: string]: any;
}

/**
 * Enhanced Winston logger configuration for Search API
 * Integrates with Loggly for centralized logging
 */
export class SearchLoggerService {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf((info: any) => {
          const logEntry = {
            timestamp: info.timestamp,
            level: info.level,
            service: 'search-api',
            correlationId: info.correlationId,
            message: info.message,
            context: {
              ip: info.ip,
              userAgent: info.userAgent,
              method: info.method,
              path: info.path,
              query: info.query,
              queryLength: info.queryLength,
              limit: info.limit,
              resultCount: info.resultCount,
              executionTimeMs: info.executionTimeMs,
              ...(info.context || {})
            },
            error: info.error ? {
              stack: (info.error as Error).stack,
              code: (info.error as any).code,
              message: (info.error as Error).message
            } : undefined,
            metadata: {
              function: info.function,
              module: info.module,
              phase: info.phase,
              version: process.env.npm_package_version || '1.0.0',
              ...(info.metadata || {})
            }
          };

          // Clean up undefined values
          return JSON.stringify(logEntry, (key, value) => 
            value === undefined ? null : value
          );
        })
      ),
      defaultMeta: {
        service: 'search-api'
      },
      transports: [
        // Console transport for development
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp(),
            winston.format.printf((info: any) => {
              const { timestamp, level, message, ...rest } = info;
              const correlationId = info.correlationId ? `[${info.correlationId}] ` : '';
              const meta = Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : '';
              return `${timestamp} ${correlationId}${level}: ${message}${meta}`;
            })
          )
        }),

        // File transport for security events
        new winston.transports.File({
          filename: 'logs/security.log',
          level: 'warn',
          format: winston.format.json()
        }),

        // File transport for all logs
        new winston.transports.File({
          filename: 'logs/search-api.log',
          format: winston.format.json()
        })
      ]
    });

    // Add Loggly transport if enabled and token is provided
    if (process.env.LOGGLY_ENABLED === 'true' && process.env.LOGGLY_TOKEN) {
      this.logger.add(new Loggly.Loggly({
        token: process.env.LOGGLY_TOKEN,
        subdomain: process.env.LOGGLY_SUBDOMAIN || 'self18',
        tags: ['search-api', 'express', 'security'],
        json: true,
        timestamp: true
      }));
    }
  }

  info(message: string, context?: SearchLogContext, metadata?: SearchLogMetadata): void {
    this.logger.info(message, { ...context, ...metadata });
  }

  warn(message: string, context?: SearchLogContext, metadata?: SearchLogMetadata): void {
    this.logger.warn(message, { ...context, ...metadata });
  }

  error(message: string, error?: Error, context?: SearchLogContext, metadata?: SearchLogMetadata): void {
    this.logger.error(message, { 
      error: error ? {
        stack: error.stack,
        code: (error as any).code,
        message: error.message
      } : undefined,
      ...context, 
      ...metadata 
    });
  }

  debug(message: string, context?: SearchLogContext, metadata?: SearchLogMetadata): void {
    this.logger.debug(message, { ...context, ...metadata });
  }

  // Security-specific logging methods
  logSecurityEvent(event: string, context: SearchLogContext, level: 'warn' | 'error' = 'warn'): void {
    if (level === 'error') {
      this.error(`Security Event: ${event}`, undefined, context, {
        function: 'logSecurityEvent',
        module: 'Security',
        eventType: 'security'
      });
    } else {
      this.warn(`Security Event: ${event}`, context, {
        function: 'logSecurityEvent',
        module: 'Security',
        eventType: 'security'
      });
    }
  }

  logSearchRequest(correlationId: string, context: SearchLogContext): void {
    this.info('Search request received', { correlationId, ...context }, {
      function: 'logSearchRequest',
      module: 'SearchAPI',
      phase: 'request_received'
    });
  }

  logSearchSuccess(correlationId: string, context: SearchLogContext): void {
    this.info('Search request completed successfully', { correlationId, ...context }, {
      function: 'logSearchSuccess',
      module: 'SearchAPI',
      phase: 'request_completed'
    });
  }

  logSearchError(correlationId: string, error: Error, context: SearchLogContext): void {
    this.error('Search request failed', error, { correlationId, ...context }, {
      function: 'logSearchError',
      module: 'SearchAPI',
      phase: 'request_failed'
    });
  }

  // Get the underlying Winston logger for advanced usage
  getLogger(): winston.Logger {
    return this.logger;
  }
}

// Export singleton instance
export const searchLogger = new SearchLoggerService();
