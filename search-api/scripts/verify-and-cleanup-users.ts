/**
 * Migration Script: Verify and Cleanup Users Collection
 *
 * This script verifies that the users collection is empty before Clerk migration
 * and optionally drops the collection to complete the cleanup.
 *
 * Usage:
 *   npm run verify-users         # Check if users collection exists and is empty
 *   npm run cleanup-users        # Drop the users collection (use with caution!)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { exit } from 'process';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

interface UserDocument {
  _id: mongoose.Types.ObjectId;
  email: string;
  createdAt: Date;
}

async function connectToDatabase(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI as string);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    throw error;
  }
}

async function verifyUsersCollection(): Promise<boolean> {
  try {
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    // Check if users collection exists
    const collections = await db.listCollections({ name: 'users' }).toArray();

    if (collections.length === 0) {
      console.log('✅ Users collection does not exist - migration is safe');
      return true;
    }

    // Collection exists, check if it's empty
    const usersCollection = db.collection('users');
    const userCount = await usersCollection.countDocuments();

    if (userCount === 0) {
      console.log('✅ Users collection exists but is empty - migration is safe');
      return true;
    }

    // Collection has users - show details
    console.warn(`⚠️  WARNING: Users collection contains ${userCount} user(s)`);
    console.warn('⚠️  Migration to Clerk will require data migration for these users');

    // Show sample users (first 5)
    const sampleUsers = await usersCollection
      .find({})
      .limit(5)
      .project({ email: 1, createdAt: 1 })
      .toArray() as UserDocument[];

    console.log('\nSample users:');
    sampleUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. Email: ${user.email}, Created: ${user.createdAt}`);
    });

    if (userCount > 5) {
      console.log(`  ... and ${userCount - 5} more`);
    }

    return false;
  } catch (error) {
    console.error('❌ Error verifying users collection:', error);
    throw error;
  }
}

async function dropUsersCollection(): Promise<void> {
  try {
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    // Check if collection exists
    const collections = await db.listCollections({ name: 'users' }).toArray();

    if (collections.length === 0) {
      console.log('ℹ️  Users collection does not exist - nothing to drop');
      return;
    }

    // Get user count before dropping
    const usersCollection = db.collection('users');
    const userCount = await usersCollection.countDocuments();

    if (userCount > 0) {
      console.error('❌ Cannot drop users collection - it contains data');
      console.error('❌ Please migrate or manually delete users first');
      process.exit(1);
    }

    // Drop the collection
    await db.dropCollection('users');
    console.log('✅ Users collection dropped successfully');
  } catch (error) {
    console.error('❌ Error dropping users collection:', error);
    throw error;
  }
}

async function main() {
  const command = process.argv[2];

  try {
    await connectToDatabase();

    switch (command) {
      case 'verify':
        const isSafe = await verifyUsersCollection();
        process.exit(isSafe ? 0 : 1);
        break;

      case 'cleanup':
        console.log('⚠️  Attempting to drop users collection...');
        await dropUsersCollection();
        process.exit(0);
        break;

      default:
        console.log('Usage:');
        console.log('  npm run verify-users    # Verify users collection is empty');
        console.log('  npm run cleanup-users   # Drop users collection (only if empty)');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
main();
