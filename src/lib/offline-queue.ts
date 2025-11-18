import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { toast } from '@/components/ui/use-toast';

/**
 * Queued request item
 */
export interface QueuedRequest {
  id: string;
  config: AxiosRequestConfig;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  priority: number;
  metadata?: Record<string, any>;
}

/**
 * Queue configuration
 */
export interface OfflineQueueConfig {
  /**
   * Maximum number of requests to store
   * @default 100
   */
  maxSize?: number;

  /**
   * Maximum retry attempts per request
   * @default 3
   */
  maxRetries?: number;

  /**
   * Retry delay in milliseconds
   * @default 1000
   */
  retryDelay?: number;

  /**
   * Enable persistence to localStorage
   * @default true
   */
  enablePersistence?: boolean;

  /**
   * Storage key for persisted queue
   * @default 'offline-queue'
   */
  storageKey?: string;

  /**
   * Enable toast notifications
   * @default true
   */
  enableNotifications?: boolean;

  /**
   * Callback when queue is empty
   */
  onQueueEmpty?: () => void;

  /**
   * Callback when request succeeds
   */
  onRequestSuccess?: (request: QueuedRequest, response: AxiosResponse) => void;

  /**
   * Callback when request fails
   */
  onRequestFail?: (request: QueuedRequest, error: any) => void;
}

/**
 * Default configuration
 */
const defaultConfig: Required<Omit<OfflineQueueConfig, 'onQueueEmpty' | 'onRequestSuccess' | 'onRequestFail'>> = {
  maxSize: 100,
  maxRetries: 3,
  retryDelay: 1000,
  enablePersistence: true,
  storageKey: 'codiesvibe-offline-queue',
  enableNotifications: true,
};

/**
 * OfflineQueue - Manages failed requests for retry when online
 *
 * Features:
 * - Automatic queueing of failed requests
 * - Priority-based retry order
 * - Persistent storage across sessions
 * - Retry with exponential backoff
 * - Request deduplication
 * - Size limits and cleanup
 *
 * @example
 * ```ts
 * const queue = new OfflineQueue({
 *   maxSize: 50,
 *   maxRetries: 3,
 *   enableNotifications: true,
 * });
 *
 * // Add request to queue
 * queue.enqueue({
 *   config: axiosConfig,
 *   priority: 1,
 * });
 *
 * // Process queue when online
 * queue.processQueue();
 * ```
 */
export class OfflineQueue {
  private queue: QueuedRequest[] = [];
  private processing = false;
  private config: Required<OfflineQueueConfig>;

  constructor(config: OfflineQueueConfig = {}) {
    this.config = {
      ...defaultConfig,
      ...config,
      onQueueEmpty: config.onQueueEmpty || (() => {}),
      onRequestSuccess: config.onRequestSuccess || (() => {}),
      onRequestFail: config.onRequestFail || (() => {}),
    };

    // Load persisted queue
    if (this.config.enablePersistence) {
      this.loadQueue();
    }

    // Listen for online event to process queue
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.processQueue());
    }
  }

  /**
   * Add a request to the queue
   */
  enqueue(request: Omit<QueuedRequest, 'id' | 'timestamp' | 'retryCount'>): void {
    // Check queue size limit
    if (this.queue.length >= this.config.maxSize) {
      // Remove lowest priority item
      this.queue.sort((a, b) => a.priority - b.priority);
      this.queue.shift();

      if (this.config.enableNotifications) {
        toast({
          variant: 'destructive',
          title: 'Queue Full',
          description: 'Removed oldest request to make room',
        });
      }
    }

    const queuedRequest: QueuedRequest = {
      id: this.generateId(),
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: request.maxRetries ?? this.config.maxRetries,
      ...request,
    };

    // Check for duplicate request
    if (!this.isDuplicate(queuedRequest)) {
      this.queue.push(queuedRequest);
      this.persistQueue();

      if (this.config.enableNotifications) {
        toast({
          title: 'Request Queued',
          description: 'Will retry when connection is restored',
        });
      }
    }
  }

  /**
   * Remove a request from the queue
   */
  dequeue(id: string): QueuedRequest | undefined {
    const index = this.queue.findIndex(r => r.id === id);
    if (index !== -1) {
      const [removed] = this.queue.splice(index, 1);
      this.persistQueue();
      return removed;
    }
    return undefined;
  }

  /**
   * Process all queued requests
   */
  async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    if (!navigator.onLine) {
      console.log('Offline - skipping queue processing');
      return;
    }

    this.processing = true;

    if (this.config.enableNotifications && this.queue.length > 0) {
      toast({
        title: 'Processing Queue',
        description: `Retrying ${this.queue.length} failed request(s)`,
      });
    }

    // Sort by priority (higher priority first)
    this.queue.sort((a, b) => b.priority - a.priority);

    // Process requests sequentially
    while (this.queue.length > 0) {
      const request = this.queue[0];

      try {
        await this.processRequest(request);
        this.dequeue(request.id);
      } catch (error) {
        // Request failed, increment retry count
        request.retryCount++;

        if (request.retryCount >= request.maxRetries) {
          // Max retries reached, remove from queue
          this.dequeue(request.id);

          if (this.config.enableNotifications) {
            toast({
              variant: 'destructive',
              title: 'Request Failed',
              description: `Failed after ${request.maxRetries} attempts`,
            });
          }

          this.config.onRequestFail(request, error);
        } else {
          // Wait before next retry (exponential backoff)
          await this.delay(this.config.retryDelay * Math.pow(2, request.retryCount));
        }
      }

      // Persist after each request
      this.persistQueue();
    }

    this.processing = false;

    if (this.queue.length === 0) {
      if (this.config.enableNotifications) {
        toast({
          title: 'Queue Empty',
          description: 'All requests processed successfully',
        });
      }

      this.config.onQueueEmpty();
    }
  }

  /**
   * Process a single request
   * This will be called with the axios client injected
   */
  private async processRequest(request: QueuedRequest): Promise<AxiosResponse> {
    // Import axios dynamically to avoid circular dependency
    const { apiClient } = await import('@/api/client');

    // Execute the request using axios
    const response = await apiClient.request(request.config);

    // Call success callback
    this.config.onRequestSuccess(request, response);

    return response;
  }

  /**
   * Clear the entire queue
   */
  clear(): void {
    this.queue = [];
    this.persistQueue();

    if (this.config.enableNotifications) {
      toast({
        title: 'Queue Cleared',
        description: 'All queued requests removed',
      });
    }
  }

  /**
   * Get current queue size
   */
  get size(): number {
    return this.queue.length;
  }

  /**
   * Get all queued requests
   */
  getAll(): QueuedRequest[] {
    return [...this.queue];
  }

  /**
   * Get request by ID
   */
  getById(id: string): QueuedRequest | undefined {
    return this.queue.find(r => r.id === id);
  }

  /**
   * Check if queue is empty
   */
  get isEmpty(): boolean {
    return this.queue.length === 0;
  }

  /**
   * Check if queue is processing
   */
  get isProcessing(): boolean {
    return this.processing;
  }

  /**
   * Generate unique ID for request
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if request is duplicate
   */
  private isDuplicate(request: QueuedRequest): boolean {
    return this.queue.some(r => {
      return (
        r.config.method === request.config.method &&
        r.config.url === request.config.url &&
        JSON.stringify(r.config.data) === JSON.stringify(request.config.data)
      );
    });
  }

  /**
   * Persist queue to localStorage
   */
  private persistQueue(): void {
    if (!this.config.enablePersistence || typeof window === 'undefined') {
      return;
    }

    try {
      const serialized = JSON.stringify(this.queue);
      localStorage.setItem(this.config.storageKey, serialized);
    } catch (error) {
      console.error('Failed to persist queue:', error);
    }
  }

  /**
   * Load queue from localStorage
   */
  private loadQueue(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const serialized = localStorage.getItem(this.config.storageKey);
      if (serialized) {
        this.queue = JSON.parse(serialized);

        // Clean up old requests (older than 24 hours)
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        this.queue = this.queue.filter(r => r.timestamp > oneDayAgo);

        this.persistQueue();
      }
    } catch (error) {
      console.error('Failed to load queue:', error);
      this.queue = [];
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Destroy queue and cleanup
   */
  destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', () => this.processQueue());
    }

    if (this.config.enablePersistence) {
      localStorage.removeItem(this.config.storageKey);
    }

    this.queue = [];
  }
}

/**
 * Global offline queue instance
 */
export const offlineQueue = new OfflineQueue({
  maxSize: 100,
  maxRetries: 3,
  enableNotifications: true,
  enablePersistence: true,
});

/**
 * Hook for accessing offline queue in React components
 */
export const useOfflineQueue = () => {
  return {
    queue: offlineQueue,
    size: offlineQueue.size,
    isEmpty: offlineQueue.isEmpty,
    isProcessing: offlineQueue.isProcessing,
    processQueue: () => offlineQueue.processQueue(),
    clear: () => offlineQueue.clear(),
    getAll: () => offlineQueue.getAll(),
  };
};
