/**
 * Test Database Setup Utilities
 *
 * Provides native driver connection for tests using MongoMemoryServer.
 * Replaces Mongoose-based test setup.
 */

import { MongoClient, Db, Collection, Document } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ITool, CreateToolData, createDefaultSyncMetadata } from '../../types/tool.interfaces.js';

let mongoServer: MongoMemoryServer | null = null;
let mongoClient: MongoClient | null = null;
let db: Db | null = null;

/**
 * Initialize MongoMemoryServer and connect native driver
 */
export async function setupTestDatabase(): Promise<{ client: MongoClient; db: Db; uri: string }> {
  if (mongoServer && mongoClient && db) {
    return { client: mongoClient, db, uri: mongoServer.getUri() };
  }

  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  // Set environment variable for services that read from it
  process.env.MONGODB_URI = uri;

  mongoClient = new MongoClient(uri);
  await mongoClient.connect();
  db = mongoClient.db();

  return { client: mongoClient, db, uri };
}

/**
 * Teardown test database connection
 */
export async function teardownTestDatabase(): Promise<void> {
  if (mongoClient) {
    await mongoClient.close();
    mongoClient = null;
  }
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
  db = null;
}

/**
 * Get the tools collection
 */
export function getToolsCollection(): Collection<Document> {
  if (!db) {
    throw new Error('Database not initialized. Call setupTestDatabase first.');
  }
  return db.collection('tools');
}

/**
 * Clear the tools collection
 */
export async function clearToolsCollection(): Promise<void> {
  const collection = getToolsCollection();
  await collection.deleteMany({});
}

/**
 * Input type for creating test tools - more permissive than ITool
 * to allow test data from various sources (Zod schemas, etc.)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TestToolInput = Record<string, any>;

/**
 * Create a tool in the test database
 */
export async function createTestTool(toolData: TestToolInput): Promise<ITool> {
  const collection = getToolsCollection();

  const now = new Date();

  // Normalize pricing to ensure required fields
  const pricing = (toolData.pricing || [{ tier: 'Free', billingPeriod: 'Monthly', price: 0 }]).map(
    (p: { tier?: string; billingPeriod?: string; price?: number }) => ({
      tier: p.tier || 'Free',
      billingPeriod: p.billingPeriod || 'Monthly',
      price: p.price ?? 0,
    })
  );

  // Normalize syncMetadata to ensure required fields
  const syncMetadata = toolData.syncMetadata
    ? {
        ...createDefaultSyncMetadata(),
        ...toolData.syncMetadata,
        lastModifiedFields: toolData.syncMetadata.lastModifiedFields || [],
      }
    : createDefaultSyncMetadata();

  const defaultTool: CreateToolData = {
    id: toolData.id || `test-tool-${Date.now()}`,
    name: toolData.name || 'Test Tool',
    slug: toolData.slug || toolData.id || `test-tool-${Date.now()}`,
    description: toolData.description || 'A test tool for testing purposes with enough chars',
    categories: toolData.categories || ['AI', 'Development'],
    industries: toolData.industries || ['Technology', 'Software Development'],
    userTypes: toolData.userTypes || ['Developers', 'AI Engineers'],
    pricing,
    pricingModel: toolData.pricingModel || ['Free', 'Paid'],
    interface: toolData.interface || ['Web', 'API'],
    functionality: toolData.functionality || ['AI Chat', 'Code Generation'],
    deployment: toolData.deployment || ['Cloud'],
    status: toolData.status || 'active',
    contributor: toolData.contributor || 'user_test123',
    dateAdded: toolData.dateAdded || now,
    approvalStatus: toolData.approvalStatus || 'approved',
    syncMetadata,
  };

  // Build the final tool object using the normalized defaults
  const toolToInsert = {
    ...defaultTool,
    lastUpdated: now,
  };

  await collection.insertOne(toolToInsert);
  return toolToInsert as ITool;
}

/**
 * Create multiple tools in the test database
 */
export async function createTestTools(tools: Partial<ITool>[]): Promise<ITool[]> {
  const results: ITool[] = [];
  for (const tool of tools) {
    const created = await createTestTool(tool);
    results.push(created);
  }
  return results;
}

/**
 * Find a tool by ID or slug in test database
 */
export async function findTestTool(idOrSlug: string): Promise<ITool | null> {
  const collection = getToolsCollection();
  const tool = await collection.findOne({
    $or: [{ id: idOrSlug }, { slug: idOrSlug }],
  });
  return tool as ITool | null;
}

/**
 * Get the raw database instance for custom queries
 */
export function getTestDb(): Db {
  if (!db) {
    throw new Error('Database not initialized. Call setupTestDatabase first.');
  }
  return db;
}
