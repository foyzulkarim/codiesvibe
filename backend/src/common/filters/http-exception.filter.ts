import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    // Log the error for monitoring
    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${exception.message}`,
      exception.stack,
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
}
