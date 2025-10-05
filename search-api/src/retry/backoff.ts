/**
 * Retry Logic with Exponential Backoff
 * Intelligent retry mechanism with adaptive strategies
 */

export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number; // Base delay in milliseconds
  maxDelay: number; // Maximum delay in milliseconds
  backoffFactor: number; // Multiplier for exponential backoff
  jitter: boolean; // Add random jitter to prevent thundering herd
  retryableErrors?: string[]; // Error types that should be retried
  onRetry?: (attempt: number, error: Error, delay: number) => void;
  shouldRetry?: (error: Error, attempt: number) => boolean;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalTime: number;
  strategy: string;
  lastAttempt: Date;
}

export interface RetryMetrics {
  totalRetries: number;
  successfulRetries: number;
  failedRetries: number;
  averageAttempts: number;
  totalRetryTime: number;
  errorDistribution: Record<string, number>;
  strategyUsage: Record<string, number>;
}

export class RetryManager {
  private static defaultOptions: RetryOptions = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffFactor: 2,
    jitter: true,
    retryableErrors: [
      'network',
      'timeout',
      'connection',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'rate limit',
      'temporary'
    ]
  };

  private static metrics: RetryMetrics = {
    totalRetries: 0,
    successfulRetries: 0,
    failedRetries: 0,
    averageAttempts: 0,
    totalRetryTime: 0,
    errorDistribution: {},
    strategyUsage: {}
  };

  /**
   * Execute function with retry logic
   */
  static async executeWithRetry<T>(
    fn: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): Promise<RetryResult<T>> {
    const opts = { ...this.defaultOptions, ...options };
    const startTime = Date.now();
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
      try {
        const result = await fn();

        // Success - update metrics and return
        const totalTime = Date.now() - startTime;
        this.updateMetrics('success', attempt, totalTime, lastError?.message || '');

        return {
          success: true,
          data: result,
          attempts: attempt,
          totalTime,
          strategy: 'immediate',
          lastAttempt: new Date()
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        // Check if we should retry
        if (attempt === opts.maxAttempts || !this.shouldRetry(lastError, attempt, opts)) {
          const totalTime = Date.now() - startTime;
          this.updateMetrics('failed', attempt, totalTime, lastError.message);

          return {
            success: false,
            error: lastError,
            attempts: attempt,
            totalTime,
            strategy: 'exhausted',
            lastAttempt: new Date()
          };
        }

        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempt, opts);

        // Call retry callback if provided
        if (opts.onRetry) {
          opts.onRetry(attempt, lastError, delay);
        }

        // Wait before retrying
        await this.sleep(delay);
      }
    }

    // This should never be reached, but TypeScript requires it
    const totalTime = Date.now() - startTime;
    this.updateMetrics('failed', opts.maxAttempts, totalTime, lastError?.message || '');

    return {
      success: false,
      error: lastError || new Error('Unknown error'),
      attempts: opts.maxAttempts,
      totalTime,
      strategy: 'exhausted',
      lastAttempt: new Date()
    };
  }

  /**
   * Execute with adaptive retry strategy
   */
  static async executeWithAdaptiveRetry<T>(
    fn: () => Promise<T>,
    context: {
      component: string;
      operation: string;
      priority: 'low' | 'medium' | 'high';
    },
    options: Partial<RetryOptions> = {}
  ): Promise<RetryResult<T>> {
    // Adjust options based on context
    const adaptiveOptions = this.adaptOptions(context, options);

    return this.executeWithRetry(fn, adaptiveOptions);
  }

  /**
   * Execute multiple functions with retry and circuit breaker
   */
  static async executeWithCircuitBreaker<T>(
    fns: Array<() => Promise<T>>,
    options: Partial<RetryOptions> = {}
  ): Promise<RetryResult<T>> {
    const opts = { ...this.defaultOptions, ...options };

    for (let i = 0; i < fns.length; i++) {
      try {
        const result = await this.executeWithRetry(fns[i] || (() => Promise.reject(new Error('Function not available'))), {
          ...opts,
          maxAttempts: Math.max(1, opts.maxAttempts - i) // Reduce attempts for subsequent functions
        });

        if (result.success) {
          this.updateMetrics('circuit-breaker-success', result.attempts, result.totalTime, '');
          return {
            ...result,
            strategy: `circuit-breaker-${i + 1}`
          };
        }
      } catch (error) {
        // Continue to next function
      }
    }

    // All functions failed
    return {
      success: false,
      error: new Error('All circuit breaker functions failed'),
      attempts: fns.length * opts.maxAttempts,
      totalTime: 0,
      strategy: 'circuit-breaker-failed',
      lastAttempt: new Date()
    };
  }

  /**
   * Get retry metrics
   */
  static getMetrics(): RetryMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  static resetMetrics(): void {
    this.metrics = {
      totalRetries: 0,
      successfulRetries: 0,
      failedRetries: 0,
      averageAttempts: 0,
      totalRetryTime: 0,
      errorDistribution: {},
      strategyUsage: {}
    };
  }

  /**
   * Determine if an error should be retried
   */
  private static shouldRetry(error: Error, attempt: number, options: RetryOptions): boolean {
    // Check custom retry condition
    if (options.shouldRetry && !options.shouldRetry(error, attempt)) {
      return false;
    }

    // Check if error type is retryable
    const errorMessage = error.message.toLowerCase();
    const isRetryable = options.retryableErrors?.some(retryableError =>
      errorMessage.includes(retryableError.toLowerCase())
    ) ?? false; // Default to false if retryableErrors is undefined

    return isRetryable;
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private static calculateDelay(attempt: number, options: RetryOptions): number {
    // Exponential backoff: delay = baseDelay * (backoffFactor ^ (attempt - 1))
    let delay = options.baseDelay * Math.pow(options.backoffFactor, attempt - 1);

    // Apply maximum delay limit
    delay = Math.min(delay, options.maxDelay || 30000);

    // Add jitter if enabled (±25% of delay)
    if (options.jitter) {
      const jitterRange = delay * 0.25;
      delay += (Math.random() * 2 - 1) * jitterRange;
    }

    // Ensure minimum delay
    delay = Math.max(delay, 100);

    return Math.floor(delay);
  }

  /**
   * Adapt retry options based on context
   */
  private static adaptOptions(
    context: {
      component: string;
      operation: string;
      priority: 'low' | 'medium' | 'high';
    },
    options: Partial<RetryOptions>
  ): RetryOptions {
    const baseOptions = { ...this.defaultOptions, ...options };

    // Adjust based on priority
    switch (context.priority) {
      case 'high':
        return {
          ...baseOptions,
          maxAttempts: Math.max(baseOptions.maxAttempts, 5),
          baseDelay: Math.min(baseOptions.baseDelay, 500),
          jitter: false // More predictable for high priority
        };

      case 'low':
        return {
          ...baseOptions,
          maxAttempts: Math.min(baseOptions.maxAttempts, 2),
          baseDelay: Math.max(baseOptions.baseDelay, 2000),
          maxDelay: Math.min(baseOptions.maxDelay, 10000)
        };

      default: // medium
        return baseOptions;
    }
  }

  /**
   * Sleep for specified milliseconds
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update retry metrics
   */
  private static updateMetrics(
    result: 'success' | 'failed' | 'circuit-breaker-success',
    attempts: number,
    totalTime: number,
    errorMessage: string
  ): void {
    this.metrics.totalRetries++;

    if (result === 'success' || result === 'circuit-breaker-success') {
      this.metrics.successfulRetries++;
    } else {
      this.metrics.failedRetries++;
    }

    // Update average attempts
    const totalOperations = this.metrics.successfulRetries + this.metrics.failedRetries;
    this.metrics.averageAttempts =
      (this.metrics.averageAttempts * (totalOperations - 1) + attempts) / totalOperations;

    // Update total retry time
    this.metrics.totalRetryTime += totalTime;

    // Update error distribution
    const errorType = this.categorizeError(errorMessage);
    this.metrics.errorDistribution[errorType] = (this.metrics.errorDistribution[errorType] || 0) + 1;

    // Update strategy usage
    const strategy = result === 'circuit-breaker-success' ? 'circuit-breaker' : 'exponential-backoff';
    this.metrics.strategyUsage[strategy] = (this.metrics.strategyUsage[strategy] || 0) + 1;
  }

  /**
   * Categorize error type for metrics
   */
  private static categorizeError(errorMessage: string): string {
    const message = errorMessage.toLowerCase();

    if (message.includes('network') || message.includes('connection')) {
      return 'network';
    }

    if (message.includes('timeout') || message.includes('etimeout')) {
      return 'timeout';
    }

    if (message.includes('parse') || message.includes('json')) {
      return 'parse';
    }

    if (message.includes('validation')) {
      return 'validation';
    }

    if (message.includes('rate limit')) {
      return 'rate-limit';
    }

    if (message.includes('memory') || message.includes('heap')) {
      return 'memory';
    }

    return 'other';
  }
}

/**
 * Convenience function for common retry patterns
 */
export class RetryPatterns {
  /**
   * Retry for network operations
   */
  static async network<T>(fn: () => Promise<T>): Promise<RetryResult<T>> {
    return RetryManager.executeWithRetry(fn, {
      maxAttempts: 5,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffFactor: 2,
      jitter: true
    });
  }

  /**
   * Retry for parsing operations
   */
  static async parsing<T>(fn: () => Promise<T>): Promise<RetryResult<T>> {
    return RetryManager.executeWithRetry(fn, {
      maxAttempts: 3,
      baseDelay: 100,
      maxDelay: 1000,
      backoffFactor: 1.5,
      jitter: false
    });
  }

  /**
   * Retry for validation operations
   */
  static async validation<T>(fn: () => Promise<T>): Promise<RetryResult<T>> {
    return RetryManager.executeWithRetry(fn, {
      maxAttempts: 2,
      baseDelay: 50,
      maxDelay: 200,
      backoffFactor: 1.2,
      jitter: false
    });
  }

  /**
   * Retry for tool execution
   */
  static async toolExecution<T>(fn: () => Promise<T>): Promise<RetryResult<T>> {
    return RetryManager.executeWithRetry(fn, {
      maxAttempts: 3,
      baseDelay: 500,
      maxDelay: 5000,
      backoffFactor: 2,
      jitter: true,
      retryableErrors: ['tool execution', 'parameter', 'invalid']
    });
  }

  /**
   * Retry with circuit breaker pattern
   */
  static async withCircuitBreaker<T>(
    primaryFn: () => Promise<T>,
    fallbackFns: Array<() => Promise<T>>
  ): Promise<RetryResult<T>> {
    return RetryManager.executeWithCircuitBreaker([primaryFn, ...fallbackFns]);
  }
}

export default RetryManager;
