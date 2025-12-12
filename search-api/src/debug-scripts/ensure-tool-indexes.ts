#!/usr/bin/env npx tsx
/**
 * Tool Index Migration Script
 *
 * This script ensures all required indexes exist on the 'tools' collection
 * using the MongoDB native driver. It's idempotent - safe to run multiple times.
 *
 * Run with: npx tsx src/debug-scripts/ensure-tool-indexes.ts
 */

import { Db, MongoClient, IndexDescription } from 'mongodb';
import dotenv from 'dotenv';
import { CONFIG } from '#config/env.config.js';

dotenv.config();

// ============================================
// INDEX DEFINITIONS
// Ported from src/models/tool.model.ts
// ============================================

interface IndexDefinition {
  key: Record<string, 1 | -1 | 'text'>;
  options: {
    name: string;
    unique?: boolean;
    weights?: Record<string, number>;
    background?: boolean;
  };
}

const TOOL_INDEXES: IndexDefinition[] = [
  // Unique identifiers
  { key: { id: 1 }, options: { name: 'tool_id_index', unique: true } },
  { key: { slug: 1 }, options: { name: 'tool_slug_index', unique: true } },

  // Status and filter indexes
  { key: { status: 1 }, options: { name: 'tool_status_index' } },
  { key: { categories: 1 }, options: { name: 'tool_categories_index' } },
  { key: { industries: 1 }, options: { name: 'tool_industries_index' } },
  { key: { userTypes: 1 }, options: { name: 'tool_user_types_index' } },
  { key: { functionality: 1 }, options: { name: 'tool_functionality_index' } },
  { key: { deployment: 1 }, options: { name: 'tool_deployment_index' } },
  { key: { dateAdded: -1 }, options: { name: 'tool_date_added_index' } },

  // Text search index
  {
    key: {
      name: 'text' as const,
      description: 'text' as const,
      longDescription: 'text' as const,
      tagline: 'text' as const,
    },
    options: {
      name: 'tool_v2_search_index',
      weights: {
        name: 15,
        tagline: 12,
        description: 8,
      },
    },
  },

  // RBAC indexes
  { key: { approvalStatus: 1 }, options: { name: 'tool_approval_status_index' } },
  { key: { contributor: 1 }, options: { name: 'tool_contributor_index' } },
  {
    key: { approvalStatus: 1, contributor: 1 },
    options: { name: 'tool_approval_contributor_index' },
  },

  // Sync metadata indexes
  {
    key: { 'syncMetadata.overallStatus': 1 },
    options: { name: 'tool_sync_overall_status_index' },
  },
  {
    key: { 'syncMetadata.collections.tools.status': 1 },
    options: { name: 'tool_sync_tools_status_index' },
  },
  {
    key: { 'syncMetadata.collections.functionality.status': 1 },
    options: { name: 'tool_sync_functionality_status_index' },
  },
  {
    key: { 'syncMetadata.collections.usecases.status': 1 },
    options: { name: 'tool_sync_usecases_status_index' },
  },
  {
    key: { 'syncMetadata.collections.interface.status': 1 },
    options: { name: 'tool_sync_interface_status_index' },
  },

  // Compound index for worker queries (find failed/pending with retry count)
  {
    key: {
      'syncMetadata.overallStatus': 1,
      'syncMetadata.collections.tools.retryCount': 1,
      'syncMetadata.collections.tools.lastSyncAttemptAt': 1,
    },
    options: { name: 'tool_sync_worker_query_index' },
  },

  // Last sync attempt for rate limiting / backoff calculations
  {
    key: { 'syncMetadata.collections.tools.lastSyncAttemptAt': 1 },
    options: { name: 'tool_sync_last_attempt_index' },
  },
];

// ============================================
// MAIN FUNCTIONS
// ============================================

async function ensureToolIndexes(db: Db): Promise<void> {
  const collection = db.collection('tools');
  const existingIndexes = await collection.listIndexes().toArray();
  const existingIndexNames = new Set(existingIndexes.map((idx) => idx.name));

  console.log('\n📊 Current indexes on tools collection:');
  existingIndexes.forEach((idx) => {
    console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
  });

  console.log('\n🔧 Ensuring required indexes...\n');

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const index of TOOL_INDEXES) {
    const indexName = index.options.name;

    if (existingIndexNames.has(indexName)) {
      console.log(`  ✓ ${indexName} (already exists)`);
      skipped++;
      continue;
    }

    try {
      await collection.createIndex(index.key as IndexDescription['key'], {
        name: index.options.name,
        unique: index.options.unique,
        weights: index.options.weights,
        background: true,
      });
      console.log(`  ✅ ${indexName} (created)`);
      created++;
    } catch (error: unknown) {
      const err = error as { code?: number; message?: string };
      if (err.code === 85) {
        // Index exists with different options
        console.log(`  ⚠️ ${indexName} (exists with different options, skipping)`);
        skipped++;
      } else if (err.code === 86) {
        // Index exists with different key
        console.log(`  ⚠️ ${indexName} (index exists with different key, skipping)`);
        skipped++;
      } else {
        console.error(`  ❌ ${indexName} (error: ${err.message})`);
        errors++;
      }
    }
  }

  console.log('\n📈 Summary:');
  console.log(`  Created: ${created}`);
  console.log(`  Skipped (already exist): ${skipped}`);
  console.log(`  Errors: ${errors}`);
}

async function listAllIndexes(db: Db): Promise<void> {
  const collection = db.collection('tools');
  const indexes = await collection.listIndexes().toArray();

  console.log('\n📋 All indexes on tools collection:\n');
  indexes.forEach((idx, i) => {
    console.log(`${i + 1}. ${idx.name}`);
    console.log(`   Key: ${JSON.stringify(idx.key)}`);
    if (idx.unique) console.log(`   Unique: true`);
    if (idx.weights) console.log(`   Weights: ${JSON.stringify(idx.weights)}`);
    console.log('');
  });
}

async function dropIndex(db: Db, indexName: string): Promise<void> {
  const collection = db.collection('tools');
  try {
    await collection.dropIndex(indexName);
    console.log(`✅ Dropped index: ${indexName}`);
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error(`❌ Failed to drop index ${indexName}: ${err.message}`);
  }
}

// ============================================
// MAIN EXECUTION
// ============================================

async function main(): Promise<void> {
  const mongoUri = CONFIG.database.MONGODB_URI;
  const dbName = CONFIG.database.MONGODB_DB_NAME;

  console.log('🔌 Connecting to MongoDB...');
  console.log(`   URI: ${mongoUri.replace(/\/\/.*:.*@/, '//<credentials>@')}`);
  console.log(`   Database: ${dbName}`);

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const db = client.db(dbName);

    // Check if collection exists
    const collections = await db.listCollections({ name: 'tools' }).toArray();
    if (collections.length === 0) {
      console.log('\n⚠️ Warning: tools collection does not exist yet.');
      console.log('   Indexes will be created when the collection is first used.\n');
    }

    const args = process.argv.slice(2);
    const command = args[0] || 'ensure';

    switch (command) {
      case 'ensure':
        await ensureToolIndexes(db);
        break;
      case 'list':
        await listAllIndexes(db);
        break;
      case 'drop':
        if (!args[1]) {
          console.error('Usage: ensure-tool-indexes.ts drop <index-name>');
          process.exit(1);
        }
        await dropIndex(db, args[1]);
        break;
      default:
        console.log('Usage:');
        console.log('  ensure-tool-indexes.ts [ensure]  - Create missing indexes (default)');
        console.log('  ensure-tool-indexes.ts list      - List all indexes');
        console.log('  ensure-tool-indexes.ts drop <name> - Drop a specific index');
    }
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
