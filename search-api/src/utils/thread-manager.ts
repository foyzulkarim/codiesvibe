import { v4 as uuidv4 } from 'uuid';

/**
 * Thread management utilities for LangGraph checkpointing
 */
export interface ThreadInfo {
  id: string;
  createdAt: Date;
  lastAccessed: Date;
  expirationTime: Date;
  metadata?: Record<string, unknown>;
}

export interface ThreadValidationResult {
  isValid: boolean;
  error?: string;
  threadInfo?: ThreadInfo;
}

export class ThreadManager {
  private static instance: ThreadManager;
  private activeThreads: Map<string, ThreadInfo> = new Map();
  private readonly DEFAULT_THREAD_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_ACTIVE_THREADS = 1000;

  private constructor() {
    // Start cleanup interval
    setInterval(() => this.cleanupExpiredThreads(), 60 * 60 * 1000); // Every hour
  }

  public static getInstance(): ThreadManager {
    if (!ThreadManager.instance) {
      ThreadManager.instance = new ThreadManager();
    }
    return ThreadManager.instance;
  }

  /**
   * Generate a new thread ID
   */
  public generateThreadId(): string {
    return uuidv4();
  }

  /**
   * Create and register a new thread
   */
  public createThread(metadata?: Record<string, unknown>): string {
    const threadId = this.generateThreadId();
    const now = new Date();
    
    const threadInfo: ThreadInfo = {
      id: threadId,
      createdAt: now,
      lastAccessed: now,
      expirationTime: new Date(now.getTime() + this.DEFAULT_THREAD_TTL_MS),
      metadata
    };

    this.activeThreads.set(threadId, threadInfo);
    
    // Enforce maximum thread limit
    if (this.activeThreads.size > this.MAX_ACTIVE_THREADS) {
      this.evictOldestThreads();
    }

    return threadId;
  }

  /**
   * Validate a thread ID
   */
  public validateThreadId(threadId: string): ThreadValidationResult {
    if (!threadId || typeof threadId !== 'string') {
      return {
        isValid: false,
        error: 'Thread ID must be a non-empty string'
      };
    }

    if (threadId.length !== 36) { // UUID v4 length
      return {
        isValid: false,
        error: 'Thread ID must be a valid UUID v4'
      };
    }

    const threadInfo = this.activeThreads.get(threadId);
    if (!threadInfo) {
      return {
        isValid: false,
        error: 'Thread not found or expired'
      };
    }

    if (new Date() > threadInfo.expirationTime) {
      this.activeThreads.delete(threadId);
      return {
        isValid: false,
        error: 'Thread has expired'
      };
    }

    // Update last accessed time
    threadInfo.lastAccessed = new Date();
    
    return {
      isValid: true,
      threadInfo
    };
  }

  /**
   * Get thread information
   */
  public getThreadInfo(threadId: string): ThreadInfo | null {
    const validation = this.validateThreadId(threadId);
    return validation.isValid ? validation.threadInfo! : null;
  }

  /**
   * Update thread metadata
   */
  public updateThreadMetadata(threadId: string, metadata: Record<string, unknown>): boolean {
    const threadInfo = this.activeThreads.get(threadId);
    if (!threadInfo) {
      return false;
    }

    threadInfo.metadata = { ...threadInfo.metadata, ...metadata };
    threadInfo.lastAccessed = new Date();
    return true;
  }

  /**
   * Extend thread expiration
   */
  public extendThreadExpiration(threadId: string, extensionMs: number = this.DEFAULT_THREAD_TTL_MS): boolean {
    const threadInfo = this.activeThreads.get(threadId);
    if (!threadInfo) {
      return false;
    }

    threadInfo.expirationTime = new Date(threadInfo.expirationTime.getTime() + extensionMs);
    threadInfo.lastAccessed = new Date();
    return true;
  }

  /**
   * Delete a thread
   */
  public deleteThread(threadId: string): boolean {
    return this.activeThreads.delete(threadId);
  }

  /**
   * Get all active threads
   */
  public getActiveThreads(): ThreadInfo[] {
    return Array.from(this.activeThreads.values());
  }

  /**
   * Get thread statistics
   */
  public getThreadStats(): {
    totalActive: number;
    expiredCount: number;
    averageAge: number;
  } {
    const now = new Date();
    const threads = Array.from(this.activeThreads.values());
    
    const expiredCount = threads.filter(thread => now > thread.expirationTime).length;
    const totalAge = threads.reduce((sum, thread) => sum + (now.getTime() - thread.createdAt.getTime()), 0);
    const averageAge = threads.length > 0 ? totalAge / threads.length : 0;

    return {
      totalActive: threads.length,
      expiredCount,
      averageAge
    };
  }

  /**
   * Clean up expired threads
   */
  private cleanupExpiredThreads(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [threadId, threadInfo] of this.activeThreads.entries()) {
      if (now > threadInfo.expirationTime) {
        this.activeThreads.delete(threadId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`[ThreadManager] Cleaned up ${cleanedCount} expired threads`);
    }
  }

  /**
   * Evict oldest threads when limit is exceeded
   */
  private evictOldestThreads(): void {
    const threads = Array.from(this.activeThreads.entries());
    threads.sort(([, a], [, b]) => a.lastAccessed.getTime() - b.lastAccessed.getTime());

    const toEvict = threads.slice(0, threads.length - this.MAX_ACTIVE_THREADS);
    let evictedCount = 0;

    for (const [threadId] of toEvict) {
      this.activeThreads.delete(threadId);
      evictedCount++;
    }

    if (evictedCount > 0) {
      console.log(`[ThreadManager] Evicted ${evictedCount} oldest threads due to limit`);
    }
  }

  /**
   * Force cleanup of all threads
   */
  public clearAllThreads(): void {
    const count = this.activeThreads.size;
    this.activeThreads.clear();
    console.log(`[ThreadManager] Cleared all ${count} threads`);
  }
}

// Export singleton instance
export const threadManager = ThreadManager.getInstance();
