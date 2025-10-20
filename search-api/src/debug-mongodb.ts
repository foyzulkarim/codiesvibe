#!/usr/bin/env node

import { mongoDBService } from './services/mongodb.service';

async function debugMongoDB() {
  console.log('🔍 Debugging MongoDB connection and tools data...\n');

  try {
    // Test MongoDB connection
    console.log('📦 Testing MongoDB connection...');
    const tools = await mongoDBService.getAllTools();
    
    console.log(`✅ MongoDB connected successfully`);
    console.log(`📊 Found ${tools.length} tools in database\n`);

    if (tools.length === 0) {
      console.log('❌ No tools found in MongoDB database!');
      console.log('   This explains why seed-vectors shows 0/0 for each collection.');
      console.log('   You need to populate the MongoDB database with tools first.\n');
      return;
    }

    // Show first few tools for verification
    console.log('📋 Sample tools (first 3):');
    tools.slice(0, 3).forEach((tool, index) => {
      console.log(`   ${index + 1}. ${tool.name || '[No name]'} (ID: ${tool._id || tool.id || '[No ID]'})`);
      console.log(`      Description: ${(tool.description || '[No description]').substring(0, 100)}...`);
    });

    console.log(`\n✅ MongoDB has ${tools.length} tools available for indexing`);

  } catch (error) {
    console.error('❌ MongoDB connection or query failed:', error);
  }
}

debugMongoDB().catch(console.error);