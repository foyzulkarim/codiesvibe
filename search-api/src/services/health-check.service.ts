/**
 * Health Check Service
 * Provides comprehensive health monitoring for production readiness
 */

import { MongoClient } from 'mongodb';
import { QdrantClient } from '@qdrant/js-client-rest';
import os from 'os';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  checks?: {
    [key: string]: {
      status: 'pass' | 'fail';
      latency?: string;
      message?: string;
      details?: unknown;
    };
  };
  system?: {
    memory: {
      used: string;
      total: string;
      percentage: number;
    };
    disk?: {
      used: string;
      total: string;
      percentage: number;
    };
    cpu: {
      loadAverage: number[];
      cores: number;
    };
  };
}

export class HealthCheckService {
  private mongoClient: MongoClient | null = null;
  private qdrantClient: QdrantClient | null = null;

  /**
   * Set MongoDB client for health checks
   */
  setMongoClient(client: MongoClient): void {
    this.mongoClient = client;
  }

  /**
   * Set Qdrant client for health checks
   */
  setQdrantClient(client: QdrantClient): void {
    this.qdrantClient = client;
  }

  /**
   * Liveness probe - basic check if application is running
   * Should be fast (<100ms) and not check external dependencies
   */
  async checkLiveness(): Promise<HealthCheckResult> {
    try {
      // Basic memory check
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;

      const result: HealthCheckResult = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        system: {
          memory: {
            used: this.formatBytes(usedMem),
            total: this.formatBytes(totalMem),
            percentage: Math.round((usedMem / totalMem) * 100),
          },
          cpu: {
            loadAverage: os.loadavg(),
            cores: os.cpus().length,
          },
        },
      };

      // Check if memory usage is critical (>90%)
      if (result.system.memory.percentage > 90) {
        result.status = 'degraded';
      }

      return result;
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        checks: {
          liveness: {
            status: 'fail',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        },
      };
    }
  }

  /**
   * Readiness probe - comprehensive check if application can serve traffic
   * Checks all external dependencies (MongoDB, Qdrant)
   */
  async checkReadiness(): Promise<HealthCheckResult> {
    const checks: HealthCheckResult['checks'] = {};

    try {
      // Check MongoDB connection
      const mongoCheck = await this.checkMongoDB();
      checks.mongodb = mongoCheck;

      // Check Qdrant connection
      const qdrantCheck = await this.checkQdrant();
      checks.qdrant = qdrantCheck;

      // Get system metrics
      const systemMetrics = await this.getSystemMetrics();

      // Determine overall status
      const allPassed = Object.values(checks).every((check) => check.status === 'pass');
      const anyFailed = Object.values(checks).some((check) => check.status === 'fail');

      const result: HealthCheckResult = {
        status: anyFailed ? 'unhealthy' : allPassed ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        checks,
        system: systemMetrics,
      };

      return result;
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        checks: {
          readiness: {
            status: 'fail',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        },
      };
    }
  }

  /**
   * Check MongoDB connection health
   */
  private async checkMongoDB(): Promise<{
    status: 'pass' | 'fail';
    latency?: string;
    message?: string;
    details?: unknown;
  }> {
    if (!this.mongoClient) {
      return {
        status: 'fail',
        message: 'MongoDB client not initialized',
      };
    }

    const startTime = Date.now();

    try {
      // Ping the database
      const admin = this.mongoClient.db().admin();
      await admin.ping();

      const latency = Date.now() - startTime;

      return {
        status: 'pass',
        latency: `${latency}ms`,
        details: {
          connected: true,
        },
      };
    } catch (error) {
      return {
        status: 'fail',
        latency: `${Date.now() - startTime}ms`,
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  /**
   * Check Qdrant connection health
   */
  private async checkQdrant(): Promise<{
    status: 'pass' | 'fail';
    latency?: string;
    message?: string;
    details?: unknown;
  }> {
    if (!this.qdrantClient) {
      return {
        status: 'fail',
        message: 'Qdrant client not initialized',
      };
    }

    const startTime = Date.now();

    try {
      // Try to list collections (lightweight operation)
      const collections = await this.qdrantClient.getCollections();

      const latency = Date.now() - startTime;

      return {
        status: 'pass',
        latency: `${latency}ms`,
        details: {
          connected: true,
          collections: collections.collections.length,
        },
      };
    } catch (error) {
      return {
        status: 'fail',
        latency: `${Date.now() - startTime}ms`,
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  /**
   * Get comprehensive system metrics
   */
  private async getSystemMetrics(): Promise<HealthCheckResult['system']> {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    const metrics: HealthCheckResult['system'] = {
      memory: {
        used: this.formatBytes(usedMem),
        total: this.formatBytes(totalMem),
        percentage: Math.round((usedMem / totalMem) * 100),
      },
      cpu: {
        loadAverage: os.loadavg(),
        cores: os.cpus().length,
      },
    };

    // Try to get disk usage (Linux/Unix only)
    try {
      const diskUsage = await this.getDiskUsage();
      if (diskUsage) {
        metrics.disk = diskUsage;
      }
    } catch {
      // Disk check failed, continue without it
    }

    return metrics;
  }

  /**
   * Get disk usage (Linux/Unix only)
   */
  private async getDiskUsage(): Promise<{
    used: string;
    total: string;
    percentage: number;
  } | null> {
    try {
      // Use df command to get disk usage of current directory
      const { stdout } = await execAsync('df -k . | tail -1');
      const parts = stdout.trim().split(/\s+/);

      if (parts.length >= 5) {
        const total = parseInt(parts[1]) * 1024; // Convert from KB to bytes
        const used = parseInt(parts[2]) * 1024;
        const percentage = parseInt(parts[4].replace('%', ''));

        return {
          used: this.formatBytes(used),
          total: this.formatBytes(total),
          percentage,
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
}

// Export singleton instance
export const healthCheckService = new HealthCheckService();
