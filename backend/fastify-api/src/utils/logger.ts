import pino from 'pino';

// Create logger instance with configuration
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname'
    }
  } : undefined,
  formatters: {
    level: (label) => {
      return { level: label };
    }
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    service: 'fastify-api',
    version: process.env.npm_package_version || '1.0.0'
  }
});

// Error logging utility
export const logError = (error: Error | unknown, context?: string) => {
  const errorInfo = {
    message: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
    context: context || 'Unknown context',
    timestamp: new Date().toISOString()
  };
  
  logger.error(errorInfo, 'Application error occurred');
  return errorInfo;
};

// Request logging utility
export const logRequest = (method: string, url: string, statusCode?: number, responseTime?: number) => {
  const requestInfo = {
    method,
    url,
    statusCode,
    responseTime,
    timestamp: new Date().toISOString()
  };
  
  logger.info(requestInfo, 'HTTP request processed');
  return requestInfo;
};

// Tool execution logging
export const logToolExecution = (toolName: string, success: boolean, duration?: number, error?: string) => {
  const toolInfo = {
    toolName,
    success,
    duration,
    error,
    timestamp: new Date().toISOString()
  };
  
  if (success) {
    logger.info(toolInfo, 'Tool executed successfully');
  } else {
    logger.error(toolInfo, 'Tool execution failed');
  }
  
  return toolInfo;
};

export default logger;