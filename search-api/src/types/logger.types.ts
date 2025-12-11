/**
 * Logger type definitions for Search API
 * Provides type-safe logging with structured metadata
 */

/**
 * Winston log levels supported by the logger
 */
export type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly';

/**
 * Valid metadata value types for logging
 * Uses `unknown` to allow any JSON-serializable value for maximum flexibility
 * in logging arbitrary data structures (e.g., ITool[], ZodIssue[], etc.)
 */
export type LogMetadataValue = unknown;

/**
 * Generic metadata object with string keys and typed values
 */
export interface LogMetadata {
  [key: string]: LogMetadataValue;
}

/**
 * Structured log entry format for JSON logging
 */
export interface StructuredLogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  metadata?: LogMetadata;
  correlationId?: string;
  userId?: string;
  error?: {
    message: string;
    stack?: string;
    code?: string | number;
  };
}
