"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mongoDBService = exports.MongoDBService = void 0;
const mongodb_1 = require("mongodb");
const database_1 = require("@/config/database");
class MongoDBService {
    constructor() {
        this.db = null;
        this.dbPromise = null;
    }
    async ensureConnected() {
        if (this.db)
            return this.db;
        if (!this.dbPromise) {
            this.dbPromise = (0, database_1.connectToMongoDB)();
        }
        this.db = await this.dbPromise;
        return this.db;
    }
    /**
     * Get a tool by ID
     */
    async getToolById(id) {
        const db = await this.ensureConnected();
        try {
            const collection = db.collection("tools");
            // Attempt lookup by ObjectId when valid, otherwise fallback to string _id
            if (mongodb_1.ObjectId.isValid(id)) {
                return await collection.findOne({ _id: new mongodb_1.ObjectId(id) });
            }
            // Fallback: try matching string-based _id documents (cast to any to satisfy TS types)
            const query = { _id: id };
            return await collection.findOne(query);
        }
        catch (error) {
            console.error("Error getting tool by ID:", error);
            throw error;
        }
    }
    /**
     * Get tools by IDs
     */
    async getToolsByIds(ids) {
        const db = await this.ensureConnected();
        try {
            const collection = db.collection("tools");
            console.log(`🗄️ MongoDB getToolsByIds called with ${ids.length} IDs:`);
            // Split into valid ObjectId strings and non-ObjectId strings
            const validObjectIdStrings = ids.filter(id => mongodb_1.ObjectId.isValid(id));
            const stringIds = ids.filter(id => !mongodb_1.ObjectId.isValid(id));
            console.log(`🗄️ Valid ObjectId strings: ${validObjectIdStrings.length}`);
            console.log(`🗄️ String IDs: ${stringIds.length}`);
            const objectIds = validObjectIdStrings.map(id => new mongodb_1.ObjectId(id));
            console.log(`🗄️ ObjectIds: ${objectIds.length}`);
            // Build query to match both ObjectId and string _id documents
            let query = {};
            if (objectIds.length > 0 && stringIds.length > 0) {
                query = { $or: [{ _id: { $in: objectIds } }, { _id: { $in: stringIds } }] };
            }
            else if (objectIds.length > 0) {
                query = { _id: { $in: objectIds } };
            }
            else if (stringIds.length > 0) {
                query = { _id: { $in: stringIds } };
            }
            else {
                return [];
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
            return results;
        }
        catch (error) {
            console.error("Error getting tools by IDs:", error);
            throw error;
        }
    }
    /**
     * Get tools by name (exact match)
     */
    async getToolsByName(names) {
        const db = await this.ensureConnected();
        try {
            const collection = db.collection("tools");
            return await collection.find({ name: { $in: names } }).toArray();
        }
        catch (error) {
            console.error("Error getting tools by name:", error);
            throw error;
        }
    }
    /**
     * Search tools by name (partial match)
     */
    async searchToolsByName(query, limit = 10) {
        const db = await this.ensureConnected();
        try {
            const collection = db.collection("tools");
            return await collection
                .find({ name: { $regex: query, $options: "i" } })
                .limit(limit)
                .toArray();
        }
        catch (error) {
            console.error("Error searching tools by name:", error);
            throw error;
        }
    }
    /**
     * Get all tools
     */
    async getAllTools() {
        const db = await this.ensureConnected();
        try {
            const collection = db.collection("tools");
            return await collection.find({}).toArray();
        }
        catch (error) {
            console.error("Error getting all tools:", error);
            throw error;
        }
    }
    /**
     * Filter tools by criteria
     */
    async filterTools(criteria) {
        const db = await this.ensureConnected();
        try {
            const collection = db.collection("tools");
            return await collection.find(criteria).toArray();
        }
        catch (error) {
            console.error("Error filtering tools:", error);
            throw error;
        }
    }
    /**
     * Search tools with criteria (alias for filterTools)
     */
    async searchTools(criteria, limit) {
        const db = await this.ensureConnected();
        try {
            const collection = db.collection("tools");
            let query = collection.find(criteria);
            if (limit) {
                query = query.limit(limit);
            }
            return await query.toArray();
        }
        catch (error) {
            console.error("Error searching tools:", error);
            throw error;
        }
    }
    /**
     * Count tools matching criteria
     */
    async countTools(criteria) {
        const db = await this.ensureConnected();
        try {
            const collection = db.collection("tools");
            return await collection.countDocuments(criteria);
        }
        catch (error) {
            console.error("Error counting tools:", error);
            throw error;
        }
    }
    // Optional lifecycle helpers used by other parts of the codebase
    async connect() {
        await this.ensureConnected();
    }
    async ping() {
        const db = await this.ensureConnected();
        await db.admin().ping();
    }
    async disconnect() {
        await (0, database_1.disconnectFromMongoDB)();
        this.db = null;
        this.dbPromise = null;
    }
}
exports.MongoDBService = MongoDBService;
// Export singleton instance
exports.mongoDBService = new MongoDBService();
