import { vectorIndexingService } from "./vector-indexing.service.js";
import { mongoDBService } from "./mongodb.service.js";
import { qdrantService } from "./qdrant.service.js";
import { embeddingService } from "./embedding.service.js";
import { QdrantCollectionConfigService } from "./qdrant-collection-config.service.js";
import { ContentGeneratorFactory } from "./content-generator-factory.service.js";
import { MultiCollectionOrchestrator } from "./multi-collection-orchestrator.service.js";
import { VectorTypeRegistryService } from "./vector-type-registry.service.js";

// Types for seeding progress and statistics
export interface CollectionSeedingProgress {
  collectionName: string;
  total: number;
  processed: number;
  successful: number;
  failed: number;
  currentBatch?: number;
  totalBatches?: number;
  isRunning: boolean;
  lastUpdated: Date;
  errors: Array<{
    timestamp: Date;
    message: string;
    toolId?: string;
  }>;
}

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
  collections: Record<string, CollectionSeedingProgress>;
  overallProgress: number; // 0-100
}

export interface CollectionSeedingStats {
  collectionName: string;
  totalTools: number;
  indexedTools: number;
  successRate: number;
  healthStatus: 'healthy' | 'warning' | 'error';
  lastSeedingTime?: Date;
  averageProcessingTime?: number;
  recentErrors: Array<{
    timestamp: Date;
    message: string;
    toolId?: string;
  }>;
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
  collections: Record<string, CollectionSeedingStats>;
  multiCollectionEnabled: boolean;
  activeCollections: string[];
}

export interface SeedingOptions {
  force?: boolean; // Force re-indexing even if already indexed
  batchSize?: number;
  validateAfter?: boolean; // Validate results after seeding
  onProgress?: (progress: SeedingProgress) => void; // Progress callback
  multiCollection?: boolean; // Enable multi-collection seeding (default: true)
  collections?: string[]; // Specific collections to seed (default: all enabled)
  parallelProcessing?: boolean; // Enable parallel processing (default: true)
  maxConcurrency?: number; // Maximum concurrent collections (default: 3)
}

export class VectorSeedingService {
  private progress: SeedingProgress;
  private stats: SeedingStats;
  private isSeeding = false;
  private readonly DEFAULT_BATCH_SIZE = 50;

  constructor(
    private collectionConfig: QdrantCollectionConfigService = new QdrantCollectionConfigService(),
    private contentFactory: ContentGeneratorFactory = new ContentGeneratorFactory(collectionConfig),
    private orchestrator: MultiCollectionOrchestrator = new MultiCollectionOrchestrator(collectionConfig, new VectorTypeRegistryService(collectionConfig), contentFactory)
  ) {
    // Initialize progress with multi-collection support
    this.progress = {
      total: 0,
      processed: 0,
      successful: 0,
      failed: 0,
      startTime: new Date(),
      isRunning: false,
      lastUpdated: new Date(),
      collections: {},
      overallProgress: 0
    };

    // Initialize stats with multi-collection support
    this.stats = {
      totalTools: 0,
      indexedTools: 0,
      successRate: 0,
      healthStatus: 'healthy',
      recentErrors: [],
      collections: {},
      multiCollectionEnabled: true,
      activeCollections: this.collectionConfig.getEnabledCollectionNames()
    };

    // Initialize collection-specific progress
    this.initializeCollectionProgress();

    // Initialize stats on startup
    this.initializeStats();
  }

  /**
   * Initialize collection-specific progress tracking
   */
  private initializeCollectionProgress(): void {
    const enabledCollections = this.collectionConfig.getEnabledCollectionNames();

    for (const collectionName of enabledCollections) {
      this.progress.collections[collectionName] = {
        collectionName,
        total: 0,
        processed: 0,
        successful: 0,
        failed: 0,
        isRunning: false,
        lastUpdated: new Date(),
        errors: []
      };

      this.stats.collections[collectionName] = {
        collectionName,
        totalTools: 0,
        indexedTools: 0,
        successRate: 0,
        healthStatus: 'healthy',
        recentErrors: []
      };
    }
  }

  /**
   * Initialize seeding statistics from current state
   */
  private async initializeStats(): Promise<void> {
    try {
      // Get current tool count from MongoDB
      const tools = await mongoDBService.getAllTools();
      this.stats.totalTools = tools.length;

      // Get multi-collection stats from Qdrant service
      const multiCollectionStats = await qdrantService.getMultiCollectionStats();

      // Update collection-specific stats
      let totalIndexedTools = 0;
      const enabledCollections = this.collectionConfig.getEnabledCollectionNames();

      for (const collectionName of enabledCollections) {
        const collectionStats = multiCollectionStats.collections[collectionName];
        if (collectionStats) {
          this.stats.collections[collectionName].totalTools = this.stats.totalTools;
          this.stats.collections[collectionName].indexedTools = collectionStats.pointsCount || 0;
          this.stats.collections[collectionName].successRate = this.stats.totalTools > 0
            ? (collectionStats.pointsCount / this.stats.totalTools) * 100
            : 0;

          totalIndexedTools += collectionStats.pointsCount || 0;

          // Determine collection health status
          if (this.stats.collections[collectionName].successRate >= 95) {
            this.stats.collections[collectionName].healthStatus = 'healthy';
          } else if (this.stats.collections[collectionName].successRate >= 70) {
            this.stats.collections[collectionName].healthStatus = 'warning';
          } else {
            this.stats.collections[collectionName].healthStatus = 'error';
          }
        }
      }

      // Update overall stats
      this.stats.indexedTools = totalIndexedTools;
      this.stats.multiCollectionEnabled = true;
      this.stats.activeCollections = enabledCollections;

      // Calculate overall success rate
      if (this.stats.totalTools > 0) {
        this.stats.successRate = (this.stats.indexedTools / (this.stats.totalTools * enabledCollections.length)) * 100;
      }

      // Determine overall health status
      if (this.stats.successRate >= 95) {
        this.stats.healthStatus = 'healthy';
      } else if (this.stats.successRate >= 70) {
        this.stats.healthStatus = 'warning';
      } else {
        this.stats.healthStatus = 'error';
      }

      console.log(`📊 Multi-collection seeding stats initialized:`);
      console.log(`   Total tools: ${this.stats.totalTools}`);
      console.log(`   Active collections: ${enabledCollections.join(', ')}`);
      console.log(`   Total indexed vectors: ${this.stats.indexedTools}`);
      console.log(`   Overall success rate: ${this.stats.successRate.toFixed(1)}%`);
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
    // Set default options for multi-collection
    const finalOptions: Required<SeedingOptions> = {
      force: options.force || false,
      batchSize: options.batchSize || this.DEFAULT_BATCH_SIZE,
      validateAfter: options.validateAfter !== false,
      onProgress: options.onProgress,
      multiCollection: options.multiCollection !== false, // Default to true
      collections: options.collections || this.collectionConfig.getEnabledCollectionNames(),
      parallelProcessing: options.parallelProcessing !== false, // Default to true
      maxConcurrency: options.maxConcurrency || 3
    };

    // Prevent concurrent seeding
    if (this.isSeeding && !finalOptions.force) {
      throw new Error('Seeding is already in progress. Use force option to override.');
    }

    // Validate services are available
    await this.validateServices();

    console.log(`🔧 Seeding options: ${JSON.stringify(finalOptions, null, 2)}`);

    if (finalOptions.multiCollection) {
      console.log('🚀 Starting multi-collection vector seeding process...');
      await this.seedToolsMultiCollection(finalOptions);
    } else {
      console.log('🚀 Starting single-collection vector seeding process...');
      await this.seedToolsSingleCollection(finalOptions);
    }
  }

  /**
   * Multi-collection seeding implementation
   */
  private async seedToolsMultiCollection(options: Required<SeedingOptions>): Promise<void> {
    // Reset progress
    this.resetProgress();
    this.isSeeding = true;

    // const startTime = Date.now();
    const enabledCollections = options.collections;

    try {
      // Get all tools from MongoDB
      const tools = await mongoDBService.getAllTools();
      this.progress.total = tools.length * enabledCollections.length;

      console.log(`📊 Found ${tools.length} tools in MongoDB`);
      console.log(`🎯 Target collections: ${enabledCollections.join(', ')}`);

      if (tools.length === 0) {
        console.log('ℹ️ No tools found in database');
        this.updateProgressCallback(options);
        return;
      }

      // Initialize collection progress
      for (const collectionName of enabledCollections) {
        this.progress.collections[collectionName].total = tools.length;
        this.progress.collections[collectionName].isRunning = true;
      }

      // Handle force re-indexing
      if (options.force) {
        console.log('🔄 Force re-indexing enabled - clearing existing vectors...');
        await this.clearExistingMultiCollectionVectors(enabledCollections);
      } else {
        // Check if collections need re-indexing
        const needsReindexing = await this.checkCollectionsNeedReindexing(enabledCollections, tools.length);
        if (!needsReindexing) {
          console.log(`✅ All ${enabledCollections.length} collections are already indexed. Use force option to re-index.`);
          this.progress.isRunning = false;
          this.updateProgressCallback(options);
          return;
        }
      }

      // Use Multi-Collection Vector Indexing Service
      console.log(`📋 Processing in ${Math.ceil(tools.length / options.batchSize)} batches of ${options.batchSize} tools each`);

      if (options.parallelProcessing) {
        console.log(`🔄 Using parallel processing with max concurrency: ${options.maxConcurrency}`);
        await this.monitorMultiCollectionIndexingProgressParallel(tools, options);
      } else {
        console.log('🔄 Using sequential processing');
        await this.monitorMultiCollectionIndexingProgressSequential(tools, options);
      }

      // // Update stats after seeding
      // const endTime = Date.now();
      // await this.updateMultiCollectionStats(endTime - startTime);

      // // Validate results if requested
      // if (options.validateAfter) {
      //   console.log('🔍 Validating multi-collection seeding results...');
      //   await this.validateMultiCollectionSeeding();
      // }

      // Final summary
      this.logMultiCollectionSeedingSummary();

    } catch (error) {
      console.error('💥 Critical error during multi-collection seeding:', error);
      this.addErrorToStats('Critical multi-collection seeding error', error);
      throw error;
    } finally {
      this.finalizeSeeding(options);
    }
  }

  /**
   * Single-collection seeding implementation (backward compatibility)
   */
  private async seedToolsSingleCollection(options: Required<SeedingOptions>): Promise<void> {
    // Reset progress
    this.resetProgress();
    this.isSeeding = true;

    const startTime = Date.now();

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
      console.log(`📋 Processing in ${Math.ceil(this.progress.total / options.batchSize)} batches of ${options.batchSize} tools each`);

      // Monitor progress during indexing
      await this.monitorIndexingProgress(options.batchSize, options);

      // Update stats after seeding
      const endTime = Date.now();
      this.stats.averageProcessingTime = (endTime - startTime) / this.progress.total;
      this.stats.lastSeedingTime = new Date();
      this.stats.indexedTools = this.progress.successful;
      this.stats.successRate = (this.progress.successful / this.progress.total) * 100;

      // Validate results if requested
      if (options.validateAfter) {
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
      this.finalizeSeeding(options);
    }
  }

  /**
   * Monitor progress during indexing
   */
  private async monitorIndexingProgress(batchSize: number, options: Required<SeedingOptions>): Promise<void> {
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
   * Validate multi-collection seeding
   */
  async validateMultiCollectionSeeding(): Promise<boolean> {
    console.log('🔍 Starting multi-collection seeding validation...');

    try {
      // Use VectorIndexingService multi-collection validation
      const healthReport = await vectorIndexingService.validateMultiCollectionIndex();

      const isValid =
        healthReport.collectionHealthy &&
        healthReport.sampleValidationPassed &&
        healthReport.missingVectors === 0;

      if (isValid) {
        console.log('✅ Multi-collection seeding validation passed - all collections are properly indexed');
        console.log(`📊 Collection summary:`);

        if (healthReport.collections) {
          for (const [collectionName, collectionData] of Object.entries(healthReport.collections)) {
            console.log(`  ${collectionName}: ${collectionData.vectorCount} indexed, health status: ${collectionData.status}`);
          }
        }
      } else {
        console.log('❌ Multi-collection seeding validation failed - issues detected:');
        healthReport.recommendations.forEach(rec => console.log(`  • ${rec}`));

        console.log('\n📊 Collection-specific issues:');
        if (healthReport.collections) {
          for (const [collectionName, collectionData] of Object.entries(healthReport.collections)) {
            if (collectionData.status !== 'healthy') {
              console.log(`  ${collectionName}: ${healthReport.missingVectors} missing vectors, status: ${collectionData.status}`);
            }
          }
        }
      }

      return isValid;
    } catch (error) {
      console.error('💥 Error during multi-collection seeding validation:', error);
      this.addErrorToStats('Multi-collection validation error', error);
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
  private addErrorToStats(message: string, error: unknown): void {
    const errorEntry = {
      timestamp: new Date(),
      message,
      error: String(error)
    };

    this.stats.recentErrors.push(errorEntry as { timestamp: Date; message: string; error: string });

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
  private updateProgressCallback(options: Required<SeedingOptions>): void {
    // Calculate overall progress
    this.calculateOverallProgress();

    if (options.onProgress) {
      try {
        options.onProgress({ ...this.progress });
      } catch (error) {
        console.error('❌ Error in progress callback:', error);
      }
    }
  }

  /**
   * Calculate overall progress across all collections
   */
  private calculateOverallProgress(): void {
    const collections = Object.values(this.progress.collections);
    if (collections.length === 0) {
      this.progress.overallProgress = 0;
      return;
    }

    const totalOperations = collections.reduce((sum, coll) => sum + coll.total, 0);
    const completedOperations = collections.reduce((sum, coll) => sum + coll.processed, 0);

    this.progress.processed = completedOperations;
    this.progress.successful = collections.reduce((sum, coll) => sum + coll.successful, 0);
    this.progress.failed = collections.reduce((sum, coll) => sum + coll.failed, 0);

    this.progress.overallProgress = totalOperations > 0
      ? Math.round((completedOperations / totalOperations) * 100)
      : 0;
  }

  /**
   * Reset progress tracking
   */
  private resetProgress(): void {
    this.progress = {
      total: 0,
      processed: 0,
      successful: 0,
      failed: 0,
      startTime: new Date(),
      isRunning: true,
      lastUpdated: new Date(),
      collections: {},
      overallProgress: 0
    };

    // Reset collection progress
    const enabledCollections = this.collectionConfig.getEnabledCollectionNames();
    for (const collectionName of enabledCollections) {
      this.progress.collections[collectionName] = {
        collectionName,
        total: 0,
        processed: 0,
        successful: 0,
        failed: 0,
        isRunning: false,
        lastUpdated: new Date(),
        errors: []
      };
    }
  }

  /**
   * Clear existing multi-collection vectors
   */
  private async clearExistingMultiCollectionVectors(collections: string[]): Promise<void> {
    try {
      console.log(`🗑️ Clearing existing vectors from ${collections.length} collections...`);

      // Use Qdrant service to clear multiple collections
      await qdrantService.clearMultiCollections(collections);

      console.log('✅ Successfully cleared all existing multi-collection vectors');
    } catch (error) {
      console.error('❌ Error clearing existing multi-collection vectors:', error);
      this.addErrorToStats('Failed to clear multi-collection vectors', error);
      throw error;
    }
  }

  /**
   * Check if collections need re-indexing
   */
  private async checkCollectionsNeedReindexing(collections: string[], toolCount: number): Promise<boolean> {
    try {
      const multiCollectionStats = await qdrantService.getMultiCollectionStats();

      for (const collectionName of collections) {
        const collectionStats = multiCollectionStats.collections[collectionName];
        if (!collectionStats || collectionStats.pointsCount < toolCount) {
          console.log(`🔄 Collection ${collectionName} needs re-indexing: ${collectionStats?.pointsCount || 0}/${toolCount} vectors`);
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('❌ Error checking collection re-indexing status:', error);
      return true; // Default to re-indexing on error
    }
  }

  /**
   * Monitor multi-collection indexing progress with parallel processing
   */
  private async monitorMultiCollectionIndexingProgressParallel(
    _tools: unknown[],
    options: Required<SeedingOptions>
  ): Promise<void> {
    // Set up progress monitoring interval
    const progressInterval = setInterval(() => {
      if (this.progress.isRunning) {
        this.updateProgressCallback(options);
      }
    }, 2000); // Update every 2 seconds

    try {
      // Start multi-collection indexing with parallel processing
      await vectorIndexingService.indexAllToolsMultiCollection(options.batchSize);

      // Get final stats from the indexing service
      const healthReport = await vectorIndexingService.validateMultiCollectionIndex();

      // Update collection-specific progress
      for (const collectionName of options.collections) {
        const collectionHealthy = healthReport.collectionHealthy[collectionName];
        if (collectionHealthy) {
          this.progress.collections[collectionName].successful = collectionHealthy.indexedCount;
          this.progress.collections[collectionName].failed = collectionHealthy.errorCount;
          this.progress.collections[collectionName].processed = collectionHealthy.indexedCount + collectionHealthy.errorCount;
        }
      }
    } finally {
      clearInterval(progressInterval);
    }
  }

  /**
   * Monitor multi-collection indexing progress with sequential processing
   */
  private async monitorMultiCollectionIndexingProgressSequential(
    _tools: unknown[],
    options: Required<SeedingOptions>
  ): Promise<void> {
    // Set up progress monitoring interval
    const progressInterval = setInterval(() => {
      if (this.progress.isRunning) {
        this.updateProgressCallback(options);
      }
    }, 2000); // Update every 2 seconds

    try {
      // Process collections sequentially
      for (const collectionName of options.collections) {
        console.log(`🔄 Processing collection: ${collectionName}`);
        this.progress.collections[collectionName].isRunning = true;

        // Index tools for this specific collection
        await vectorIndexingService.indexAllToolsMultiCollection(options.batchSize);
      }

      // Get final stats from the indexing service
      const healthReport = await vectorIndexingService.validateMultiCollectionIndex();

      // Update collection-specific progress
      for (const collectionName of options.collections) {
        const collectionHealthy = healthReport.collectionHealthy[collectionName];
        if (collectionHealthy) {
          this.progress.collections[collectionName].successful = collectionHealthy.indexedCount;
          this.progress.collections[collectionName].failed = collectionHealthy.errorCount;
          this.progress.collections[collectionName].processed = collectionHealthy.indexedCount + collectionHealthy.errorCount;
          this.progress.collections[collectionName].isRunning = false;
        }
      }
    } finally {
      clearInterval(progressInterval);
    }
  }

  /**
   * Update multi-collection statistics
   */
  private async updateMultiCollectionStats(totalProcessingTime: number): Promise<void> {
    try {
      const multiCollectionStats = await qdrantService.getMultiCollectionStats();
      const enabledCollections = this.collectionConfig.getEnabledCollectionNames();

      let totalIndexedTools = 0;
      let totalOperations = 0;

      for (const collectionName of enabledCollections) {
        const collectionStats = multiCollectionStats.collections[collectionName];
        if (collectionStats) {
          this.stats.collections[collectionName].indexedTools = collectionStats.pointsCount || 0;
          this.stats.collections[collectionName].successRate = this.stats.totalTools > 0
            ? (collectionStats.pointsCount / this.stats.totalTools) * 100
            : 0;

          totalIndexedTools += collectionStats.pointsCount || 0;
          totalOperations += this.stats.totalTools;
        }
      }

      // Update overall stats
      this.stats.indexedTools = totalIndexedTools;
      this.stats.successRate = totalOperations > 0 ? (totalIndexedTools / totalOperations) * 100 : 0;
      this.stats.averageProcessingTime = totalProcessingTime / totalOperations;
      this.stats.lastSeedingTime = new Date();
      this.stats.multiCollectionEnabled = true;
      this.stats.activeCollections = enabledCollections;

      // Update collection health status
      this.updateCollectionHealthStatus();

    } catch (error) {
      console.error('❌ Error updating multi-collection stats:', error);
      this.addErrorToStats('Failed to update multi-collection stats', error);
    }
  }

  /**
   * Update collection health status
   */
  private updateCollectionHealthStatus(): void {
    for (const collectionName of Object.keys(this.stats.collections)) {
      const collectionStats = this.stats.collections[collectionName];

      if (collectionStats.successRate >= 95) {
        collectionStats.healthStatus = 'healthy';
      } else if (collectionStats.successRate >= 70) {
        collectionStats.healthStatus = 'warning';
      } else {
        collectionStats.healthStatus = 'error';
      }
    }
  }

  /**
   * Log multi-collection seeding summary
   */
  private logMultiCollectionSeedingSummary(): void {
    console.log('\n🎉 Multi-collection vector seeding completed!');
    console.log('📊 Summary:');

    for (const collectionName of Object.keys(this.progress.collections)) {
      const collectionProgress = this.progress.collections[collectionName];
      console.log(`  ${collectionName.toUpperCase()}:`);
      console.log(`    ✅ Successfully indexed: ${collectionProgress.successful}/${collectionProgress.total}`);
      console.log(`    ❌ Failed: ${collectionProgress.failed}/${collectionProgress.total}`);
      console.log(`    📈 Success rate: ${collectionProgress.total > 0 ? Math.round((collectionProgress.successful / collectionProgress.total) * 100) : 0}%`);
    }

    console.log(`\n  OVERALL:`);
    console.log(`    ✅ Successfully indexed: ${this.progress.successful}/${this.progress.total}`);
    console.log(`    ❌ Failed: ${this.progress.failed}/${this.progress.total}`);
    console.log(`    📈 Overall success rate: ${Math.round(this.stats.successRate)}%`);
    console.log(`    ⏱️  Average processing time: ${this.stats.averageProcessingTime?.toFixed(2)}ms/tool`);
    console.log(`    🎯 Active collections: ${this.stats.activeCollections.join(', ')}`);
  }

  /**
   * Finalize seeding process
   */
  private finalizeSeeding(options: Required<SeedingOptions>): void {
    this.progress.isRunning = false;
    this.isSeeding = false;
    this.progress.lastUpdated = new Date();
    this.updateHealthStatus();
    this.updateProgressCallback(options);
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
    vectorIndex: unknown;
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

    // Reset collection-specific errors
    for (const collectionName of Object.keys(this.stats.collections)) {
      this.stats.collections[collectionName].recentErrors = [];
    }

    this.updateHealthStatus();
    console.log('✅ Recent errors cleared');
  }

  /**
   * Seed specific collections only
   */
  async seedSpecificCollections(
    collections: string[],
    options: Omit<SeedingOptions, 'collections'> = {}
  ): Promise<void> {
    // Validate collections exist
    const enabledCollections = this.collectionConfig.getEnabledCollectionNames();
    const validCollections = collections.filter(coll => enabledCollections.includes(coll));

    if (validCollections.length === 0) {
      throw new Error(`No valid collections specified. Available collections: ${enabledCollections.join(', ')}`);
    }

    console.log(`🎯 Seeding specific collections: ${validCollections.join(', ')}`);

    await this.seedTools({
      ...options,
      collections: validCollections,
      multiCollection: true
    });
  }

  /**
   * Re-seed failed items across all collections
   */
  async reseedFailedItems(options: Omit<SeedingOptions, 'force'> = {}): Promise<void> {
    console.log('🔄 Re-seeding failed items...');

    // Find collections with failed items
    const collectionsWithFailures: string[] = [];
    for (const collectionName of Object.keys(this.stats.collections)) {
      if (this.stats.collections[collectionName].recentErrors.length > 0) {
        collectionsWithFailures.push(collectionName);
      }
    }

    if (collectionsWithFailures.length === 0) {
      console.log('✅ No failed items found to re-seed');
      return;
    }

    console.log(`🔄 Found failures in collections: ${collectionsWithFailures.join(', ')}`);

    await this.seedTools({
      ...options,
      collections: collectionsWithFailures,
      multiCollection: true,
      force: false // Don't clear all vectors, just re-seed failed items
    });
  }

  /**
   * Get collection-specific seeding statistics
   */
  getCollectionSeedingStats(collectionName: string): CollectionSeedingStats | null {
    return this.stats.collections[collectionName] || null;
  }

  /**
   * Get collection-specific seeding progress
   */
  getCollectionSeedingProgress(collectionName: string): CollectionSeedingProgress | null {
    return this.progress.collections[collectionName] || null;
  }

  /**
   * Check if a specific collection needs re-seeding
   */
  async checkCollectionNeedsSeeding(collectionName: string): Promise<boolean> {
    try {
      const multiCollectionStats = await qdrantService.getMultiCollectionStats();
      const collectionStats = multiCollectionStats.collections[collectionName];

      if (!collectionStats) {
        return true; // Collection doesn't exist, needs seeding
      }

      const tools = await mongoDBService.getAllTools();
      return collectionStats.pointsCount < tools.length;
    } catch (error) {
      console.error(`❌ Error checking collection ${collectionName} seeding status:`, error);
      return true; // Default to needing seeding on error
    }
  }

  /**
   * Get multi-collection configuration info
   */
  getMultiCollectionConfig(): {
    enabledCollections: string[];
    collectionConfigs: Array<{ name: string; description: string; purpose: string }>;
    multiCollectionEnabled: boolean;
  } {
    return {
      enabledCollections: this.collectionConfig.getEnabledCollectionNames(),
      collectionConfigs: this.collectionConfig.getCollections().map(coll => ({
        name: coll.name,
        description: coll.description,
        purpose: coll.purpose
      })),
      multiCollectionEnabled: this.stats.multiCollectionEnabled
    };
  }

  /**
   * Optimize seeding configuration based on system performance
   */
  async optimizeSeedingConfig(): Promise<{
    recommendedBatchSize: number;
    recommendedMaxConcurrency: number;
    recommendedParallelProcessing: boolean;
  }> {
    try {
      const tools = await mongoDBService.getAllTools();
      const toolCount = tools.length;

      // Dynamic configuration based on tool count and system performance
      let recommendedBatchSize = this.DEFAULT_BATCH_SIZE;
      let recommendedMaxConcurrency = 3;
      let recommendedParallelProcessing = true;

      if (toolCount < 100) {
        recommendedBatchSize = 10;
        recommendedMaxConcurrency = 1;
        recommendedParallelProcessing = false;
      } else if (toolCount < 1000) {
        recommendedBatchSize = 25;
        recommendedMaxConcurrency = 2;
      } else if (toolCount < 5000) {
        recommendedBatchSize = 50;
        recommendedMaxConcurrency = 3;
      } else {
        recommendedBatchSize = 100;
        recommendedMaxConcurrency = 5;
      }

      console.log(`🔧 Optimized seeding config for ${toolCount} tools:`);
      console.log(`   Batch size: ${recommendedBatchSize}`);
      console.log(`   Max concurrency: ${recommendedMaxConcurrency}`);
      console.log(`   Parallel processing: ${recommendedParallelProcessing}`);

      return {
        recommendedBatchSize,
        recommendedMaxConcurrency,
        recommendedParallelProcessing
      };
    } catch (error) {
      console.error('❌ Error optimizing seeding config:', error);
      return {
        recommendedBatchSize: this.DEFAULT_BATCH_SIZE,
        recommendedMaxConcurrency: 3,
        recommendedParallelProcessing: true
      };
    }
  }
}

// Export singleton instance
export const vectorSeedingService = new VectorSeedingService();
