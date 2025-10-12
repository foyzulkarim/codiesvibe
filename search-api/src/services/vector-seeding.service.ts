import { vectorIndexingService } from "./vector-indexing.service";
import { mongoDBService } from "./mongodb.service";
import { qdrantService } from "./qdrant.service";
import { embeddingService } from "./embedding.service";

// Types for seeding progress and statistics
export interface SeedingProgress {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  startTime: Date;
  currentBatch?: number;
  totalBatches?: number;
  isRunning: boolean;
  lastUpdated: Date;
}

export interface SeedingStats {
  totalTools: number;
  indexedTools: number;
  lastSeedingTime?: Date;
  successRate: number;
  averageProcessingTime?: number;
  healthStatus: 'healthy' | 'warning' | 'error';
  recentErrors: Array<{
    timestamp: Date;
    message: string;
    toolId?: string;
  }>;
}

export interface SeedingOptions {
  force?: boolean; // Force re-indexing even if already indexed
  batchSize?: number;
  validateAfter?: boolean; // Validate results after seeding
  onProgress?: (progress: SeedingProgress) => void; // Progress callback
}

export class VectorSeedingService {
  private progress: SeedingProgress;
  private stats: SeedingStats;
  private isSeeding = false;
  private readonly DEFAULT_BATCH_SIZE = 50;

  constructor() {
    this.progress = {
      total: 0,
      processed: 0,
      successful: 0,
      failed: 0,
      startTime: new Date(),
      isRunning: false,
      lastUpdated: new Date()
    };

    this.stats = {
      totalTools: 0,
      indexedTools: 0,
      successRate: 0,
      healthStatus: 'healthy',
      recentErrors: []
    };

    // Initialize stats on startup
    this.initializeStats();
  }

  /**
   * Initialize seeding statistics from current state
   */
  private async initializeStats(): Promise<void> {
    try {
      // Get current tool count from MongoDB
      const tools = await mongoDBService.getAllTools();
      this.stats.totalTools = tools.length;

      // Get current vector count from Qdrant
      const collectionInfo = await qdrantService.getCollectionInfo();
      this.stats.indexedTools = collectionInfo.points_count || 0;

      // Calculate success rate
      if (this.stats.totalTools > 0) {
        this.stats.successRate = (this.stats.indexedTools / this.stats.totalTools) * 100;
      }

      // Determine health status
      if (this.stats.successRate >= 95) {
        this.stats.healthStatus = 'healthy';
      } else if (this.stats.successRate >= 70) {
        this.stats.healthStatus = 'warning';
      } else {
        this.stats.healthStatus = 'error';
      }

      console.log(`📊 Seeding stats initialized: ${this.stats.indexedTools}/${this.stats.totalTools} tools indexed (${this.stats.successRate.toFixed(1)}%)`);
    } catch (error) {
      console.error('❌ Error initializing seeding stats:', error);
      this.stats.healthStatus = 'error';
      this.addErrorToStats('Failed to initialize stats', error);
    }
  }

  /**
   * Main seeding method to index all tools
   */
  async seedTools(options: SeedingOptions = {}): Promise<void> {
    // Prevent concurrent seeding
    if (this.isSeeding && !options.force) {
      throw new Error('Seeding is already in progress. Use force option to override.');
    }

    // Validate services are available
    await this.validateServices();

    console.log('🚀 Starting vector seeding process...');
    
    // Reset progress
    this.progress = {
      total: 0,
      processed: 0,
      successful: 0,
      failed: 0,
      startTime: new Date(),
      isRunning: true,
      lastUpdated: new Date()
    };

    this.isSeeding = true;

    const startTime = Date.now();
    const batchSize = options.batchSize || this.DEFAULT_BATCH_SIZE;

    try {
      // Get all tools from MongoDB
      const tools = await mongoDBService.getAllTools();
      this.progress.total = tools.length;

      console.log(`📊 Found ${this.progress.total} tools in MongoDB`);

      if (this.progress.total === 0) {
        console.log('ℹ️ No tools found in database');
        this.updateProgressCallback(options);
        return;
      }

      // Handle force re-indexing
      if (options.force) {
        console.log('🔄 Force re-indexing enabled - clearing existing vectors...');
        await this.clearExistingVectors();
      } else {
        // Check if tools are already indexed
        const indexedCount = await this.getIndexedToolCount();
        if (indexedCount >= this.progress.total) {
          console.log(`✅ All ${this.progress.total} tools are already indexed. Use force option to re-index.`);
          this.progress.isRunning = false;
          this.updateProgressCallback(options);
          return;
        }
      }

      // Use VectorIndexingService to handle the actual indexing
      console.log(`📋 Processing in ${Math.ceil(this.progress.total / batchSize)} batches of ${batchSize} tools each`);
      
      // Monitor progress during indexing
      await this.monitorIndexingProgress(batchSize, options);

      // Update stats after seeding
      const endTime = Date.now();
      this.stats.averageProcessingTime = (endTime - startTime) / this.progress.total;
      this.stats.lastSeedingTime = new Date();
      this.stats.indexedTools = this.progress.successful;
      this.stats.successRate = (this.progress.successful / this.progress.total) * 100;

      // Validate results if requested
      if (options.validateAfter !== false) {
        console.log('🔍 Validating seeding results...');
        await this.validateSeeding();
      }

      // Final summary
      console.log('\n🎉 Vector seeding completed!');
      console.log(`📊 Summary:
✅ Successfully indexed: ${this.progress.successful}/${this.progress.total}
❌ Failed: ${this.progress.failed}/${this.progress.total}
📈 Success rate: ${Math.round(this.stats.successRate)}%
⏱️  Average processing time: ${this.stats.averageProcessingTime?.toFixed(2)}ms/tool`);

    } catch (error) {
      console.error('💥 Critical error during seeding:', error);
      this.addErrorToStats('Critical seeding error', error);
      throw error;
    } finally {
      this.progress.isRunning = false;
      this.isSeeding = false;
      this.progress.lastUpdated = new Date();
      this.updateHealthStatus();
      this.updateProgressCallback(options);
    }
  }

  /**
   * Monitor progress during indexing
   */
  private async monitorIndexingProgress(batchSize: number, options: SeedingOptions): Promise<void> {
    // Set up progress monitoring interval
    const progressInterval = setInterval(() => {
      if (this.progress.isRunning) {
        this.updateProgressCallback(options);
      }
    }, 2000); // Update every 2 seconds

    try {
      // Start the actual indexing
      await vectorIndexingService.indexAllTools(batchSize);
      
      // Get final stats from the indexing service
      const healthReport = await vectorIndexingService.validateIndex();
      this.progress.successful = healthReport.mongoToolCount - healthReport.missingVectors;
      this.progress.failed = healthReport.missingVectors;
    } finally {
      clearInterval(progressInterval);
    }
  }

  /**
   * Clear existing vectors from Qdrant
   */
  private async clearExistingVectors(): Promise<void> {
    try {
      console.log('🗑️ Clearing existing vectors from Qdrant collection...');
      await qdrantService.clearAllPoints();
      console.log('✅ Successfully cleared all existing vectors');
    } catch (error) {
      console.error('❌ Error clearing existing vectors:', error);
      this.addErrorToStats('Failed to clear vectors', error);
      throw error;
    }
  }

  /**
   * Get count of currently indexed tools
   */
  private async getIndexedToolCount(): Promise<number> {
    try {
      const collectionInfo = await qdrantService.getCollectionInfo();
      return collectionInfo.points_count || 0;
    } catch (error) {
      console.error('❌ Error getting indexed tool count:', error);
      return 0;
    }
  }

  /**
   * Validate that seeding was successful
   */
  async validateSeeding(): Promise<boolean> {
    console.log('🔍 Starting seeding validation...');

    try {
      // Use VectorIndexingService validation
      const healthReport = await vectorIndexingService.validateIndex();
      
      const isValid = 
        healthReport.collectionHealthy &&
        healthReport.sampleValidationPassed &&
        healthReport.missingVectors === 0;

      if (isValid) {
        console.log('✅ Seeding validation passed - all tools are properly indexed');
      } else {
        console.log('❌ Seeding validation failed - issues detected:');
        healthReport.recommendations.forEach(rec => console.log(`  • ${rec}`));
      }

      return isValid;
    } catch (error) {
      console.error('💥 Error during seeding validation:', error);
      this.addErrorToStats('Validation error', error);
      return false;
    }
  }

  /**
   * Get current seeding statistics
   */
  getSeedingStats(): SeedingStats {
    // Return a copy to prevent external modification
    return { ...this.stats };
  }

  /**
   * Get current seeding progress
   */
  getSeedingProgress(): SeedingProgress {
    // Return a copy to prevent external modification
    return { ...this.progress };
  }

  /**
   * Validate that all required services are available
   */
  private async validateServices(): Promise<void> {
    const errors: string[] = [];

    // Test MongoDB connection
    try {
      await mongoDBService.getAllTools();
    } catch (error) {
      errors.push(`MongoDB: ${error}`);
    }

    // Test Qdrant connection
    try {
      await qdrantService.getCollectionInfo();
    } catch (error) {
      errors.push(`Qdrant: ${error}`);
    }

    // Test Embedding service
    try {
      await embeddingService.generateEmbedding('test');
    } catch (error) {
      errors.push(`Embedding: ${error}`);
    }

    if (errors.length > 0) {
      const errorMsg = `Service validation failed:\n${errors.join('\n')}`;
      console.error('❌ Service validation error:', errorMsg);
      throw new Error(errorMsg);
    }

    console.log('✅ All services validated successfully');
  }

  /**
   * Add error to statistics
   */
  private addErrorToStats(message: string, error: any): void {
    const errorEntry = {
      timestamp: new Date(),
      message,
      error: String(error)
    };

    this.stats.recentErrors.push(errorEntry as any);

    // Keep only the last 10 errors
    if (this.stats.recentErrors.length > 10) {
      this.stats.recentErrors = this.stats.recentErrors.slice(-10);
    }
  }

  /**
   * Update health status based on current stats
   */
  private updateHealthStatus(): void {
    if (this.stats.successRate >= 95) {
      this.stats.healthStatus = 'healthy';
    } else if (this.stats.successRate >= 70) {
      this.stats.healthStatus = 'warning';
    } else {
      this.stats.healthStatus = 'error';
    }
  }

  /**
   * Call progress callback if provided
   */
  private updateProgressCallback(options: SeedingOptions): void {
    if (options.onProgress) {
      try {
        options.onProgress({ ...this.progress });
      } catch (error) {
        console.error('❌ Error in progress callback:', error);
      }
    }
  }

  /**
   * Check if seeding is currently in progress
   */
  get isSeedingActive(): boolean {
    return this.isSeeding;
  }

  /**
   * Get detailed health report
   */
  async getHealthReport(): Promise<{
    seeding: SeedingStats;
    progress: SeedingProgress;
    vectorIndex: any;
    recommendations: string[];
  }> {
    // Get vector index health report
    const vectorIndex = await vectorIndexingService.validateIndex();
    
    const recommendations: string[] = [];
    
    // Generate recommendations based on current state
    if (this.stats.successRate < 95) {
      recommendations.push('Some tools are missing vectors - consider re-running seeding');
    }
    
    if (this.stats.recentErrors.length > 3) {
      recommendations.push('Multiple recent errors detected - check service configuration');
    }
    
    if (vectorIndex.recommendations.length > 0) {
      recommendations.push(...vectorIndex.recommendations);
    }

    return {
      seeding: this.getSeedingStats(),
      progress: this.getSeedingProgress(),
      vectorIndex,
      recommendations
    };
  }

  /**
   * Reset recent errors (useful after fixing issues)
   */
  resetErrors(): void {
    this.stats.recentErrors = [];
    this.updateHealthStatus();
    console.log('✅ Recent errors cleared');
  }
}

// Export singleton instance
export const vectorSeedingService = new VectorSeedingService();
