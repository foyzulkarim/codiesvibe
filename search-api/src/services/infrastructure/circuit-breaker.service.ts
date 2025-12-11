/**
 * Circuit Breaker Service
 * Prevents cascading failures by failing fast when external services are unhealthy
 */

import CircuitBreaker from 'opossum';
import { searchLogger } from '../../config/logger.js';
import type { CircuitBreakerFunction } from '#types/circuit-breaker.types.js';

export interface CircuitBreakerConfig {
  timeout?: number; // Request timeout in ms (default: 3000)
  errorThresholdPercentage?: number; // Error percentage to trip circuit (default: 50)
  resetTimeout?: number; // Time before attempting to close circuit (default: 30000)
  rollingCountTimeout?: number; // Statistical rolling window duration (default: 10000)
  rollingCountBuckets?: number; // Number of buckets for rolling window (default: 10)
  volumeThreshold?: number; // Minimum requests before calculating error rate (default: 10)
  name?: string; // Circuit breaker name for logging
}

/**
 * Circuit breaker statistics interface
 */
export interface CircuitBreakerStats {
  name: string;
  state: 'open' | 'half-open' | 'closed';
  stats: {
    fires: number;
    successes: number;
    failures: number;
    fallbacks: number;
    semaphoreRejections: number;
    shortCircuits: number;
    timeouts: number;
  };
}

/**
 * Circuit Breaker Manager
 * Centrally manages circuit breakers for all external services
 */
export class CircuitBreakerManager {
  private breakers: Map<string, CircuitBreaker> = new Map();

  /**
   * Create a circuit breaker for a service
   */
  createBreaker<TArgs extends unknown[], TReturn>(
    name: string,
    func: CircuitBreakerFunction<TArgs, TReturn>,
    config: CircuitBreakerConfig = {}
  ): CircuitBreaker {
    const options = {
      timeout: config.timeout || 3000, // 3 seconds default timeout
      errorThresholdPercentage: config.errorThresholdPercentage || 50, // 50% error rate trips circuit
      resetTimeout: config.resetTimeout || 30000, // 30 seconds before retry
      rollingCountTimeout: config.rollingCountTimeout || 10000, // 10 second rolling window
      rollingCountBuckets: config.rollingCountBuckets || 10,
      volumeThreshold: config.volumeThreshold || 10, // Need 10 requests before calculating error rate
      name: name,
    };

    const breaker = new CircuitBreaker(func, options);

    // Event: Circuit opened (too many failures)
    breaker.on('open', () => {
      searchLogger.error('Circuit breaker opened', new Error(`Circuit breaker ${name} opened`), {
        service: 'search-api',
        circuitBreaker: name,
        state: 'open',
        timestamp: new Date().toISOString(),
      }, {
        function: 'CircuitBreakerManager',
        module: 'CircuitBreaker',
      });

      // Track circuit breaker state in metrics
      if (typeof (global as Record<string, unknown>).metricsService !== 'undefined') {
        const metricsService = (global as Record<string, unknown>).metricsService as { trackError: (type: string, severity: string) => void };
        metricsService.trackError('circuit_breaker_open', 'high');
      }
    });

    // Event: Circuit half-opened (testing if service recovered)
    breaker.on('halfOpen', () => {
      searchLogger.warn('Circuit breaker half-opened', {
        service: 'search-api',
        circuitBreaker: name,
        state: 'half-open',
        timestamp: new Date().toISOString(),
      }, {
        function: 'CircuitBreakerManager',
        module: 'CircuitBreaker',
      });
    });

    // Event: Circuit closed (service recovered)
    breaker.on('close', () => {
      searchLogger.info('Circuit breaker closed', {
        service: 'search-api',
        circuitBreaker: name,
        state: 'closed',
        timestamp: new Date().toISOString(),
      }, {
        function: 'CircuitBreakerManager',
        module: 'CircuitBreaker',
      });
    });

    // Event: Successful call
    breaker.on('success', (_result: unknown, latencyMs: number) => {
      searchLogger.debug('Circuit breaker call succeeded', {
        service: 'search-api',
        circuitBreaker: name,
        latency: `${latencyMs}ms`,
      }, {
        function: 'CircuitBreakerManager',
        module: 'CircuitBreaker',
      });
    });

    // Event: Failed call
    breaker.on('failure', (error: Error) => {
      searchLogger.warn('Circuit breaker call failed', {
        service: 'search-api',
        circuitBreaker: name,
        error: error.message,
      }, {
        function: 'CircuitBreakerManager',
        module: 'CircuitBreaker',
      });

      // Track individual failures
      if (typeof (global as Record<string, unknown>).metricsService !== 'undefined') {
        const metricsService = (global as Record<string, unknown>).metricsService as { trackError: (type: string, severity: string) => void };
        metricsService.trackError('circuit_breaker_failure', 'medium');
      }
    });

    // Event: Request rejected (circuit is open)
    breaker.on('reject', () => {
      searchLogger.warn('Circuit breaker rejected request', {
        service: 'search-api',
        circuitBreaker: name,
        state: breaker.opened ? 'open' : 'unknown',
      }, {
        function: 'CircuitBreakerManager',
        module: 'CircuitBreaker',
      });

      // Track rejections
      if (typeof (global as Record<string, unknown>).metricsService !== 'undefined') {
        const metricsService = (global as Record<string, unknown>).metricsService as { trackError: (type: string, severity: string) => void };
        metricsService.trackError('circuit_breaker_reject', 'medium');
      }
    });

    // Event: Timeout
    breaker.on('timeout', () => {
      searchLogger.warn('Circuit breaker timeout', {
        service: 'search-api',
        circuitBreaker: name,
        timeout: `${options.timeout}ms`,
      }, {
        function: 'CircuitBreakerManager',
        module: 'CircuitBreaker',
      });

      // Track timeouts
      if (typeof (global as Record<string, unknown>).metricsService !== 'undefined') {
        const metricsService = (global as Record<string, unknown>).metricsService as { trackError: (type: string, severity: string) => void };
        metricsService.trackError('circuit_breaker_timeout', 'medium');
      }
    });

    // Event: Fallback executed
    breaker.on('fallback', (_result: unknown) => {
      searchLogger.info('Circuit breaker fallback executed', {
        service: 'search-api',
        circuitBreaker: name,
      }, {
        function: 'CircuitBreakerManager',
        module: 'CircuitBreaker',
      });
    });

    // Store breaker
    this.breakers.set(name, breaker);

    searchLogger.info('✅ Circuit breaker created', {
      service: 'search-api',
      circuitBreaker: name,
      timeout: `${options.timeout}ms`,
      errorThreshold: `${options.errorThresholdPercentage}%`,
      resetTimeout: `${options.resetTimeout}ms`,
    });

    return breaker;
  }

  /**
   * Get a circuit breaker by name
   */
  getBreaker(name: string): CircuitBreaker | undefined {
    return this.breakers.get(name);
  }

  /**
   * Get circuit breaker statistics
   */
  getStats(name: string): CircuitBreakerStats | null {
    const breaker = this.breakers.get(name);
    if (!breaker) {
      return null;
    }

    return {
      name: name,
      state: breaker.opened ? 'open' : (breaker.halfOpen ? 'half-open' : 'closed'),
      stats: breaker.stats,
    };
  }

  /**
   * Get all circuit breaker statistics
   */
  getAllStats(): CircuitBreakerStats[] {
    const stats: CircuitBreakerStats[] = [];
    this.breakers.forEach((breaker, name) => {
      stats.push({
        name: name,
        state: breaker.opened ? 'open' : (breaker.halfOpen ? 'half-open' : 'closed'),
        stats: breaker.stats,
      });
    });
    return stats;
  }

  /**
   * Shutdown all circuit breakers
   */
  async shutdown(): Promise<void> {
    searchLogger.info('Shutting down circuit breakers', {
      service: 'search-api',
      count: this.breakers.size,
    });

    for (const [name, breaker] of this.breakers) {
      breaker.shutdown();
      searchLogger.debug('Circuit breaker shut down', {
        service: 'search-api',
        circuitBreaker: name,
      });
    }

    this.breakers.clear();
  }
}

// Export singleton instance
export const circuitBreakerManager = new CircuitBreakerManager();

/**
 * Predefined circuit breakers for common services
 */

// MongoDB circuit breaker
export const createMongoDBBreaker = <TArgs extends unknown[], TReturn>(
  func: CircuitBreakerFunction<TArgs, TReturn>,
  name: string = 'mongodb'
): CircuitBreaker => {
  return circuitBreakerManager.createBreaker(name, func, {
    timeout: 5000, // 5 seconds timeout
    errorThresholdPercentage: 50,
    resetTimeout: 30000, // 30 seconds
    volumeThreshold: 5,
  });
};

// Qdrant circuit breaker
export const createQdrantBreaker = <TArgs extends unknown[], TReturn>(
  func: CircuitBreakerFunction<TArgs, TReturn>,
  name: string = 'qdrant'
): CircuitBreaker => {
  return circuitBreakerManager.createBreaker(name, func, {
    timeout: 10000, // 10 seconds timeout (vector search can be slower)
    errorThresholdPercentage: 50,
    resetTimeout: 30000, // 30 seconds
    volumeThreshold: 5,
  });
};

// LLM service circuit breaker
export const createLLMBreaker = <TArgs extends unknown[], TReturn>(
  func: CircuitBreakerFunction<TArgs, TReturn>,
  name: string = 'llm'
): CircuitBreaker => {
  return circuitBreakerManager.createBreaker(name, func, {
    timeout: 30000, // 30 seconds timeout (LLM can be slow)
    errorThresholdPercentage: 60, // More tolerant of LLM errors
    resetTimeout: 60000, // 1 minute
    volumeThreshold: 3,
  });
};
