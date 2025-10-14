import { qdrantService } from '../../src/services/qdrant.service';
import { contextEnrichmentService } from '../../src/services/context-enrichment.service';
import { multiVectorSearchService } from '../../src/services/multi-vector-search.service';

/**
 * Initialize services for debug scripts
 * This ensures all services are properly initialized before use
 */
export async function initializeDebugServices(): Promise<void> {
  console.log('🔧 Initializing services for debug script...');
  
  try {
    // Wait for Qdrant service to be ready
    console.log('  - Waiting for Qdrant service...');
    let retries = 0;
    const maxRetries = 30; // 30 seconds max wait
    
    while (retries < maxRetries) {
      try {
        await qdrantService.healthCheck();
        console.log('  ✅ Qdrant service is ready');
        break;
      } catch (error) {
        retries++;
        if (retries >= maxRetries) {
          throw new Error(`Qdrant service not ready after ${maxRetries} seconds. Please ensure Qdrant is running.`);
        }
        // Wait 1 second before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Initialize context enrichment service if needed
    try {
      await contextEnrichmentService.initialize();
      console.log('  ✅ Context enrichment service initialized');
    } catch (error) {
      console.log('  ⚠️  Context enrichment service initialization failed (may not be needed for this script)');
    }
    
    // Initialize multi-vector search service if needed
    try {
      await multiVectorSearchService.initialize();
      console.log('  ✅ Multi-vector search service initialized');
    } catch (error) {
      console.log('  ⚠️  Multi-vector search service initialization failed (may not be needed for this script)');
    }
    
    console.log('✅ All services initialized successfully\n');
    
  } catch (error) {
    console.error('❌ Failed to initialize services:', error);
    throw error;
  }
}

/**
 * Validate environment variables for debug scripts
 */
export function validateEnvironment(requiredVars: string[]): void {
  const missing: string[] = [];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(varName => console.error(`  - ${varName}`));
    console.error('\nPlease check your .env file and ensure all required variables are set.');
    process.exit(1);
  }
  
  console.log('✅ Environment validation passed');
}