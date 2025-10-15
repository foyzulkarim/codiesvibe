import {
  LocalNLPConfig,
  defaultEnhancedSearchConfig
} from '@/config/enhanced-search-config';
import {
  NLPResultsSchema,
  EnhancedState
} from '@/types/enhanced-state';
import { z } from 'zod';
import { pipeline, env } from '@xenova/transformers';

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
  private nerPipeline: any = null;
  private classificationPipeline: any = null;

  constructor(config?: Partial<LocalNLPConfig>) {
    this.config = {
      ...defaultEnhancedSearchConfig.localNLP,
      ...config
    };
    
    // Configure transformers.js environment
    env.localModelPath = process.env.TRANSFORMERS_CACHE || './models';
    env.allowRemoteModels = true;
    env.allowLocalModels = false;
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
      
      // Pre-load NER model if cache is enabled (classification model disabled due to transformers.js issues)
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
      const nerPipeline = await this.getNERModel();
      
      if (!nerPipeline) {
        throw new Error('NER pipeline not available');
      }

      // Process text with NER pipeline
      const startTime = Date.now();
      const nerResults = await nerPipeline(text);
      const processingTime = Date.now() - startTime;
      
      const entities: EntityExtractionResult[] = [];
      
      // Convert transformers.js output to our format
      for (const result of nerResults) {
        const entity: EntityExtractionResult = {
          text: result.word || result.text || '',
          type: this.mapEntityLabel(result.entity_group || result.entity),
          confidence: result.score || 0,
          start: result.start || 0,
          end: result.end || (result.word || result.text || '').length
        };
        
        // Filter by confidence threshold
        if (entity.confidence >= this.config.confidenceThreshold && entity.text) {
          entities.push(entity);
        }
      }

      console.log(`NER processing completed in ${processingTime}ms, found ${entities.length} entities`);
      return entities;
    } catch (error) {
      console.error('Error extracting entities:', error);
      
      // Fallback to mock extraction if transformers.js fails
      console.warn('Falling back to mock entity extraction');
      const mockEntities = this.performMockEntityExtraction(text);
      
      return mockEntities.filter(entity => entity.confidence >= this.config.confidenceThreshold);
    }
  }

  /**
   * Map transformers.js entity labels to our standard types
   */
  private mapEntityLabel(label: string): string {
    if (!label) {
      return 'miscellaneous';
    }
    
    const labelMap: Record<string, string> = {
      'PER': 'person',
      'ORG': 'organization',
      'LOC': 'location',
      'MISC': 'miscellaneous',
      'PRODUCT': 'technology',
      'EVENT': 'event',
      'WORK_OF_ART': 'technology',
      'LAW': 'technology',
      'LANGUAGE': 'technology',
      'DATE': 'miscellaneous',
      'TIME': 'miscellaneous',
      'PERCENT': 'miscellaneous',
      'MONEY': 'pricing',
      'QUANTITY': 'miscellaneous',
      'ORDINAL': 'miscellaneous',
      'CARDINAL': 'miscellaneous',
      'B-PER': 'person',
      'I-PER': 'person',
      'B-ORG': 'organization',
      'I-ORG': 'organization',
      'B-LOC': 'location',
      'I-LOC': 'location',
      'B-MISC': 'miscellaneous',
      'I-MISC': 'miscellaneous'
    };
    
    return labelMap[label] || label.toLowerCase();
  }

  /**
   * Map classification labels to our intent categories
   */
  private mapClassificationLabel(label: string): string {
    if (!label) {
      return 'unknown';
    }
    
    const lowerLabel = label.toLowerCase();
    
    // Map common classification labels to our intent categories
    if (lowerLabel.includes('positive') || lowerLabel.includes('good')) {
      return 'discovery';
    }
    
    if (lowerLabel.includes('negative') || lowerLabel.includes('bad')) {
      return 'exploration';
    }
    
    if (lowerLabel.includes('question') || lowerLabel.includes('interrogative')) {
      return 'discovery';
    }
    
    if (lowerLabel.includes('comparison') || lowerLabel.includes('contrast')) {
      return 'comparison_query';
    }
    
    if (lowerLabel.includes('request') || lowerLabel.includes('command')) {
      return 'filter_search';
    }
    
    // Default fallback based on keywords
    if (lowerLabel.includes('label') || lowerLabel.includes('category')) {
      return 'discovery';
    }
    
    return 'exploration'; // Default intent
  }

  /**
   * Classify intent using local zero-shot classification model
   */
  private async classifyIntent(text: string): Promise<IntentClassificationResult> {
    try {
      const classificationPipeline = await this.getClassificationModel();
      
      if (!classificationPipeline) {
        throw new Error('Zero-shot classification pipeline not available');
      }

      const startTime = Date.now();
      
      // Create hypothesis template that provides better context for classification
      const hypothesisTemplate = 'The user wants to {intent}.';
      
      // Use zero-shot classification with intent labels from configuration
      const result = await classificationPipeline(text, this.config.intentLabels, {
        hypothesisTemplate
      });
      
      const processingTime = Date.now() - startTime;
      
      // Handle the zero-shot classification result
      let intent: IntentClassificationResult;
      
      // Zero-shot classification typically returns an object with labels and scores arrays
      if (result && result.labels && result.scores && result.labels.length > 0) {
        // Find the index of the highest scoring label
        const maxScoreIndex = result.scores.reduce((maxIndex: number, score: number, currentIndex: number) =>
          score > result.scores[maxIndex] ? currentIndex : maxIndex, 0);
        
        intent = {
          label: result.labels[maxScoreIndex],
          confidence: result.scores[maxScoreIndex]
        };
      } else if (Array.isArray(result) && result.length > 0) {
        // Multiple results - take the highest scoring one
        const topResult = result.reduce((prev, current) =>
          (prev.score > current.score) ? prev : current
        );
        
        intent = {
          label: topResult.label,
          confidence: topResult.score
        };
      } else if (result && result.label && result.score) {
        // Single result
        intent = {
          label: result.label,
          confidence: result.score
        };
      } else {
        throw new Error(`Unexpected result structure from zero-shot classification: ${JSON.stringify(result)}`);
      }
      
      console.log(`Zero-shot intent classification completed in ${processingTime}ms: ${intent.label} (${intent.confidence.toFixed(3)})`);
      
      // Check if confidence meets threshold
      if (intent.confidence < this.config.confidenceThreshold) {
        console.warn(`Intent confidence ${intent.confidence.toFixed(3)} below threshold ${this.config.confidenceThreshold}`);
        
        // If fallback is enabled, use mock classification
        if (this.config.fallbackEnabled) {
          console.warn('Falling back to mock intent classification due to low confidence');
          return this.performMockIntentClassification(text);
        }
      }
      
      return intent;
    } catch (error) {
      console.error('Error classifying intent with zero-shot classification:', error);
      
      // Fallback to mock classification if transformers.js fails
      if (this.config.fallbackEnabled) {
        console.warn('Falling back to mock intent classification due to error');
        return this.performMockIntentClassification(text);
      }
      
      // Re-throw error if fallback is disabled
      throw error;
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
    
    // Return cached pipeline if available
    if (this.nerPipeline) {
      return this.nerPipeline;
    }

    try {
      console.log(`Loading NER model: ${modelName}`);
      const startTime = Date.now();
      
      // Load NER pipeline using transformers.js
      this.nerPipeline = await pipeline('token-classification', modelName, {
        progress_callback: (progress: any) => {
          if (progress.status === 'downloading') {
            console.log(`Downloading model: ${progress.file} ${progress.progress}%`);
          } else if (progress.status === 'loading') {
            console.log(`Loading model: ${progress.file}`);
          }
        }
      });
      
      const loadTime = Date.now() - startTime;
      console.log(`NER model loaded in ${loadTime}ms`);
      
      if (this.config.modelCacheEnabled) {
        this.modelCache.set(modelName, {
          model: this.nerPipeline,
          loadTime: Date.now(),
          lastUsed: Date.now(),
          size: 1 // Actual size estimation could be added
        });
        
        // Manage cache size
        this.manageModelCache();
      }
      
      return this.nerPipeline;
    } catch (error) {
      console.error(`Failed to load NER model ${modelName}:`, error);
      throw error;
    }
  }

  /**
   * Get or load classification model
   */
  private async getClassificationModel(): Promise<any> {
    const modelName = this.config.classificationModel;
    
    // Return cached pipeline if available
    if (this.classificationPipeline) {
      return this.classificationPipeline;
    }

    try {
      console.log(`Loading zero-shot classification model: ${modelName}`);
      const startTime = Date.now();
      
      // Use zero-shot-classification for intent detection
      this.classificationPipeline = await pipeline('zero-shot-classification', modelName, {
        progress_callback: (progress: any) => {
          if (progress.status === 'downloading') {
            console.log(`Downloading model: ${progress.file} ${progress.progress}%`);
          } else if (progress.status === 'loading') {
            console.log(`Loading model: ${progress.file}`);
          }
        }
      });
      
      const loadTime = Date.now() - startTime;
      console.log(`Zero-shot classification model loaded in ${loadTime}ms`);
      
      if (this.config.modelCacheEnabled) {
        this.modelCache.set(modelName, {
          model: this.classificationPipeline,
          loadTime: Date.now(),
          lastUsed: Date.now(),
          size: 1 // Actual size estimation could be added
        });
        
        // Manage cache size
        this.manageModelCache();
      }
      
      return this.classificationPipeline;
    } catch (error) {
      console.error(`Failed to load zero-shot classification model ${modelName}:`, error);
      throw error;
    }
  }

  /**
   * Preload commonly used models
   */
  private async preloadModels(): Promise<void> {
    try {
      console.log('Preloading NLP models...');
      const startTime = Date.now();
      
      await Promise.all([
        this.getNERModel(),
        this.getClassificationModel()
      ]);
      
      const loadTime = Date.now() - startTime;
      console.log(`NLP models preloaded successfully in ${loadTime}ms`);
    } catch (error) {
      console.warn('Failed to preload some NLP models:', error);
      
      // Don't throw error here - allow service to continue with fallback
      if (!this.config.fallbackEnabled) {
        throw error;
      }
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
