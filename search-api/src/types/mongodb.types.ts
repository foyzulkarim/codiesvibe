import type { Filter, Document, UpdateFilter, FindOptions } from 'mongodb';

/**
 * MongoDB filter type alias for type-safe querying
 */
export type MongoDBFilter<T extends Document = Document> = Filter<T>;

/**
 * MongoDB update operations type alias
 */
export type MongoDBUpdate<T extends Document = Document> = UpdateFilter<T>;

/**
 * MongoDB find options type alias
 */
export type MongoDBFindOptions<T extends Document = Document> = FindOptions<T>;

/**
 * Paginated query result with metadata
 */
export interface MongoDBQueryResult<T extends Document = Document> {
  results: T[];
  total: number;
  page?: number;
  limit?: number;
  hasMore?: boolean;
}

/**
 * Aggregation pipeline result
 */
export interface MongoDBPaginatedResult<T extends Document = Document> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Bulk write operation result
 */
export interface MongoDBBulkWriteResult {
  insertedCount: number;
  modifiedCount: number;
  deletedCount: number;
  upsertedCount: number;
  matchedCount: number;
}

/**
 * Common MongoDB document with standard fields
 */
export interface BaseDocument extends Document {
  _id?: string | number;
  createdAt?: Date;
  updatedAt?: Date;
}
