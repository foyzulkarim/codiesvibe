#!/usr/bin/env node

/**
 * Multi-Vector Seeding Script for AI Search Enhancement v2.0
 * 
 * This script seeds the enhanced Qdrant collection with multi-vector embeddings
 * for all existing tools in the MongoDB database.
 * 
 * Vector Types Generated:
 * - semantic: embedding of tool description
 * - entities.categories: embedding of tool categories
 * - entities.functionality: embedding of tool functionality
 * - entities.aliases: embedding of tool aliases
 * - composites.toolType: embedding of tool type
 * 
 * Usage:
 *   cd search-api
 *   npm run seed:enhanced-vectors
 *   npx ts-node -r tsconfig-paths/register scripts/seed-enhanced-vectors.ts
 *   npx ts-node -r tsconfig-paths/register scripts/seed-enhanced-vectors.ts -- --limit=100
 *   npx ts-node -r tsconfig-paths-register scripts/seed-enhanced-vectors.ts -- --clear --verbose
 *   npx ts-node -r tsconfig-paths-register scripts/seed-enhanced-vectors.ts -- --vectorTypes=semantic,entities.categories
 * 
 * Options:
 *   --limit=N        Limit the number of tools to process (for testing)
 *   --clear          Clear existing vectors before seeding
 *   --verbose        Enable verbose logging
 *   --vectorTypes    Comma-separated list of vector types to generate
 *   --batchSize=N    Batch size for processing (default: 25)
 * 
 * Prerequisites:
 *   - MongoDB connection configured in environment
 *   - Qdrant connection configured in environment
 *   - Enhanced collection created in Qdrant
 */

import { mongoDBService } from '../src/services/mongodb.service';
import { qdrantService } from '../src/services/qdrant.service';
import { embeddingService } from '../src/services/embedding.service';
import { shouldUseEnhancedCollection } from '../src/config/database';
import { 
  isEnhancedVectorTypeSupported, 
  validateEnhancedVectors,
  getEnabledVectorTypes 
} from '../src/config/enhanced-qdrant-schema';

// Tool data interface
interface ToolData {
  _id: { $oid: string } | string;
  id?: string;
  name?: string;
  description?: string;
  longDescription?: string;
  categories?: string[];
  functionality?: string[];
  searchKeywords?: string[];
  useCases?: string[];
  technical?: {
    languages?: string[];
  };
  integrations?: string[];
  semanticTags?: string[];
  interface?: string[];
  deployment?: string[];
  [key: string]: any;
}

// Command line options
interface SeedOptions {
  limit?: number;
  clear?: boolean;
  verbose?: boolean;
  vectorTypes?: string[];
  batchSize?: number;
}

// Parse command line arguments
function parseArguments(): SeedOptions {
  const args = process.argv.slice(2);
  const options: SeedOptions = {};

  for (const arg of args) {
    if (arg.startsWith('--limit=')) {
      options.limit = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--clear') {
      options.clear = true;
    } else if (arg === '--verbose') {
      options.verbose = true;
    } else if (arg.startsWith('--vectorTypes=')) {
      options.vectorTypes = arg.split('=')[1].split(',').map(v => v.trim());
    } else if (arg.startsWith('--batchSize=')) {
      options.batchSize = parseInt(arg.split('=')[1], 10);
    }
  }

  // Set defaults
  if (!options.batchSize) {
    options.batchSize = 25;
  }

  return options;
}

/**
 * Helper function to embed arrays of strings
 * Combines array elements into a single text for embedding
 */
async function embedArray(strings: string[], weight: number = 1): Promise<number[]> {
  if (!strings || strings.length === 0) {
    throw new Error('Cannot embed empty array');
  }

  // Create weighted content by repeating strings based on weight
  const weightedContent: string[] = [];
  for (let i = 0; i < weight; i++) {
    weightedContent.push(...strings);
  }

  const combinedText = weightedContent.join(' ');
  return embeddingService.generateEmbedding(combinedText);
}

/**
 * Generate vectors for tool aliases
 * Prioritizes tool name and search keywords
 */
async function generateAliasesVector(tool: ToolData): Promise<number[]> {
  const aliases: string[] = [];

  // Add tool name with highest weight
  if (tool.name) {
    for (let i = 0; i < 5; i++) {
      aliases.push(tool.name);
    }
  }

  // Add search keywords with medium weight
  if (tool.searchKeywords && tool.searchKeywords.length > 0) {
    for (let i = 0; i < 3; i++) {
      aliases.push(...tool.searchKeywords);
    }
  }

  // Add description with low weight
  if (tool.description) {
    aliases.push(tool.description);
  }

  if (aliases.length === 0) {
    throw new Error(`No aliases data available for tool: ${tool.name || 'Unknown'}`);
  }

  return embedArray(aliases);
}

/**
 * Generate vectors for tool type
 * Combines categories, functionality, interface, and deployment info
 */
async function generateToolTypeVector(tool: ToolData): Promise<number[]> {
  const typeComponents: string[] = [];

  // Add categories with high weight
  if (tool.categories && tool.categories.length > 0) {
    for (let i = 0; i < 3; i++) {
      typeComponents.push(...tool.categories);
    }
  }

  // Add functionality with high weight
  if (tool.functionality && tool.functionality.length > 0) {
    for (let i = 0; i < 3; i++) {
      typeComponents.push(...tool.functionality);
    }
  }

  // Add interface with medium weight
  if (tool.interface && tool.interface.length > 0) {
    for (let i = 0; i < 2; i++) {
      typeComponents.push(...tool.interface);
    }
  }

  // Add deployment with medium weight
  if (tool.deployment && tool.deployment.length > 0) {
    for (let i = 0; i < 2; i++) {
      typeComponents.push(...tool.deployment);
    }
  }

  // Add name with low weight
  if (tool.name) {
    typeComponents.push(tool.name);
  }

  if (typeComponents.length === 0) {
    throw new Error(`No tool type data available for tool: ${tool.name || 'Unknown'}`);
  }

  return embedArray(typeComponents);
}

/**
 * Generate semantic vector for a tool
 * Combines description, use cases, and other semantic content
 */
async function generateSemanticVector(tool: ToolData): Promise<number[]> {
  const semanticComponents: string[] = [];

  // Add description with high weight
  if (tool.description) {
    for (let i = 0; i < 3; i++) {
      semanticComponents.push(tool.description);
    }
  }

  // Add long description if available
  if (tool.longDescription) {
    semanticComponents.push(tool.longDescription);
  }

  // Add use cases with medium weight
  if (tool.useCases && tool.useCases.length > 0) {
    for (let i = 0; i < 2; i++) {
      semanticComponents.push(...tool.useCases);
    }
  }

  // Add name with medium weight
  if (tool.name) {
    for (let i = 0; i < 2; i++) {
      semanticComponents.push(tool.name);
    }
  }

  // Add categories with low weight
  if (tool.categories && tool.categories.length > 0) {
    semanticComponents.push(...tool.categories);
  }

  // Add functionality with low weight
  if (tool.functionality && tool.functionality.length > 0) {
    semanticComponents.push(...tool.functionality);
  }

  if (semanticComponents.length === 0) {
    throw new Error(`No semantic data available for tool: ${tool.name || 'Unknown'}`);
  }

  return embedArray(semanticComponents);
}

/**
 * Generate categories vector for a tool
 */
async function generateCategoriesVector(tool: ToolData): Promise<number[]> {
  const categories = tool.categories || [];
  if (categories.length === 0) {
    throw new Error(`No categories available for tool: ${tool.name || 'Unknown'}`);
  }

  // Weight categories heavily
  return embedArray(categories, 5);
}

/**
 * Generate functionality vector for a tool
 */
async function generateFunctionalityVector(tool: ToolData): Promise<number[]> {
  const functionality = tool.functionality || [];
  if (functionality.length === 0) {
    throw new Error(`No functionality available for tool: ${tool.name || 'Unknown'}`);
  }

  // Weight functionality heavily
  return embedArray(functionality, 5);
}

/**
 * Derive a consistent tool ID string for Qdrant from MongoDB document
 */
function deriveToolId(tool: ToolData): string {
  const objId = (tool as any)._id;
  const mongoId = objId && typeof objId === 'object' && typeof objId.toString === 'function'
    ? objId.toString()
    : (typeof tool._id === 'string')
      ? tool._id
      : tool._id?.$oid;
  return mongoId || tool.id || '';
}

/**
 * Generate enhanced vectors for a single tool
 */
async function generateEnhancedVectors(tool: ToolData, vectorTypes: string[]): Promise<{ [vectorType: string]: number[] }> {
  const vectors: { [vectorType: string]: number[] } = {};

  for (const vectorType of vectorTypes) {
    try {
      switch (vectorType) {
        case 'semantic':
          vectors[vectorType] = await generateSemanticVector(tool);
          break;
        case 'entities.categories':
          vectors[vectorType] = await generateCategoriesVector(tool);
          break;
        case 'entities.functionality':
          vectors[vectorType] = await generateFunctionalityVector(tool);
          break;
        case 'entities.aliases':
          vectors[vectorType] = await generateAliasesVector(tool);
          break;
        case 'composites.toolType':
          vectors[vectorType] = await generateToolTypeVector(tool);
          break;
        default:
          throw new Error(`Unsupported vector type: ${vectorType}`);
      }
    } catch (error) {
      console.error(`Error generating ${vectorType} vector for tool ${tool.name}:`, error);
      throw error;
    }
  }

  return vectors;
}

/**
 * Create payload for enhanced vector storage
 */
function createEnhancedPayload(tool: ToolData): Record<string, any> {
  const toolId = deriveToolId(tool);
  
  return {
    id: toolId,
    name: tool.name || '',
    description: tool.description || '',
    categories: tool.categories || [],
    functionality: tool.functionality || [],
    searchKeywords: tool.searchKeywords || [],
    useCases: tool.useCases || [],
    interface: tool.interface || [],
    deployment: tool.deployment || [],
    // Include technical information if available
    ...(tool.technical?.languages ? { languages: tool.technical.languages } : {}),
    ...(tool.integrations ? { integrations: tool.integrations } : {}),
    ...(tool.semanticTags ? { semanticTags: tool.semanticTags } : {}),
    lastIndexed: new Date().toISOString(),
  };
}

/**
 * Process a single tool with enhanced vectors
 */
async function processTool(
  tool: ToolData,
  vectorTypes: string[],
  verbose: boolean = false
): Promise<{ successful: boolean; error?: string }> {
  try {
    const toolId = deriveToolId(tool);
    if (!toolId) {
      throw new Error(`Missing tool id for document: ${tool?.name || '[Unnamed tool]'}`);
    }

    if (verbose) {
      console.log(`Processing tool: ${tool.name} (${toolId})`);
    }

    // Generate all vectors for the tool
    const vectors = await generateEnhancedVectors(tool, vectorTypes);

    // Validate vectors against enhanced schema
    validateEnhancedVectors(vectors);

    // Create payload for enhanced collection
    const payload = createEnhancedPayload(tool);

    // Upsert to enhanced collection
    await qdrantService.upsertToolEnhanced(toolId, vectors, payload);

    if (verbose) {
      console.log(`✅ Successfully processed tool: ${tool.name} with ${Object.keys(vectors).length} vectors`);
    }

    return { successful: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Error processing tool ${tool?.name || '[Unnamed]'}:`, errorMessage);
    return { successful: false, error: errorMessage };
  }
}

/**
 * Process tools in batches
 */
async function processBatch(
  tools: ToolData[],
  vectorTypes: string[],
  batchSize: number,
  verbose: boolean = false
): Promise<{ successful: number; failed: number; errors: string[] }> {
  let successful = 0;
  let failed = 0;
  const errors: string[] = [];

  console.log(`Processing batch of ${tools.length} tools...`);

  // Process tools sequentially to avoid overwhelming the embedding service
  for (let i = 0; i < tools.length; i++) {
    const tool = tools[i];
    const result = await processTool(tool, vectorTypes, verbose);

    if (result.successful) {
      successful++;
    } else {
      failed++;
      if (result.error) {
        errors.push(`${tool.name || 'Unknown'}: ${result.error}`);
      }
    }

    // Log progress every 10 tools
    if ((i + 1) % 10 === 0) {
      console.log(`Progress: ${i + 1}/${tools.length} - ✅ ${successful} ❌ ${failed}`);
    }
  }

  return { successful, failed, errors };
}

/**
 * Main seeding function
 */
async function main(): Promise<void> {
  console.log('🚀 Multi-Vector Seeding Script for AI Search Enhancement v2.0');
  console.log('================================================================');

  const options = parseArguments();
  
  console.log('Configuration:');
  console.log(`  - Using enhanced collection: ${shouldUseEnhancedCollection() ? 'Yes' : 'No'}`);
  console.log(`  - Batch size: ${options.batchSize}`);
  console.log(`  - Clear existing vectors: ${options.clear ? 'Yes' : 'No'}`);
  console.log(`  - Verbose logging: ${options.verbose ? 'Yes' : 'No'}`);
  console.log(`  - Limit tools: ${options.limit || 'No limit'}`);
  
  // Determine vector types to process
  const enabledVectorTypes = getEnabledVectorTypes();
  const vectorTypes = options.vectorTypes || enabledVectorTypes;
  console.log(`  - Vector types: ${vectorTypes.join(', ')}`);
  console.log();

  try {
    // Check if enhanced collection is available
    if (!shouldUseEnhancedCollection()) {
      throw new Error('Enhanced collection is not enabled. Please set USE_ENHANCED_COLLECTION=true in environment.');
    }

    try {
      const collectionInfo = await qdrantService.getEnhancedCollectionInfo();
      console.log(`✅ Enhanced collection found with ${collectionInfo.points_count} points`);
    } catch (error) {
      console.error('❌ Enhanced collection not found. Please create the enhanced collection first.');
      process.exit(1);
    }

    // Clear existing vectors if requested
    if (options.clear) {
      console.log('🔄 Clearing existing vectors...');
      try {
        await qdrantService.clearEnhancedCollection();
        console.log('✅ Cleared enhanced collection');
      } catch (error) {
        console.warn('⚠️ Warning: Could not clear enhanced collection:', error);
      }
      console.log();
    }

    // Get all tools from MongoDB
    console.log('📊 Fetching tools from MongoDB...');
    let tools = await mongoDBService.getAllTools();
    console.log(`✅ Found ${tools.length} tools in MongoDB`);

    // Apply limit if specified
    if (options.limit && options.limit > 0) {
      tools = tools.slice(0, options.limit);
      console.log(`📊 Limited to ${tools.length} tools for processing`);
    }

    if (tools.length === 0) {
      console.log('ℹ️ No tools to process');
      return;
    }

    console.log();

    // Process tools in batches
    let totalSuccessful = 0;
    let totalFailed = 0;
    const allErrors: string[] = [];
    const totalBatches = Math.ceil(tools.length / options.batchSize!);

    console.log(`🚀 Starting processing in ${totalBatches} batches...`);
    console.log();

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const start = batchIndex * options.batchSize!;
      const end = Math.min(start + options.batchSize!, tools.length);
      const batch = tools.slice(start, end);

      console.log(`📦 Processing batch ${batchIndex + 1}/${totalBatches} (${batch.length} tools)`);

      const batchResult = await processBatch(batch, vectorTypes, options.batchSize!, options.verbose);
      
      totalSuccessful += batchResult.successful;
      totalFailed += batchResult.failed;
      allErrors.push(...batchResult.errors);

      console.log(`✅ Batch ${batchIndex + 1} completed: ${batchResult.successful} successful, ${batchResult.failed} failed`);
      
      // Log errors for this batch if any
      if (batchResult.errors.length > 0 && options.verbose) {
        console.log('Errors in this batch:');
        batchResult.errors.forEach(error => console.log(`  - ${error}`));
      }
      
      console.log();
    }

    // Final summary
    console.log('🎉 Multi-vector seeding completed!');
    console.log('================================================================');
    console.log(`📊 Summary:`);
    console.log(`  - Total tools processed: ${tools.length}`);
    console.log(`  - Successfully indexed: ${totalSuccessful}`);
    console.log(`  - Failed: ${totalFailed}`);
    console.log(`  - Success rate: ${Math.round((totalSuccessful / tools.length) * 100)}%`);

    if (allErrors.length > 0) {
      console.log();
      console.log(`⚠️ Errors encountered (${allErrors.length}):`);
      if (options.verbose) {
        allErrors.forEach(error => console.log(`  - ${error}`));
      } else {
        // Show only first 10 errors
        allErrors.slice(0, 10).forEach(error => console.log(`  - ${error}`));
        if (allErrors.length > 10) {
          console.log(`  ... and ${allErrors.length - 10} more errors (use --verbose to see all)`);
        }
      }
    }

    // Validate after seeding
    console.log();
    console.log('🔍 Validating enhanced collection...');
    try {
      const collectionInfo = await qdrantService.getEnhancedCollectionInfo();
      const expectedPoints = tools.length;
      const actualPoints = collectionInfo.points_count || 0;
      
      console.log(`📊 Expected points: ${expectedPoints}`);
      console.log(`📊 Actual points: ${actualPoints}`);
      
      if (actualPoints === expectedPoints) {
        console.log('✅ Validation passed: All tools have been indexed');
      } else {
        console.log(`⚠️ Validation warning: Point count mismatch (${actualPoints}/${expectedPoints})`);
      }
    } catch (error) {
      console.warn('⚠️ Validation failed:', error);
    }

  } catch (error) {
    console.error('💥 Critical error during seeding:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutdown requested by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutdown requested by system');
  process.exit(0);
});

// Run the main function
main().catch(error => {
  console.error('💥 Unhandled error:', error);
  process.exit(1);
});
