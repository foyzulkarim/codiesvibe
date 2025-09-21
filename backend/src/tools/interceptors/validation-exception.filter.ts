import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ValidationError } from 'class-validator';

/**
 * Interface for structured validation error response
 */
export interface ValidationErrorResponse {
  statusCode: number;
  error: string;
  message: string | string[];
  timestamp: string;
  path: string;
  details?: FieldValidationError[];
}

/**
 * Interface for individual field validation errors
 */
export interface FieldValidationError {
  field: string;
  value: any;
  constraints: Record<string, string>;
  children?: FieldValidationError[];
}

/**
 * Exception filter for handling validation errors with enhanced formatting
 */
@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();
    const status = exception.getStatus();

    const exceptionResponse = exception.getResponse() as any;

    // Check if this is a validation error (has validation error structure)
    if (this.isValidationError(exceptionResponse)) {
      const validationErrors = this.extractValidationErrors(exceptionResponse);

      const errorResponse: ValidationErrorResponse = {
        statusCode: status,
        error: 'Validation Failed',
        message: this.generateUserFriendlyMessage(validationErrors),
        timestamp: new Date().toISOString(),
        path: request.url,
        details: this.formatValidationErrors(validationErrors),
      };

      response.status(status).json(errorResponse);
    } else {
      // Handle other BadRequestExceptions normally
      const errorResponse = {
        statusCode: status,
        error: 'Bad Request',
        message: exceptionResponse.message || 'Bad Request',
        timestamp: new Date().toISOString(),
        path: request.url,
      };

      response.status(status).json(errorResponse);
    }
  }

  private isValidationError(exceptionResponse: any): boolean {
    return (
      exceptionResponse &&
      Array.isArray(exceptionResponse.message) &&
      exceptionResponse.message.length > 0 &&
      typeof exceptionResponse.message[0] === 'object' &&
      'constraints' in exceptionResponse.message[0]
    );
  }

  private extractValidationErrors(exceptionResponse: any): ValidationError[] {
    return exceptionResponse.message || [];
  }

  private generateUserFriendlyMessage(
    validationErrors: ValidationError[],
  ): string[] {
    const messages: string[] = [];

    for (const error of validationErrors) {
      if (error.constraints) {
        const fieldName = this.formatFieldName(error.property);
        const constraintMessages = Object.values(error.constraints);

        for (const constraint of constraintMessages) {
          messages.push(this.humanizeConstraintMessage(fieldName, constraint));
        }
      }

      // Handle nested validation errors
      if (error.children && error.children.length > 0) {
        messages.push(
          ...this.processNestedErrors(error.property, error.children),
        );
      }
    }

    return messages.length > 0 ? messages : ['Validation failed'];
  }

  private processNestedErrors(
    parentField: string,
    children: ValidationError[],
  ): string[] {
    const messages: string[] = [];

    for (const child of children) {
      const fullFieldName = `${parentField}.${child.property}`;

      if (child.constraints) {
        const constraintMessages = Object.values(child.constraints);
        for (const constraint of constraintMessages) {
          messages.push(
            this.humanizeConstraintMessage(fullFieldName, constraint),
          );
        }
      }

      if (child.children && child.children.length > 0) {
        messages.push(
          ...this.processNestedErrors(fullFieldName, child.children),
        );
      }
    }

    return messages;
  }

  private formatValidationErrors(
    validationErrors: ValidationError[],
  ): FieldValidationError[] {
    return validationErrors.map((error) => this.formatSingleError(error));
  }

  private formatSingleError(error: ValidationError): FieldValidationError {
    const fieldError: FieldValidationError = {
      field: error.property,
      value: error.value,
      constraints: error.constraints || {},
    };

    if (error.children && error.children.length > 0) {
      fieldError.children = error.children.map((child) =>
        this.formatSingleError(child),
      );
    }

    return fieldError;
  }

  private formatFieldName(property: string): string {
    // Convert camelCase to readable format
    return property
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }

  private humanizeConstraintMessage(
    fieldName: string,
    constraint: string,
  ): string {
    // Replace generic constraint messages with more user-friendly ones
    const humanizedConstraints: Record<string, string> = {
      isNotEmpty: `${fieldName} cannot be empty`,
      isString: `${fieldName} must be a text value`,
      isNumber: `${fieldName} must be a number`,
      isArray: `${fieldName} must be a list`,
      isUrl: `${fieldName} must be a valid URL`,
      isObject: `${fieldName} must be a valid object`,
      'length must be longer than or equal to': `${fieldName} is too short`,
      'length must be shorter than or equal to': `${fieldName} is too long`,
      'must be a positive number': `${fieldName} must be a positive number`,
      'must not be less than': `${fieldName} is below the minimum allowed value`,
      'must not be greater than': `${fieldName} exceeds the maximum allowed value`,
      arrayNotEmpty: `${fieldName} must contain at least one item`,
      isValidSearchKeywords: `${fieldName} must be valid search keywords (max 256 characters each)`,
      isFeaturesObject: `${fieldName} must contain only true/false values`,
      isTagsStructure: `${fieldName} must have valid primary and secondary tag categories`,
      isUpdateTagsStructure: `${fieldName} must have valid tag categories for update`,
    };

    // Try to find a humanized version
    for (const [key, humanized] of Object.entries(humanizedConstraints)) {
      if (constraint.includes(key)) {
        return humanized;
      }
    }

    // If no specific humanization found, return the original constraint with field name
    return `${fieldName}: ${constraint}`;
  }
}

/**
 * Global exception filter for handling various types of errors
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception.getStatus && typeof exception.getStatus === 'function') {
      status = exception.getStatus();
    }

    if (exception.getResponse && typeof exception.getResponse === 'function') {
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (exceptionResponse && typeof exceptionResponse === 'object') {
        message = exceptionResponse.message || message;
        error = exceptionResponse.error || error;
      }
    }

    const errorResponse = {
      statusCode: status,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Log the error for debugging (in development)
    if (process.env.NODE_ENV !== 'production') {
      console.error('Exception caught by GlobalExceptionFilter:', {
        exception: exception.message,
        stack: exception.stack,
        request: {
          method: request.method,
          url: request.url,
          body: request.body,
        },
      });
    }

    response.status(status).json(errorResponse);
  }
}

/**
 * Utility class for creating consistent error responses
 */
export class ErrorResponseUtils {
  static createValidationError(
    message: string,
    details?: any,
  ): ValidationErrorResponse {
    return {
      statusCode: HttpStatus.BAD_REQUEST,
      error: 'Validation Failed',
      message,
      timestamp: new Date().toISOString(),
      path: '', // Will be set by the filter
      details,
    };
  }

  static createNotFoundError(resource: string, id?: string): any {
    return {
      statusCode: HttpStatus.NOT_FOUND,
      error: 'Not Found',
      message: id
        ? `${resource} with ID '${id}' not found`
        : `${resource} not found`,
      timestamp: new Date().toISOString(),
      path: '', // Will be set by the filter
    };
  }

  static createUnauthorizedError(message: string = 'Unauthorized access'): any {
    return {
      statusCode: HttpStatus.UNAUTHORIZED,
      error: 'Unauthorized',
      message,
      timestamp: new Date().toISOString(),
      path: '', // Will be set by the filter
    };
  }

  static createForbiddenError(message: string = 'Access forbidden'): any {
    return {
      statusCode: HttpStatus.FORBIDDEN,
      error: 'Forbidden',
      message,
      timestamp: new Date().toISOString(),
      path: '', // Will be set by the filter
    };
  }
}
