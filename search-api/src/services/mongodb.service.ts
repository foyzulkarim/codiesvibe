import { Db, ObjectId, Document, WithId, Filter, UpdateFilter } from "mongodb";
import { connectToMongoDB, disconnectFromMongoDB } from "../config/database.js";
import {
  ITool,
  CreateToolData,
  UpdateToolData,
  createDefaultSyncMetadata,
  FindToolsOptions,
  FindToolsResult,
} from "../types/tool.interfaces.js";

export class MongoDBService {
  private db: Db | null = null;
  private dbPromise: Promise<Db> | null = null;

  constructor() {}

  private async ensureConnected(): Promise<Db> {
    if (this.db) return this.db;
    if (!this.dbPromise) {
      this.dbPromise = connectToMongoDB();
    }
    this.db = await this.dbPromise;
    return this.db;
  }

  /**
   * Get a tool by ID
   */
  async getToolById(id: string): Promise<ITool | null> {
    const db = await this.ensureConnected();

    try {
      const collection = db.collection<ITool>("tools");
      // Attempt lookup by ObjectId when valid, otherwise fallback to string _id
      if (ObjectId.isValid(id)) {
        const result = await collection.findOne({ _id: new ObjectId(id) } as Filter<ITool>);
        return result ? this.documentToTool(result) : null;
      }
      // Fallback: try matching string-based _id documents
      const query: Filter<ITool> = { _id: id } as Filter<ITool>;
      const result = await collection.findOne(query);
      return result ? this.documentToTool(result) : null;
    } catch (error) {
      console.error("Error getting tool by ID:", error);
      throw error;
    }
  }

  /**
   * Get tools by IDs
   * Only returns approved tools by default to prevent leaking unapproved tools in search results
   */
  async getToolsByIds(ids: string[], includeUnapproved: boolean = false): Promise<ITool[]> {
    const db = await this.ensureConnected();

    try {
      const collection = db.collection<ITool>("tools");
      console.log(`🗄️ MongoDB getToolsByIds called with ${ids.length} IDs:`);

      // Split into valid ObjectId strings and non-ObjectId strings
      const validObjectIdStrings = ids.filter(id => ObjectId.isValid(id));
      const stringIds = ids.filter(id => !ObjectId.isValid(id));

      console.log(`🗄️ Valid ObjectId strings: ${validObjectIdStrings.length}`);
      console.log(`🗄️ String IDs: ${stringIds.length}`);

      const objectIds = validObjectIdStrings.map(id => new ObjectId(id));

      console.log(`🗄️ ObjectIds: ${objectIds.length}`);

      // Build query to match both ObjectId and string _id documents
      let query: Filter<ITool> = {};
      if (objectIds.length > 0 && stringIds.length > 0) {
        query = { $or: [ { _id: { $in: objectIds } }, { _id: { $in: stringIds } } ] } as Filter<ITool>;
      } else if (objectIds.length > 0) {
        query = { _id: { $in: objectIds } } as Filter<ITool>;
      } else if (stringIds.length > 0) {
        query = { _id: { $in: stringIds } } as Filter<ITool>;
      } else {
        return [];
      }

      // Only return approved tools unless explicitly requested
      if (!includeUnapproved) {
        query = { ...query, approvalStatus: 'approved' } as Filter<ITool>;
      }

      console.log(`🗄️ MongoDB query:`);
      const results = await collection.find(query).toArray();
      console.log(`🗄️ MongoDB returned ${results.length} tools`);

      // Let's also check if any tools exist with similar IDs
      if (results.length === 0 && ids.length > 0) {
        const sampleId = ids[0];
        console.log(`🗄️ Checking for tools with similar ID pattern to: ${sampleId}`);
        const sampleTools = await collection.find({}).limit(3).toArray();
        console.log(`🗄️ Sample tools from DB:`, sampleTools.map(t => ({ id: t._id, name: t.name })));
      }

      return results.map((doc) => this.documentToTool(doc));
    } catch (error) {
      console.error("Error getting tools by IDs:", error);
      throw error;
    }
  }

  /**
   * Get tools by name (exact match)
   */
  async getToolsByName(names: string[]): Promise<ITool[]> {
    const db = await this.ensureConnected();

    try {
      const collection = db.collection<ITool>("tools");
      const results = await collection.find({ name: { $in: names } }).toArray();
      return results.map((doc) => this.documentToTool(doc));
    } catch (error) {
      console.error("Error getting tools by name:", error);
      throw error;
    }
  }

  /**
   * Search tools by name (partial match)
   */
  async searchToolsByName(query: string, limit: number = 10): Promise<ITool[]> {
    const db = await this.ensureConnected();

    try {
      const collection = db.collection<ITool>("tools");
      const results = await collection
        .find({ name: { $regex: query, $options: "i" } })
        .limit(limit)
        .toArray();
      return results.map((doc) => this.documentToTool(doc));
    } catch (error) {
      console.error("Error searching tools by name:", error);
      throw error;
    }
  }

  /**
   * Get all tools
   */
  async getAllTools(): Promise<ITool[]> {
    const db = await this.ensureConnected();

    try {
      const collection = db.collection<ITool>("tools");
      const results = await collection.find({}).toArray();
      return results.map((doc) => this.documentToTool(doc));
    } catch (error) {
      console.error("Error getting all tools:", error);
      throw error;
    }
  }

  /**
   * Filter tools by criteria
   */
  async filterTools(criteria: Filter<ITool>): Promise<ITool[]> {
    const db = await this.ensureConnected();

    try {
      const collection = db.collection<ITool>("tools");
      const results = await collection.find(criteria).toArray();
      return results.map((doc) => this.documentToTool(doc));
    } catch (error) {
      console.error("Error filtering tools:", error);
      throw error;
    }
  }

  /**
   * Search tools with criteria (alias for filterTools)
   * Only returns approved tools by default for public search results
   */
  async searchTools(criteria: Filter<ITool>, limit?: number, includeUnapproved: boolean = false): Promise<ITool[]> {
    const db = await this.ensureConnected();

    try {
      const collection = db.collection<ITool>("tools");

      // Only return approved tools unless explicitly requested
      const searchCriteria: Filter<ITool> = includeUnapproved
        ? criteria
        : { ...criteria, approvalStatus: 'approved' } as Filter<ITool>;

      let query = collection.find(searchCriteria);

      if (limit) {
        query = query.limit(limit);
      }

      const results = await query.toArray();
      return results.map((doc) => this.documentToTool(doc));
    } catch (error) {
      console.error("Error searching tools:", error);
      throw error;
    }
  }

  /**
   * Count tools matching criteria
   */
  async countTools(criteria: Filter<ITool>): Promise<number> {
    const db = await this.ensureConnected();

    try {
      const collection = db.collection<ITool>("tools");
      return await collection.countDocuments(criteria);
    } catch (error) {
      console.error("Error counting tools:", error);
      throw error;
    }
  }

  // Optional lifecycle helpers used by other parts of the codebase
  async connect(): Promise<void> {
    await this.ensureConnected();
  }

  async ping(): Promise<void> {
    const db = await this.ensureConnected();
    await db.admin().ping();
  }

  async disconnect(): Promise<void> {
    await disconnectFromMongoDB();
    this.db = null;
    this.dbPromise = null;
  }

  // ============================================
  // CRUD OPERATIONS (Native Driver)
  // These methods replace Mongoose model operations
  // ============================================

  /**
   * Create a new tool
   * Handles pre-save logic: slug generation, timestamps, sync metadata
   */
  async createTool(toolData: CreateToolData): Promise<ITool> {
    const db = await this.ensureConnected();
    const collection = db.collection<ITool>("tools");

    const now = new Date();

    // Handle pre-save middleware logic:
    // 1. Auto-generate slug from id if not provided
    // 2. Set timestamps
    // 3. Initialize sync metadata
    const document: Omit<ITool, '_id'> = {
      ...toolData,
      slug: toolData.slug || toolData.id,
      lastUpdated: now,
      createdAt: now,
      updatedAt: now,
      syncMetadata: toolData.syncMetadata || createDefaultSyncMetadata(),
    };

    const result = await collection.insertOne(document as ITool);
    return { ...document, _id: result.insertedId } as ITool;
  }

  /**
   * Update a tool by ID or slug
   * Returns the updated document
   */
  async updateTool(idOrSlug: string, updateData: UpdateToolData): Promise<ITool | null> {
    const db = await this.ensureConnected();
    const collection = db.collection<ITool>("tools");

    const now = new Date();

    // Build the $set update with timestamps
    const update: UpdateFilter<ITool> = {
      $set: {
        ...updateData,
        lastUpdated: now,
        updatedAt: now,
      } as Partial<ITool>,
    };

    const result = await collection.findOneAndUpdate(
      { $or: [{ id: idOrSlug }, { slug: idOrSlug }] } as Filter<ITool>,
      update,
      { returnDocument: "after" }
    );

    return result ? this.documentToTool(result) : null;
  }

  /**
   * Delete a tool by ID or slug
   */
  async deleteToolByIdOrSlug(idOrSlug: string): Promise<boolean> {
    const db = await this.ensureConnected();
    const collection = db.collection<ITool>("tools");

    const result = await collection.deleteOne({
      $or: [{ id: idOrSlug }, { slug: idOrSlug }],
    } as Filter<ITool>);

    return result.deletedCount > 0;
  }

  /**
   * Find a single tool by ID or slug
   * Optionally filter to only approved tools (for public access)
   */
  async findToolByIdOrSlug(
    idOrSlug: string,
    options?: { publicOnly?: boolean }
  ): Promise<ITool | null> {
    const db = await this.ensureConnected();
    const collection = db.collection<ITool>("tools");

    let query: Filter<ITool> = {
      $or: [{ id: idOrSlug }, { slug: idOrSlug }],
    } as Filter<ITool>;

    if (options?.publicOnly) {
      query = { ...query, approvalStatus: "approved" } as Filter<ITool>;
    }

    const result = await collection.findOne(query);
    return result ? this.documentToTool(result) : null;
  }

  /**
   * Find tools with pagination, filtering, and sorting
   * This replaces Tool.find().sort().skip().limit().lean()
   */
  async findToolsPaginated(options: FindToolsOptions): Promise<FindToolsResult> {
    const db = await this.ensureConnected();
    const collection = db.collection<ITool>("tools");

    const { filter = {}, sort = { dateAdded: -1 }, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const [documents, total] = await Promise.all([
      collection.find(filter as Filter<ITool>).sort(sort).skip(skip).limit(limit).toArray(),
      collection.countDocuments(filter as Filter<ITool>),
    ]);

    return {
      data: documents.map((d) => this.documentToTool(d)),
      total,
    };
  }

  /**
   * Update tool sync metadata
   * Used by sync services for partial updates
   */
  async updateToolSyncMetadata(
    idOrSlug: string,
    updateOps: UpdateFilter<ITool>
  ): Promise<boolean> {
    const db = await this.ensureConnected();
    const collection = db.collection<ITool>("tools");

    const result = await collection.updateOne(
      { $or: [{ id: idOrSlug }, { slug: idOrSlug }] } as Filter<ITool>,
      updateOps
    );

    return result.modifiedCount > 0;
  }

  /**
   * Check if a tool exists by ID or slug
   */
  async toolExists(idOrSlug: string): Promise<boolean> {
    const db = await this.ensureConnected();
    const collection = db.collection<ITool>("tools");

    const count = await collection.countDocuments({
      $or: [{ id: idOrSlug }, { slug: idOrSlug }],
    } as Filter<ITool>);

    return count > 0;
  }

  /**
   * Get multiple tools matching a filter (no pagination)
   * Used for admin operations and sync worker
   */
  async findTools(filter: Filter<ITool>, options?: {
    sort?: Record<string, 1 | -1>;
    limit?: number;
  }): Promise<ITool[]> {
    const db = await this.ensureConnected();
    const collection = db.collection<ITool>("tools");

    let cursor = collection.find(filter);

    if (options?.sort) {
      cursor = cursor.sort(options.sort);
    }

    if (options?.limit) {
      cursor = cursor.limit(options.limit);
    }

    const documents = await cursor.toArray();
    return documents.map((d) => this.documentToTool(d));
  }

  /**
   * Count tools matching a filter
   */
  async countToolsMatching(filter: Filter<ITool>): Promise<number> {
    const db = await this.ensureConnected();
    const collection = db.collection<ITool>("tools");
    return collection.countDocuments(filter);
  }

  /**
   * Delete multiple tools matching a filter
   * Used primarily for test cleanup
   */
  async deleteToolsMatching(filter: Filter<ITool>): Promise<number> {
    const db = await this.ensureConnected();
    const collection = db.collection<ITool>("tools");
    const result = await collection.deleteMany(filter);
    return result.deletedCount;
  }

  /**
   * Helper to convert MongoDB document to ITool
   * Ensures _id is properly typed
   */
  private documentToTool(doc: WithId<ITool> | Document): ITool {
    return {
      ...doc,
      _id: doc._id?.toString(),
    } as ITool;
  }
}

// Export singleton instance
export const mongoDBService = new MongoDBService();