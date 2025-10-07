import { Db, ObjectId } from "mongodb";
import { connectToMongoDB } from "@/config/database";

export class MongoDBService {
  private db: Db | null = null;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    this.db = await connectToMongoDB();
  }

  /**
   * Get a tool by ID
   */
  async getToolById(id: string): Promise<any | null> {
    if (!this.db) throw new Error("Database not connected");

    try {
      const collection = this.db.collection("tools");
      return await collection.findOne({ _id: new ObjectId(id) });
    } catch (error) {
      console.error("Error getting tool by ID:", error);
      throw error;
    }
  }

  /**
   * Get tools by IDs
   */
  async getToolsByIds(ids: string[]): Promise<any[]> {
    if (!this.db) throw new Error("Database not connected");

    try {
      const collection = this.db.collection("tools");
      const objectIds = ids.map(id => new ObjectId(id));
      return await collection.find({ _id: { $in: objectIds } }).toArray();
    } catch (error) {
      console.error("Error getting tools by IDs:", error);
      throw error;
    }
  }

  /**
   * Get tools by name (exact match)
   */
  async getToolsByName(names: string[]): Promise<any[]> {
    if (!this.db) throw new Error("Database not connected");

    try {
      const collection = this.db.collection("tools");
      return await collection.find({ name: { $in: names } }).toArray();
    } catch (error) {
      console.error("Error getting tools by name:", error);
      throw error;
    }
  }

  /**
   * Search tools by name (partial match)
   */
  async searchToolsByName(query: string, limit: number = 10): Promise<any[]> {
    if (!this.db) throw new Error("Database not connected");

    try {
      const collection = this.db.collection("tools");
      return await collection
        .find({ name: { $regex: query, $options: "i" } })
        .limit(limit)
        .toArray();
    } catch (error) {
      console.error("Error searching tools by name:", error);
      throw error;
    }
  }

  /**
   * Get all tools
   */
  async getAllTools(): Promise<any[]> {
    if (!this.db) throw new Error("Database not connected");

    try {
      const collection = this.db.collection("tools");
      return await collection.find({}).toArray();
    } catch (error) {
      console.error("Error getting all tools:", error);
      throw error;
    }
  }

  /**
   * Filter tools by criteria
   */
  async filterTools(criteria: Record<string, any>): Promise<any[]> {
    if (!this.db) throw new Error("Database not connected");

    try {
      const collection = this.db.collection("tools");
      return await collection.find(criteria).toArray();
    } catch (error) {
      console.error("Error filtering tools:", error);
      throw error;
    }
  }

  /**
   * Count tools matching criteria
   */
  async countTools(criteria: Record<string, any>): Promise<number> {
    if (!this.db) throw new Error("Database not connected");

    try {
      const collection = this.db.collection("tools");
      return await collection.countDocuments(criteria);
    } catch (error) {
      console.error("Error counting tools:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const mongoDBService = new MongoDBService();