/**
 * Correlation Context Utility
 * Provides async local storage for correlation ID propagation across async operations
 */

import { AsyncLocalStorage } from 'async_hooks';

export interface CorrelationContext {
  correlationId: string;
  startTime: number;
  metadata?: Record<string, any>;
}

/**
 * Async Local Storage for correlation context
 * Allows correlation ID to be accessed anywhere in the async call stack
 */
export class CorrelationContextManager {
  private asyncLocalStorage: AsyncLocalStorage<CorrelationContext>;

  constructor() {
    this.asyncLocalStorage = new AsyncLocalStorage<CorrelationContext>();
  }

  /**
   * Run a function with correlation context
   */
  run<T>(context: CorrelationContext, callback: () => T): T {
    return this.asyncLocalStorage.run(context, callback);
  }

  /**
   * Get current correlation ID
   */
  getCorrelationId(): string | undefined {
    const context = this.asyncLocalStorage.getStore();
    return context?.correlationId;
  }

  /**
   * Get current correlation context
   */
  getContext(): CorrelationContext | undefined {
    return this.asyncLocalStorage.getStore();
  }

  /**
   * Set metadata in current context
   */
  setMetadata(key: string, value: any): void {
    const context = this.asyncLocalStorage.getStore();
    if (context) {
      if (!context.metadata) {
        context.metadata = {};
      }
      context.metadata[key] = value;
    }
  }

  /**
   * Get metadata from current context
   */
  getMetadata(key: string): any {
    const context = this.asyncLocalStorage.getStore();
    return context?.metadata?.[key];
  }

  /**
   * Get elapsed time since request started
   */
  getElapsedTime(): number | undefined {
    const context = this.asyncLocalStorage.getStore();
    if (!context) return undefined;
    return Date.now() - context.startTime;
  }
}

// Export singleton instance
export const correlationContext = new CorrelationContextManager();
