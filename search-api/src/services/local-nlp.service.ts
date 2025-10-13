import { 
  LocalNLPConfig, 
  defaultEnhancedSearchConfig 
} from '@/config/enhanced-search-config';
import { 
  NLPResultsSchema,
  EnhancedState 
} from '@/types/enhanced-state';
import { z } from 'zod';

// Cache for NLP models and results
interface NLPModelCache {
  model: any;
  loadTime: number;
  lastUsed: number;
  size: number;
}

interface NLPResultCache {
  data: z.infer<typeof NLPResultsSchema>;
  timestamp: number;
  ttl: number;
}

// NLP processing interfaces
interface EntityExtractionResult {
  text: string;
  type: string;
  confidence: number;
  start: number;
  end: number;
}

interface IntentClassificationResult {
  label: string;
  confidence: number;
}

interface VocabularyCandidate {
  value: string;
  confidence: number;
}

class LocalNLPService {
  private config: LocalNLPConfig;
  private modelCache: Map<string, NLPModelCache> = new Map();
  private resultCache: Map<string, NLPResultCache> = new Map();
  private isInitialized = false;
  private modelLoadTime = 0;

  constructor(config?: Partial<LocalNLPConfig>) {
    this.config = {
      ...defaultEnhancedSearchConfig.localNLP,
      ...config
    };
  }

  /**
   * Initialize the local NLP service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      const startTime = Date.now();
      
      // Pre-load commonly used models if cache is enabled
      if (this.config.modelCacheEnabled) {
        await this.preloadModels();
      }
      
      this.modelLoadTime = Date.now() - startTime;
      this.isInitialized = true;
      
      console.log(`Local NLP service initialized in ${this.modelLoadTime}ms`);
    } catch (error) {
      console.error('Failed to initialize local NLP service:', error);
      
      if (!this.config.fallbackEnabled) {
        throw error;
      }
      
      console.warn('Local NLP service running in fallback mode only');
      this.isInitialized = true;
    }
  }

  /**
   * Process text with local NLP models
   */
  async processText(
    text: string, 
    options?: {
      extractEntities?: boolean;
      classifyIntent?: boolean;
      extractVocabulary?: boolean;
      state?: Partial<EnhancedState>;
    }
  ): Promise<z.infer<typeof NLPResultsSchema>> {
    const startTime = Date.now();
    
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(text, options);
      if (this.config.modelCacheEnabled) {
        const cached = this.getFromResultCache(cacheKey);
        if (cached) {
          return {
            ...cached,
            processingTime: Date.now() - startTime
          };
        }
      }

      // Initialize if not already done
      if (!this.isInitialized) {
        await this.initialize();
      }

      const results: z.infer<typeof NLPResultsSchema> = {
        entities: [],
        intent: { label: 'unknown', confidence: 0 },
        vocabularyCandidates: {},
        processingStrategy: 'local',
        processingTime: 0,
        modelUsed: 'none'
      };

      // Process with local models
      let processingSuccessful = true;
      
      try {
        // Extract entities
        if (options?.extractEntities !== false) {
          results.entities = await this.extractEntities(text);
        }

        // Classify intent
        if (options?.classifyIntent !== false) {
          results.intent = await this.classifyIntent(text);
        }

        // Extract vocabulary candidates
        if (options?.extractVocabulary !== false) {
          results.vocabularyCandidates = await this.extractVocabularyCandidates(text);
        }

        results.modelUsed = this.getPrimaryModelName();
        results.processingStrategy = 'local';
        
      } catch (error) {
        console.warn('Local NLP processing failed:', error);
        processingSuccessful = false;
        
        // Use fallback if enabled
        if (this.config.fallbackEnabled) {
          return await this.processWithFallback(text, options, startTime);
        }
        
        throw error;
      }

      // Add processing time
      results.processingTime = Date.now() - startTime;

      // Check if processing exceeded time limit
      if (results.processingTime > this.config.maxProcessingTime) {
        console.warn(`Local NLP processing exceeded time limit: ${results.processingTime}ms`);
        
        if (this.config.fallbackEnabled) {
          return await this.processWithFallback(text, options, startTime);
        }
      }

      // Cache the result
      if (this.config.modelCacheEnabled) {
        this.setResultCache(cacheKey, results);
      }

      return results;
    } catch (error) {
      console.error('Error processing text with local NLP:', error);
      
      if (this.config.fallbackEnabled) {
        return await this.processWithFallback(text, options, startTime);
      }
      
      throw error;
    }
  }

  /**
   * Extract entities from text using local NER model
   */
  private async extractEntities(text: string): Promise<EntityExtractionResult[]> {
    try {
      const nerModel = await this.getNERModel();
      
      if (!nerModel) {
        throw new Error('NER model not available');
      }

      // Process text with NER model
      // This would use transformers.js or similar library
      const entities: EntityExtractionResult[] = [];
      
      // Mock implementation - replace with actual model inference
      const mockEntities = this.performMockEntityExtraction(text);
      
      for (const entity of mockEntities) {
        if (entity.confidence >= this.config.confidenceThreshold) {
          entities.push(entity);
        }
      }

      return entities;
    } catch (error) {
      console.error('Error extracting entities:', error);
      return [];
    }
  }

  /**
   * Classify intent using local classification model
   */
  private async classifyIntent(text: string): Promise<IntentClassificationResult> {
    try {
      const classificationModel = await this.getClassificationModel();
      
      if (!classificationModel) {
        throw new Error('Classification model not available');
      }

      // Process text with classification model
      // This would use transformers.js or similar library
      
      // Mock implementation - replace with actual model inference
      const mockIntent = this.performMockIntentClassification(text);
      
      return mockIntent;
    } catch (error) {
      console.error('Error classifying intent:', error);
      return { label: 'unknown', confidence: 0 };
    }
  }

  /**
   * Extract vocabulary candidates from text
   */
  private async extractVocabularyCandidates(text: string): Promise<Record<string, VocabularyCandidate[]>> {
    try {
      const candidates: Record<string, VocabularyCandidate[]> = {};
      
      // Extract various types of vocabulary candidates
      candidates.categories = this.extractCategoryCandidates(text);
      candidates.interfaces = this.extractInterfaceCandidates(text);
      candidates.pricing = this.extractPricingCandidates(text);
      candidates.functionality = this.extractFunctionalityCandidates(text);
      
      return candidates;
    } catch (error) {
      console.error('Error extracting vocabulary candidates:', error);
      return {};
    }
  }

  /**
   * Process with fallback strategy
   */
  private async processWithFallback(
    text: string, 
    options?: any, 
    startTime?: number
  ): Promise<z.infer<typeof NLPResultsSchema>> {
    try {
      console.log('Using fallback NLP processing');
      
      // Simple rule-based fallback processing
      const entities = this.performFallbackEntityExtraction(text);
      const intent = this.performFallbackIntentClassification(text);
      const vocabularyCandidates = this.performFallbackVocabularyExtraction(text);
      
      return {
        entities,
        intent,
        vocabularyCandidates,
        processingStrategy: 'llm_fallback',
        processingTime: startTime ? Date.now() - startTime : 0,
        modelUsed: 'fallback_rules'
      };
    } catch (error) {
      console.error('Fallback processing also failed:', error);
      
      // Return minimal fallback result
      return {
        entities: [],
        intent: { label: 'unknown', confidence: 0 },
        vocabularyCandidates: {},
        processingStrategy: 'hybrid',
        processingTime: startTime ? Date.now() - startTime : 0,
        modelUsed: 'none'
      };
    }
  }

  /**
   * Get or load NER model
   */
  private async getNERModel(): Promise<any> {
    const modelName = this.config.nerModel;
    
    if (this.modelCache.has(modelName)) {
      const cached = this.modelCache.get(modelName)!;
      cached.lastUsed = Date.now();
      return cached.model;
    }

    try {
      // Load model using transformers.js or similar
      // const model = await pipeline('ner', modelName);
      const model = null; // Placeholder
      
      if (this.config.modelCacheEnabled) {
        this.modelCache.set(modelName, {
          model,
          loadTime: Date.now(),
          lastUsed: Date.now(),
          size: 1 // Mock size
        });
        
        // Manage cache size
        this.manageModelCache();
      }
      
      return model;
    } catch (error) {
      console.error(`Failed to load NER model ${modelName}:`, error);
      return null;
    }
  }

  /**
   * Get or load classification model
   */
  private async getClassificationModel(): Promise<any> {
    const modelName = this.config.classificationModel;
    
    if (this.modelCache.has(modelName)) {
      const cached = this.modelCache.get(modelName)!;
      cached.lastUsed = Date.now();
      return cached.model;
    }

    try {
      // Load model using transformers.js or similar
      // const model = await pipeline('text-classification', modelName);
      const model = null; // Placeholder
      
      if (this.config.modelCacheEnabled) {
        this.modelCache.set(modelName, {
          model,
          loadTime: Date.now(),
          lastUsed: Date.now(),
          size: 1 // Mock size
        });
        
        // Manage cache size
        this.manageModelCache();
      }
      
      return model;
    } catch (error) {
      console.error(`Failed to load classification model ${modelName}:`, error);
      return null;
    }
  }

  /**
   * Preload commonly used models
   */
  private async preloadModels(): Promise<void> {
    try {
      await Promise.all([
        this.getNERModel(),
        this.getClassificationModel()
      ]);
      console.log('NLP models preloaded successfully');
    } catch (error) {
      console.warn('Failed to preload some NLP models:', error);
    }
  }

  /**
   * Manage model cache size
   */
  private manageModelCache(): void {
    if (this.modelCache.size <= this.config.modelCacheSize) {
      return;
    }

    // Sort by last used time and remove oldest
    const sortedModels = Array.from(this.modelCache.entries())
      .sort(([, a], [, b]) => a.lastUsed - b.lastUsed);

    while (this.modelCache.size > this.config.modelCacheSize) {
      const [oldestKey] = sortedModels.shift()!;
      this.modelCache.delete(oldestKey);
    }
  }

  /**
   * Generate cache key for text and options
   */
  private generateCacheKey(text: string, options?: any): string {
    const optionsStr = options ? JSON.stringify(options) : '';
    const combined = `${text}:${optionsStr}`;
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return `nlp_${Math.abs(hash)}`;
  }

  /**
   * Get result from cache
   */
  private getFromResultCache(key: string): z.infer<typeof NLPResultsSchema> | null {
    const cached = this.resultCache.get(key);
    if (!cached) return null;

    // Check if cache is expired
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.resultCache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Set result in cache
   */
  private setResultCache(key: string, data: z.infer<typeof NLPResultsSchema>): void {
    this.resultCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: 3600 * 1000 // Default 1 hour TTL in milliseconds
    });

    // Simple cache size management
    if (this.resultCache.size > 100) {
      const firstKey = this.resultCache.keys().next().value;
      if (firstKey) {
        this.resultCache.delete(firstKey);
      }
    }
  }

  /**
   * Get primary model name
   */
  private getPrimaryModelName(): string {
    return this.config.classificationModel;
  }

  // Mock implementations - replace with actual model inference
  
  private performMockEntityExtraction(text: string): EntityExtractionResult[] {
    const entities: EntityExtractionResult[] = [];
    
    // Simple pattern matching for demo
    const patterns = [
      { type: 'technology', regex: /\b(React|Vue|Angular|Node\.js|Python|JavaScript|TypeScript)\b/gi },
      { type: 'pricing', regex: /\b(free|paid|premium|open source|commercial)\b/gi },
      { type: 'interface', regex: /\b(API|CLI|GUI|SDK|library|framework)\b/gi }
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.regex.exec(text)) !== null) {
        entities.push({
          text: match[0],
          type: pattern.type,
          confidence: 0.8,
          start: match.index,
          end: match.index + match[0].length
        });
      }
    }

    return entities;
  }

  private performMockIntentClassification(text: string): IntentClassificationResult {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('compare') || lowerText.includes('vs') || lowerText.includes('versus')) {
      return { label: 'comparison_query', confidence: 0.9 };
    }
    
    if (lowerText.includes('free') || lowerText.includes('open source')) {
      return { label: 'filter_search', confidence: 0.8 };
    }
    
    if (lowerText.includes('find') || lowerText.includes('search') || lowerText.includes('looking for')) {
      return { label: 'discovery', confidence: 0.7 };
    }
    
    return { label: 'exploration', confidence: 0.6 };
  }

  private extractCategoryCandidates(text: string): VocabularyCandidate[] {
    const categories = ['frontend', 'backend', 'database', 'devops', 'testing', 'monitoring'];
    const candidates: VocabularyCandidate[] = [];
    
    for (const category of categories) {
      if (text.toLowerCase().includes(category)) {
        candidates.push({
          value: category,
          confidence: 0.8
        });
      }
    }
    
    return candidates;
  }

  private extractInterfaceCandidates(text: string): VocabularyCandidate[] {
    const interfaces = ['API', 'CLI', 'GUI', 'SDK', 'library', 'framework'];
    const candidates: VocabularyCandidate[] = [];
    
    for (const iface of interfaces) {
      if (text.toLowerCase().includes(iface.toLowerCase())) {
        candidates.push({
          value: iface,
          confidence: 0.8
        });
      }
    }
    
    return candidates;
  }

  private extractPricingCandidates(text: string): VocabularyCandidate[] {
    const pricing = ['free', 'paid', 'premium', 'open source', 'commercial', 'freemium'];
    const candidates: VocabularyCandidate[] = [];
    
    for (const price of pricing) {
      if (text.toLowerCase().includes(price)) {
        candidates.push({
          value: price,
          confidence: 0.8
        });
      }
    }
    
    return candidates;
  }

  private extractFunctionalityCandidates(text: string): VocabularyCandidate[] {
    const functionality = ['authentication', 'authorization', 'database', 'caching', 'logging', 'monitoring'];
    const candidates: VocabularyCandidate[] = [];
    
    for (const func of functionality) {
      if (text.toLowerCase().includes(func)) {
        candidates.push({
          value: func,
          confidence: 0.7
        });
      }
    }
    
    return candidates;
  }

  private performFallbackEntityExtraction(text: string): EntityExtractionResult[] {
    // Simple rule-based entity extraction
    return this.performMockEntityExtraction(text);
  }

  private performFallbackIntentClassification(text: string): IntentClassificationResult {
    // Simple rule-based intent classification
    return this.performMockIntentClassification(text);
  }

  private performFallbackVocabularyExtraction(text: string): Record<string, VocabularyCandidate[]> {
    return {
      categories: this.extractCategoryCandidates(text),
      interfaces: this.extractInterfaceCandidates(text),
      pricing: this.extractPricingCandidates(text),
      functionality: this.extractFunctionalityCandidates(text)
    };
  }

  /**
   * Process multiple texts in batch
   */
  async processBatch(
    texts: string[],
    options?: {
      extractEntities?: boolean;
      classifyIntent?: boolean;
      extractVocabulary?: boolean;
    }
  ): Promise<z.infer<typeof NLPResultsSchema>[]> {
    if (!this.config.batchProcessingEnabled) {
      // Process individually if batch processing is disabled
      return Promise.all(
        texts.map(text => this.processText(text, options))
      );
    }

    const batchSize = Math.min(texts.length, this.config.maxBatchSize);
    const batches: string[][] = [];
    
    for (let i = 0; i < texts.length; i += batchSize) {
      batches.push(texts.slice(i, i + batchSize));
    }

    const results: z.infer<typeof NLPResultsSchema>[] = [];
    
    for (const batch of batches) {
      const batchResults = await Promise.all(
        batch.map(text => this.processText(text, options))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.modelCache.clear();
    this.resultCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    modelCache: {
      size: number;
      maxSize: number;
      models: string[];
    };
    resultCache: {
      size: number;
      hitRate: number;
    };
  } {
    return {
      modelCache: {
        size: this.modelCache.size,
        maxSize: this.config.modelCacheSize,
        models: Array.from(this.modelCache.keys())
      },
      resultCache: {
        size: this.resultCache.size,
        hitRate: 0 // Would need to implement hit tracking
      }
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<LocalNLPConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): LocalNLPConfig {
    return { ...this.config };
  }

  /**
   * Check if service is healthy
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: {
      initialized: boolean;
      modelLoadTime: number;
      cacheSize: number;
      fallbackEnabled: boolean;
    };
  }> {
    const details = {
      initialized: this.isInitialized,
      modelLoadTime: this.modelLoadTime,
      cacheSize: this.modelCache.size,
      fallbackEnabled: this.config.fallbackEnabled
    };

    if (!this.isInitialized) {
      return { status: 'unhealthy', details };
    }

    if (this.modelLoadTime > 5000 || this.modelCache.size === 0) {
      return { status: 'degraded', details };
    }

    return { status: 'healthy', details };
  }
}

// Export singleton instance
export const localNLPService = new LocalNLPService();
