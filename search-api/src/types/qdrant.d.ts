declare module '@qdrant/js-client-rest' {
  // Payload type definitions
  // Using `unknown` for maximum flexibility with dynamic payloads
  export type QdrantPayloadValue = unknown;

  export interface QdrantPayload {
    [key: string]: QdrantPayloadValue;
  }

  // Filter types
  export interface QdrantFilter {
    must?: QdrantCondition[];
    should?: QdrantCondition[];
    must_not?: QdrantCondition[];
  }

  export type QdrantCondition = QdrantFieldCondition | QdrantFilter;

  export interface QdrantFieldCondition {
    key: string;
    match?:
      | { value: unknown }
      | { any: unknown[] };
    range?: {
      gte?: number;
      lte?: number;
      gt?: number;
      lt?: number;
    };
  }

  // Collection types
  export interface QdrantCollectionInfo {
    name: string;
    status?: string;
    optimizer_status?: string;
    vectors_count?: number;
    indexed_vectors_count?: number;
    points_count?: number;
    config?: {
      params?: {
        vectors?: {
          size: number;
          distance: 'Cosine' | 'Euclid' | 'Dot';
        };
      };
    };
  }

  // Point types
  export interface QdrantPoint<T extends QdrantPayload = QdrantPayload> {
    id: string | number;
    vector?: number[] | { [vectorName: string]: number[] };
    payload?: T;
  }

  export interface QdrantSearchResult<T extends QdrantPayload = QdrantPayload> {
    id: string | number;
    score: number;
    payload?: T;
    vector?: number[] | { [vectorName: string]: number[] };
  }

  export interface QdrantUpsertResponse {
    operation_id: number;
    status: 'acknowledged' | 'completed';
  }

  export interface QdrantDeleteResponse {
    operation_id: number;
    status: 'acknowledged' | 'completed';
  }

  export class QdrantClient {
    constructor(url: string, apiKey?: string);
    constructor(config: { url: string; apiKey?: string; timeout?: number });

    // Collection operations
    getCollections(): Promise<{ collections: Array<{ name: string }> }>;
    getCollection(collectionName: string): Promise<QdrantCollectionInfo>;
    createCollection(collectionName: string, options: {
      vectors?: {
        size: number;
        distance: 'Cosine' | 'Euclid' | 'Dot';
      };
      // Support for named vectors
      vectors_config?: {
        [vectorName: string]: {
          size: number;
          distance: 'Cosine' | 'Euclid' | 'Dot';
        };
      };
    }): Promise<void>;
    deleteCollection(collectionName: string): Promise<void>;

    // Point operations
    upsert<T extends QdrantPayload = QdrantPayload>(
      collectionName: string,
      points: {
        batch?: Array<QdrantPoint<T>>;
        points?: Array<QdrantPoint<T>>;
        wait?: boolean;
      }
    ): Promise<QdrantUpsertResponse>;

    // Search operations
    search<T extends QdrantPayload = QdrantPayload>(
      collectionName: string,
      params: {
        vector?: number[];
        vector_name?: string;
        limit?: number;
        offset?: number;
        filter?: QdrantFilter;
        with_payload?: boolean | string[];
        with_vector?: boolean | string[];
        score_threshold?: number;
      }
    ): Promise<Array<QdrantSearchResult<T>>>;

    // Retrieve operations
    retrieve<T extends QdrantPayload = QdrantPayload>(
      collectionName: string,
      params: {
        ids: (string | number)[];
        with_payload?: boolean | string[];
        with_vector?: boolean | string[];
      }
    ): Promise<Array<QdrantPoint<T>>>;

    // Delete operations
    delete(collectionName: string, params: {
      points?: (string | number)[];
      filter?: QdrantFilter;
      wait?: boolean;
    }): Promise<QdrantDeleteResponse>;
  }

  export class QdrantClientUnexpectedResponseError extends Error {}
  export class QdrantClientConfigError extends Error {}
  export class QdrantClientTimeoutError extends Error {}
  export class QdrantClientResourceExhaustedError extends Error {}
}
