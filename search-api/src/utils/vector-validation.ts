import { getSupportedVectorTypes, isSupportedVectorType } from "@/config/database";

/**
 * Validation errors for vector operations
 */
export class VectorValidationError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'VectorValidationError';
  }
}

/**
 * Validates embedding dimensions
 */
export function validateEmbedding(embedding: number[], expectedDimensions: number = 1024): void {
  if (!Array.isArray(embedding)) {
    throw new VectorValidationError('Embedding must be an array', 'INVALID_EMBEDDING_TYPE');
  }

  if (embedding.length !== expectedDimensions) {
    throw new VectorValidationError(
      `Embedding must have exactly ${expectedDimensions} dimensions, got ${embedding.length}`,
      'INVALID_EMBEDDING_DIMENSIONS'
    );
  }

  // Check if all values are numbers
  for (let i = 0; i < embedding.length; i++) {
    if (typeof embedding[i] !== 'number' || !isFinite(embedding[i])) {
      throw new VectorValidationError(
        `Embedding value at index ${i} is not a valid number: ${embedding[i]}`,
        'INVALID_EMBEDDING_VALUE'
      );
    }
  }
}

/**
 * Validates vector type
 */
export function validateVectorType(vectorType: string): void {
  if (!vectorType || typeof vectorType !== 'string') {
    throw new VectorValidationError('Vector type must be a non-empty string', 'INVALID_VECTOR_TYPE');
  }

  if (!isSupportedVectorType(vectorType)) {
    throw new VectorValidationError(
      `Unsupported vector type: ${vectorType}. Supported types: ${getSupportedVectorTypes().join(', ')}`,
      'UNSUPPORTED_VECTOR_TYPE'
    );
  }
}

/**
 * Validates multiple vectors for multi-vector operations
 */
export function validateMultiVectors(vectors: { [vectorType: string]: number[] }): void {
  if (!vectors || typeof vectors !== 'object') {
    throw new VectorValidationError('Vectors must be an object', 'INVALID_VECTORS_TYPE');
  }

  if (Object.keys(vectors).length === 0) {
    throw new VectorValidationError('At least one vector must be provided', 'EMPTY_VECTORS');
  }

  // Validate each vector
  for (const [vectorType, embedding] of Object.entries(vectors)) {
    validateVectorType(vectorType);
    validateEmbedding(embedding);
  }
}

/**
 * Validates tool ID
 */
export function validateToolId(toolId: string): void {
  if (!toolId || typeof toolId !== 'string') {
    throw new VectorValidationError('Tool ID must be a non-empty string', 'INVALID_TOOL_ID');
  }

  if (toolId.length > 255) {
    throw new VectorValidationError('Tool ID must be 255 characters or less', 'TOOL_ID_TOO_LONG');
  }
}

/**
 * Validates search limit
 */
export function validateSearchLimit(limit: number): void {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new VectorValidationError('Search limit must be a positive integer', 'INVALID_SEARCH_LIMIT');
  }

  if (limit > 1000) {
    throw new VectorValidationError('Search limit cannot exceed 1000', 'SEARCH_LIMIT_TOO_HIGH');
  }
}

/**
 * Validates payload structure
 */
export function validatePayload(payload: Record<string, any>): void {
  if (!payload || typeof payload !== 'object') {
    throw new VectorValidationError('Payload must be an object', 'INVALID_PAYLOAD_TYPE');
  }

  // Check for required fields
  if (!payload.id) {
    throw new VectorValidationError('Payload must contain an id field', 'MISSING_PAYLOAD_ID');
  }

  // Validate payload size (prevent overly large payloads)
  const payloadSize = JSON.stringify(payload).length;
  if (payloadSize > 10000) { // 10KB limit
    throw new VectorValidationError(
      `Payload size (${payloadSize} bytes) exceeds maximum allowed size (10000 bytes)`,
      'PAYLOAD_TOO_LARGE'
    );
  }
}

/**
 * Validates filter structure
 */
export function validateFilter(filter?: Record<string, any>): void {
  if (!filter) return;

  if (typeof filter !== 'object') {
    throw new VectorValidationError('Filter must be an object', 'INVALID_FILTER_TYPE');
  }

  // Basic filter structure validation
  const allowedKeys = ['must', 'must_not', 'should', 'filter', 'key', 'match', 'range', 'is_null', 'is_empty'];
  
  const validateFilterObject = (obj: any, path: string = ''): void => {
    if (!obj || typeof obj !== 'object') return;

    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (!allowedKeys.includes(key) && !key.startsWith('payload.')) {
        throw new VectorValidationError(`Invalid filter key: ${currentPath}`, 'INVALID_FILTER_KEY');
      }

      if (typeof value === 'object') {
        validateFilterObject(value, currentPath);
      }
    }
  };

  validateFilterObject(filter);
}

/**
 * Comprehensive validation for search operations
 */
export function validateSearchParams(params: {
  embedding?: number[];
  query?: string;
  vectorType?: string;
  limit?: number;
  filter?: Record<string, any>;
}): void {
  const { embedding, query, vectorType, limit, filter } = params;

  // Either embedding or query must be provided
  if (!embedding && !query) {
    throw new VectorValidationError('Either embedding or query must be provided', 'MISSING_SEARCH_INPUT');
  }

  // Validate embedding if provided
  if (embedding) {
    validateEmbedding(embedding);
  }

  // Validate query if provided
  if (query) {
    if (typeof query !== 'string' || query.trim().length === 0) {
      throw new VectorValidationError('Query must be a non-empty string', 'INVALID_QUERY');
    }
    if (query.length > 1000) {
      throw new VectorValidationError('Query length cannot exceed 1000 characters', 'QUERY_TOO_LONG');
    }
  }

  // Validate vector type if provided
  if (vectorType) {
    validateVectorType(vectorType);
  }

  // Validate limit if provided
  if (limit !== undefined) {
    validateSearchLimit(limit);
  }

  // Validate filter if provided
  if (filter) {
    validateFilter(filter);
  }
}

/**
 * Comprehensive validation for upsert operations
 */
export function validateUpsertParams(params: {
  toolId: string;
  vectors: { [vectorType: string]: number[] } | number[];
  payload: Record<string, any>;
  vectorType?: string;
}): void {
  const { toolId, vectors, payload, vectorType } = params;

  // Validate tool ID
  validateToolId(toolId);

  // Validate payload
  validatePayload(payload);

  // Validate vectors based on operation type
  if (vectorType) {
    // Single vector operation
    validateVectorType(vectorType);
    if (!Array.isArray(vectors)) {
      throw new VectorValidationError('Vectors must be an array for single vector operations', 'INVALID_VECTORS_FORMAT');
    }
    validateEmbedding(vectors);
  } else {
    // Multi-vector operation
    if (typeof vectors === 'object' && !Array.isArray(vectors)) {
      validateMultiVectors(vectors);
    } else {
      // Legacy single vector format
      validateEmbedding(vectors as number[]);
    }
  }
}

/**
 * Validates batch operations
 */
export function validateBatchOperations(operations: Array<{
  toolId: string;
  vectors: { [vectorType: string]: number[] } | number[];
  payload: Record<string, any>;
  vectorType?: string;
}>): void {
  if (!Array.isArray(operations)) {
    throw new VectorValidationError('Operations must be an array', 'INVALID_OPERATIONS_TYPE');
  }

  if (operations.length === 0) {
    throw new VectorValidationError('At least one operation must be provided', 'EMPTY_OPERATIONS');
  }

  if (operations.length > 100) {
    throw new VectorValidationError('Batch operations cannot exceed 100 items', 'BATCH_TOO_LARGE');
  }

  // Validate each operation
  for (let i = 0; i < operations.length; i++) {
    try {
      validateUpsertParams(operations[i]);
    } catch (error) {
      if (error instanceof VectorValidationError) {
        throw new VectorValidationError(
          `Validation error in operation ${i}: ${error.message}`,
          error.code
        );
      }
      throw error;
    }
  }
}
