import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { LoggerService } from './logger.service';
import { v4 as uuidv4 } from 'uuid';

export interface CustomRequest extends Request {
  correlationId?: string;
  startTime?: number;
}

@Injectable()
export class CorrelationInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<CustomRequest>();
    const response = context.switchToHttp().getResponse<Response>();

    // Generate correlation ID if not present
    const correlationId = request.correlationId || uuidv4();
    request.correlationId = correlationId;
    request.startTime = Date.now();

    // Set correlation ID in response header for client
    response.setHeader('X-Correlation-ID', correlationId);

    // Extract request context
    const requestContext = {
      correlationId,
      method: request.method,
      url: request.url,
      ip: request.ip || request.connection.remoteAddress,
      userAgent: request.get('User-Agent'),
      userId: (request as any).user?.userId,
    };

    // Log incoming request
    this.logger.info(`Incoming request`, requestContext, {
      function: 'CorrelationInterceptor.intercept',
      module: 'Common',
    });

    return next.handle().pipe(
      tap({
        next: (data) => {
          // Log successful response
          const responseTime = Date.now() - (request.startTime || Date.now());
          this.logger.info(
            `Request completed successfully`,
            {
              ...requestContext,
              statusCode: response.statusCode,
              responseTime,
            },
            {
              function: 'CorrelationInterceptor.intercept',
              module: 'Common',
            },
          );
        },
        error: (error) => {
          // Log error response
          const responseTime = Date.now() - (request.startTime || Date.now());
          this.logger.error(
            `Request failed with error`,
            error,
            {
              ...requestContext,
              statusCode: response.statusCode || 500,
              responseTime,
            },
            {
              function: 'CorrelationInterceptor.intercept',
              module: 'Common',
            },
          );
        },
      }),
    );
  }
}
