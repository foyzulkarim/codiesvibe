/**
 * Prometheus Metrics Service
 * Collects and exposes application metrics for monitoring
 */

import { Request, Response, NextFunction } from 'express';
import promClient from 'prom-client';
import { searchLogger } from '../config/logger.js';

export class MetricsService {
  private register: promClient.Registry;

  // HTTP Metrics
  private httpRequestDuration: promClient.Histogram;
  private httpRequestTotal: promClient.Counter;
  private httpRequestsInFlight: promClient.Gauge;
  private httpResponseSize: promClient.Histogram;

  // Application Metrics
  private searchQueriesTotal: promClient.Counter;
  private searchQueryDuration: promClient.Histogram;
  private llmCacheHits: promClient.Counter;
  private llmCacheMisses: promClient.Counter;
  private llmCacheSavings: promClient.Counter;

  // Database Metrics
  private dbOperationDuration: promClient.Histogram;
  private dbOperationTotal: promClient.Counter;
  private dbConnectionPoolSize: promClient.Gauge;

  // Vector Database Metrics
  private vectorSearchDuration: promClient.Histogram;
  private vectorSearchTotal: promClient.Counter;

  // Error Metrics
  private errorTotal: promClient.Counter;

  // System Metrics
  private memoryUsage: promClient.Gauge;
  private cpuUsage: promClient.Gauge;
  private activeConnections: promClient.Gauge;

  constructor() {
    // Create a new registry
    this.register = new promClient.Registry();

    // Add default metrics (process metrics, GC, etc.)
    promClient.collectDefaultMetrics({ register: this.register });

    // Initialize HTTP metrics
    this.httpRequestDuration = new promClient.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
      registers: [this.register],
    });

    this.httpRequestTotal = new promClient.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.register],
    });

    this.httpRequestsInFlight = new promClient.Gauge({
      name: 'http_requests_in_flight',
      help: 'Number of HTTP requests currently being processed',
      registers: [this.register],
    });

    this.httpResponseSize = new promClient.Histogram({
      name: 'http_response_size_bytes',
      help: 'Size of HTTP responses in bytes',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [100, 1000, 10000, 100000, 1000000],
      registers: [this.register],
    });

    // Initialize application metrics
    this.searchQueriesTotal = new promClient.Counter({
      name: 'search_queries_total',
      help: 'Total number of search queries processed',
      labelNames: ['status'],
      registers: [this.register],
    });

    this.searchQueryDuration = new promClient.Histogram({
      name: 'search_query_duration_seconds',
      help: 'Duration of search query processing in seconds',
      labelNames: ['status'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
      registers: [this.register],
    });

    this.llmCacheHits = new promClient.Counter({
      name: 'llm_cache_hits_total',
      help: 'Total number of LLM cache hits',
      registers: [this.register],
    });

    this.llmCacheMisses = new promClient.Counter({
      name: 'llm_cache_misses_total',
      help: 'Total number of LLM cache misses',
      registers: [this.register],
    });

    this.llmCacheSavings = new promClient.Counter({
      name: 'llm_cache_savings_total',
      help: 'Total cost savings from LLM cache (in cents)',
      registers: [this.register],
    });

    // Initialize database metrics
    this.dbOperationDuration = new promClient.Histogram({
      name: 'db_operation_duration_seconds',
      help: 'Duration of database operations in seconds',
      labelNames: ['operation', 'collection', 'status'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2],
      registers: [this.register],
    });

    this.dbOperationTotal = new promClient.Counter({
      name: 'db_operations_total',
      help: 'Total number of database operations',
      labelNames: ['operation', 'collection', 'status'],
      registers: [this.register],
    });

    this.dbConnectionPoolSize = new promClient.Gauge({
      name: 'db_connection_pool_size',
      help: 'Number of database connections in the pool',
      labelNames: ['state'],
      registers: [this.register],
    });

    // Initialize vector database metrics
    this.vectorSearchDuration = new promClient.Histogram({
      name: 'vector_search_duration_seconds',
      help: 'Duration of vector search operations in seconds',
      labelNames: ['collection', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [this.register],
    });

    this.vectorSearchTotal = new promClient.Counter({
      name: 'vector_searches_total',
      help: 'Total number of vector searches',
      labelNames: ['collection', 'status'],
      registers: [this.register],
    });

    // Initialize error metrics
    this.errorTotal = new promClient.Counter({
      name: 'errors_total',
      help: 'Total number of errors',
      labelNames: ['type', 'severity'],
      registers: [this.register],
    });

    // Initialize system metrics
    this.memoryUsage = new promClient.Gauge({
      name: 'memory_usage_bytes',
      help: 'Memory usage in bytes',
      labelNames: ['type'],
      registers: [this.register],
    });

    this.cpuUsage = new promClient.Gauge({
      name: 'cpu_usage_percent',
      help: 'CPU usage percentage',
      registers: [this.register],
    });

    this.activeConnections = new promClient.Gauge({
      name: 'active_connections',
      help: 'Number of active connections',
      registers: [this.register],
    });

    // Start collecting system metrics periodically
    this.startSystemMetricsCollection();

    searchLogger.info('✅ Metrics service initialized', {
      service: 'search-api',
      metricsEndpoint: '/metrics',
    });
  }

  /**
   * Get registry for exporting metrics
   */
  getRegistry(): promClient.Registry {
    return this.register;
  }

  /**
   * Express middleware to track HTTP metrics
   */
  trackHttpMetrics() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    return (req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();

      // Increment in-flight requests
      self.httpRequestsInFlight.inc();

      // Store original end function
      const originalEnd = res.end;


      // Override end function to capture metrics
      res.end = function (this: Response, ...args: unknown[]) {
        // Calculate duration
        const duration = (Date.now() - start) / 1000;

        // Get route (use path or 'unknown')
        const route = req.route?.path || req.path || 'unknown';
        const method = req.method;
        const statusCode = res.statusCode.toString();

        // Record metrics
        self.httpRequestDuration.labels(method, route, statusCode).observe(duration);
        self.httpRequestTotal.labels(method, route, statusCode).inc();
        self.httpRequestsInFlight.dec();

        // Record response size if available
        const contentLength = res.get('Content-Length');
        if (contentLength) {
          self.httpResponseSize.labels(method, route, statusCode).observe(parseInt(contentLength));
        }

        // Call original end function
        return originalEnd.apply(this, args as []);
      };

      next();
    };
  }

  /**
   * Track search query metrics
   */
  trackSearchQuery(duration: number, status: 'success' | 'error'): void {
    this.searchQueriesTotal.labels(status).inc();
    this.searchQueryDuration.labels(status).observe(duration);
  }

  /**
   * Track LLM cache metrics
   */
  trackLLMCacheHit(savingsInCents: number = 0): void {
    this.llmCacheHits.inc();
    if (savingsInCents > 0) {
      this.llmCacheSavings.inc(savingsInCents);
    }
  }

  trackLLMCacheMiss(): void {
    this.llmCacheMisses.inc();
  }

  /**
   * Track database operation metrics
   */
  trackDbOperation(
    operation: string,
    collection: string,
    duration: number,
    status: 'success' | 'error'
  ): void {
    this.dbOperationDuration.labels(operation, collection, status).observe(duration);
    this.dbOperationTotal.labels(operation, collection, status).inc();
  }

  /**
   * Update database connection pool metrics
   */
  updateDbConnectionPool(available: number, inUse: number): void {
    this.dbConnectionPoolSize.labels('available').set(available);
    this.dbConnectionPoolSize.labels('in_use').set(inUse);
  }

  /**
   * Track vector search metrics
   */
  trackVectorSearch(
    collection: string,
    duration: number,
    status: 'success' | 'error'
  ): void {
    this.vectorSearchDuration.labels(collection, status).observe(duration);
    this.vectorSearchTotal.labels(collection, status).inc();
  }

  /**
   * Track error metrics
   */
  trackError(type: string, severity: 'low' | 'medium' | 'high' | 'critical'): void {
    this.errorTotal.labels(type, severity).inc();
  }

  /**
   * Update active connections count
   */
  updateActiveConnections(count: number): void {
    this.activeConnections.set(count);
  }

  /**
   * Start collecting system metrics periodically
   */
  private startSystemMetricsCollection(): void {
    // Collect memory metrics every 15 seconds
    setInterval(() => {
      const memUsage = process.memoryUsage();
      this.memoryUsage.labels('rss').set(memUsage.rss);
      this.memoryUsage.labels('heap_total').set(memUsage.heapTotal);
      this.memoryUsage.labels('heap_used').set(memUsage.heapUsed);
      this.memoryUsage.labels('external').set(memUsage.external);
    }, 15000);

    // Collect CPU metrics every 15 seconds
    let lastCpuUsage = process.cpuUsage();
    setInterval(() => {
      const currentCpuUsage = process.cpuUsage(lastCpuUsage);
      const totalUsage = currentCpuUsage.user + currentCpuUsage.system;
      const percentage = (totalUsage / 15000000) * 100; // 15 seconds in microseconds
      this.cpuUsage.set(Math.min(percentage, 100));
      lastCpuUsage = process.cpuUsage();
    }, 15000);
  }

  /**
   * Get metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    return await this.register.metrics();
  }

  /**
   * Get content type for Prometheus metrics
   */
  getContentType(): string {
    return this.register.contentType;
  }
}

// Export singleton instance
export const metricsService = new MetricsService();
