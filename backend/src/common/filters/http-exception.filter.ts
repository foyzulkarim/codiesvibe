import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Injectable,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerService } from '../logger/logger.service';
import { CustomRequest } from '../logger/correlation.interceptor';

@Injectable()
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<CustomRequest>();
    const status = exception.getStatus();
    const startTime = request.startTime || Date.now();
    const responseTime = Date.now() - startTime;

    // Extract detailed error context
    const errorContext = {
      correlationId: request.correlationId,
      method: request.method,
      url: request.url,
      statusCode: status,
      responseTime,
      ip: request.ip || request.connection.remoteAddress,
      userAgent: request.get('User-Agent'),
      userId: (request as any).user?.userId,
      requestHeaders: this.sanitizeHeaders(request.headers),
    };

    // Log the error with structured context
    this.logger.error(
      `HTTP Exception: ${request.method} ${request.url} - ${status}`,
      exception,
      errorContext,
      {
        function: 'HttpExceptionFilter.catch',
        module: 'Common',
        exceptionType: exception.constructor.name,
        isOperational: status < 500,
      },
    );

    // Sanitize error messages to prevent information disclosure
    let message = exception.message;
    if (status >= 500) {
      message = 'Internal server error';
    } else if (status === 403) {
      message = 'Access denied';
    } else if (status === 404) {
      message = 'Resource not found';
    }

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      // Only include stack trace in development
      ...(process.env.NODE_ENV === 'development' && { stack: exception.stack }),
    };

    response.status(status).json(errorResponse);
  }

  /**
   * Sanitize headers to remove sensitive information
   */
  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };

    // Remove sensitive headers
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-api-key',
      'x-auth-token',
    ];
    sensitiveHeaders.forEach((header) => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}
