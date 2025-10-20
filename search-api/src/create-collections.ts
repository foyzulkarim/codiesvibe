#!/usr/bin/env ts-node

import 'module-alias/register';
import { QdrantClient } from "@qdrant/js-client-rest";
import { CollectionConfigService } from '@/services/collection-config.service';

async function createCollections() {
  console.log('🚀 Starting simple collection creation process...');

  try {
    // Connect to Qdrant directly
    const client = new QdrantClient({ url: 'http://localhost:6333' });
    const collectionConfig = new CollectionConfigService();

    console.log('🔧 Testing Qdrant connection...');
    await client.getCollections();
    console.log('✅ Qdrant connected successfully');

    // Get the 4 collections we need
    const enabledCollections = collectionConfig.getEnabledCollectionNames();
    console.log(`📝 Creating ${enabledCollections.length} collections: ${enabledCollections.join(', ')}`);

    const results = [];

    for (const collectionName of enabledCollections) {
      try {
        // Check if collection already exists
        try {
          await client.getCollection(collectionName);
          console.log(`✅ ${collectionName}: Collection already exists`);
          results.push({ collection: collectionName, success: true, message: 'Already exists' });
          continue;
        } catch (error) {
          // Collection doesn't exist, create it
        }

        // Create collection with standard vector configuration
        await client.createCollection(collectionName, {
          vectors: {
            size: 1024, // mxbai-embed-large dimensions
            distance: 'Cosine'
          }
        });

        console.log(`✅ ${collectionName}: Collection created successfully`);
        results.push({ collection: collectionName, success: true, message: 'Created successfully' });

      } catch (error) {
        console.log(`❌ ${collectionName}: Failed to create - ${error}`);
        results.push({ collection: collectionName, success: false, error: String(error) });
      }
    }

    // Summary
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    console.log('\n📈 Summary:');
    console.log(`Successfully created: ${successCount}/${totalCount} collections`);

    if (successCount === totalCount) {
      console.log('🎉 All collections created successfully! You can now run seed-vectors.');
    } else {
      console.log('⚠️  Some collections failed to create. Check the errors above.');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Failed to create collections:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  createCollections().catch(console.error);
}

export { createCollections };