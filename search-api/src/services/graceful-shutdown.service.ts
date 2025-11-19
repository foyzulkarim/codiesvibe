/**
 * Graceful Shutdown Service
 * Handles clean shutdown of the application on termination signals
 */

import { Server } from 'http';
import { MongoClient } from 'mongodb';
import { searchLogger } from '../config/logger';

export interface ShutdownOptions {
  /**
   * Timeout in milliseconds to wait for connections to drain
   * @default 30000 (30 seconds)
   */
  timeout?: number;

  /**
   * Callback to execute before shutdown
   */
  beforeShutdown?: () => Promise<void>;

  /**
   * Callback to execute after shutdown
   */
  afterShutdown?: () => Promise<void>;
}

export class GracefulShutdownService {
  private server: Server | null = null;
  private mongoClient: MongoClient | null = null;
  private isShuttingDown = false;
  private activeConnections = new Set<any>();
  private shutdownTimeout: number = 30000; // 30 seconds default

  /**
   * Register the HTTP server
   */
  registerServer(server: Server): void {
    this.server = server;

    // Track active connections
    server.on('connection', (connection) => {
      this.activeConnections.add(connection);

      connection.on('close', () => {
        this.activeConnections.delete(connection);
      });
    });
  }

  /**
   * Register MongoDB client for cleanup
   */
  registerMongoClient(client: MongoClient): void {
    this.mongoClient = client;
  }

  /**
   * Set shutdown timeout
   */
  setTimeout(timeout: number): void {
    this.shutdownTimeout = timeout;
  }

  /**
   * Initialize shutdown handlers for process signals
   */
  setupHandlers(options: ShutdownOptions = {}): void {
    if (options.timeout) {
      this.shutdownTimeout = options.timeout;
    }

    // Handle SIGTERM (Docker, Kubernetes, systemd)
    process.on('SIGTERM', async () => {
      searchLogger.info('📥 Received SIGTERM signal - initiating graceful shutdown', {
        service: 'search-api',
        signal: 'SIGTERM',
      });
      await this.shutdown('SIGTERM', options);
    });

    // Handle SIGINT (Ctrl+C)
    process.on('SIGINT', async () => {
      searchLogger.info('📥 Received SIGINT signal - initiating graceful shutdown', {
        service: 'search-api',
        signal: 'SIGINT',
      });
      await this.shutdown('SIGINT', options);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
      searchLogger.error('💥 Uncaught exception - forcing shutdown', error, {
        service: 'search-api',
        error: error.message,
      });
      await this.shutdown('UNCAUGHT_EXCEPTION', options, 1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', async (reason, promise) => {
      searchLogger.error('💥 Unhandled promise rejection - forcing shutdown', new Error(String(reason)), {
        service: 'search-api',
        reason: String(reason),
      });
      await this.shutdown('UNHANDLED_REJECTION', options, 1);
    });

    searchLogger.info('✅ Graceful shutdown handlers registered', {
      service: 'search-api',
      timeout: `${this.shutdownTimeout}ms`,
      signals: ['SIGTERM', 'SIGINT', 'uncaughtException', 'unhandledRejection'],
    });
  }

  /**
   * Execute graceful shutdown sequence
   */
  private async shutdown(
    signal: string,
    options: ShutdownOptions = {},
    exitCode: number = 0
  ): Promise<void> {
    // Prevent multiple shutdown attempts
    if (this.isShuttingDown) {
      searchLogger.warn('⚠️  Shutdown already in progress', {
        service: 'search-api',
        signal,
      });
      return;
    }

    this.isShuttingDown = true;

    searchLogger.info('🛑 Starting graceful shutdown sequence', {
      service: 'search-api',
      signal,
      activeConnections: this.activeConnections.size,
      timeout: `${this.shutdownTimeout}ms`,
    });

    try {
      // Step 1: Execute beforeShutdown callback
      if (options.beforeShutdown) {
        searchLogger.info('🔄 Executing beforeShutdown callback', {
          service: 'search-api',
        });
        await options.beforeShutdown();
      }

      // Step 2: Stop accepting new connections
      if (this.server) {
        searchLogger.info('🚫 Stopping new connections', {
          service: 'search-api',
        });

        await new Promise<void>((resolve, reject) => {
          this.server!.close((err) => {
            if (err) {
              searchLogger.warn('⚠️  Error closing server', {
                service: 'search-api',
                error: err.message,
              });
              reject(err);
            } else {
              searchLogger.info('✅ Server stopped accepting new connections', {
                service: 'search-api',
              });
              resolve();
            }
          });
        });
      }

      // Step 3: Drain existing connections
      await this.drainConnections();

      // Step 4: Close database connections
      await this.closeDatabaseConnections();

      // Step 5: Execute afterShutdown callback
      if (options.afterShutdown) {
        searchLogger.info('🔄 Executing afterShutdown callback', {
          service: 'search-api',
        });
        await options.afterShutdown();
      }

      searchLogger.info('✅ Graceful shutdown completed successfully', {
        service: 'search-api',
        signal,
        exitCode,
      });

      // Exit process
      process.exit(exitCode);
    } catch (error) {
      searchLogger.error('❌ Error during graceful shutdown', error instanceof Error ? error : new Error('Unknown error'), {
        service: 'search-api',
        signal,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Force exit with error code
      process.exit(1);
    }
  }

  /**
   * Drain existing connections with timeout
   */
  private async drainConnections(): Promise<void> {
    if (this.activeConnections.size === 0) {
      searchLogger.info('✅ No active connections to drain', {
        service: 'search-api',
      });
      return;
    }

    searchLogger.info('⏳ Draining active connections', {
      service: 'search-api',
      activeConnections: this.activeConnections.size,
      timeout: `${this.shutdownTimeout}ms`,
    });

    const startTime = Date.now();

    return new Promise<void>((resolve) => {
      // Set timeout to force close connections
      const timeout = setTimeout(() => {
        if (this.activeConnections.size > 0) {
          searchLogger.warn('⚠️  Timeout reached - forcing connection closure', {
            service: 'search-api',
            remainingConnections: this.activeConnections.size,
            timeElapsed: `${Date.now() - startTime}ms`,
          });

          // Force close remaining connections
          this.activeConnections.forEach((connection) => {
            try {
              connection.destroy();
            } catch (error) {
              // Ignore errors during forced closure
            }
          });
          this.activeConnections.clear();
        }
        resolve();
      }, this.shutdownTimeout);

      // Check every 100ms if all connections are closed
      const interval = setInterval(() => {
        if (this.activeConnections.size === 0) {
          clearInterval(interval);
          clearTimeout(timeout);

          searchLogger.info('✅ All connections drained successfully', {
            service: 'search-api',
            timeElapsed: `${Date.now() - startTime}ms`,
          });
          resolve();
        }
      }, 100);
    });
  }

  /**
   * Close database connections
   */
  private async closeDatabaseConnections(): Promise<void> {
    searchLogger.info('🔌 Closing database connections', {
      service: 'search-api',
    });

    try {
      // Close MongoDB connection
      if (this.mongoClient) {
        searchLogger.info('🔌 Closing MongoDB connection', {
          service: 'search-api',
        });
        await this.mongoClient.close();
        searchLogger.info('✅ MongoDB connection closed', {
          service: 'search-api',
        });
      }

      // Note: Qdrant client doesn't need explicit cleanup
      // HTTP connections are handled by Node.js

      searchLogger.info('✅ All database connections closed', {
        service: 'search-api',
      });
    } catch (error) {
      searchLogger.error('❌ Error closing database connections', error instanceof Error ? error : new Error('Unknown error'), {
        service: 'search-api',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Check if shutdown is in progress
   */
  isShutdownInProgress(): boolean {
    return this.isShuttingDown;
  }

  /**
   * Get active connections count
   */
  getActiveConnectionsCount(): number {
    return this.activeConnections.size;
  }
}

// Export singleton instance
export const gracefulShutdown = new GracefulShutdownService();
