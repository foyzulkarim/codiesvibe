/**
 * Circuit breaker state enumeration
 */
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/**
 * Configuration options for circuit breaker
 */
export interface CircuitBreakerOptions {
  /**
   * Request timeout in milliseconds
   */
  timeout: number;

  /**
   * Percentage of errors that will trigger the circuit to open (0-100)
   */
  errorThresholdPercentage: number;

  /**
   * Time in milliseconds before attempting to close an open circuit
   */
  resetTimeout: number;

  /**
   * Name identifier for the circuit breaker (for logging/metrics)
   */
  name: string;

  /**
   * Minimum number of requests before calculating error threshold
   */
  volumeThreshold?: number;

  /**
   * Custom error filter to determine if error should count toward threshold
   */
  errorFilter?: (error: Error) => boolean;
}

/**
 * Generic circuit breaker function type
 */
export type CircuitBreakerFunction<
  TArgs extends unknown[] = unknown[],
  TReturn = unknown
> = (...args: TArgs) => Promise<TReturn>;

/**
 * Current state of the circuit breaker
 */
export interface CircuitBreakerState {
  /**
   * Current circuit state
   */
  state: CircuitState;

  /**
   * Number of consecutive failures
   */
  failures: number;

  /**
   * Number of consecutive successes
   */
  successes: number;

  /**
   * Total number of requests rejected while circuit is open
   */
  rejects: number;

  /**
   * Number of requests that timed out
   */
  timeouts: number;

  /**
   * Timestamp of last state change
   */
  lastStateChange?: number;

  /**
   * Timestamp when circuit will attempt to close (OPEN state only)
   */
  nextAttempt?: number;
}

/**
 * Metrics and statistics for circuit breaker
 */
export interface CircuitBreakerMetrics {
  /**
   * Total number of successful requests
   */
  totalSuccesses: number;

  /**
   * Total number of failed requests
   */
  totalFailures: number;

  /**
   * Total number of rejected requests (circuit open)
   */
  totalRejects: number;

  /**
   * Total number of timed out requests
   */
  totalTimeouts: number;

  /**
   * Total number of requests
   */
  totalRequests: number;

  /**
   * Current error percentage
   */
  errorRate: number;

  /**
   * Average response time in milliseconds
   */
  averageResponseTime?: number;

  /**
   * Time circuit has been in current state (milliseconds)
   */
  timeInCurrentState: number;

  /**
   * Number of times circuit has opened
   */
  circuitOpenCount: number;
}

/**
 * Event emitted by circuit breaker
 */
export interface CircuitBreakerEvent {
  type: 'open' | 'close' | 'halfOpen' | 'success' | 'failure' | 'timeout' | 'reject';
  timestamp: number;
  metrics: CircuitBreakerMetrics;
  error?: Error;
}

/**
 * Circuit breaker event listener
 */
export type CircuitBreakerEventListener = (event: CircuitBreakerEvent) => void;
