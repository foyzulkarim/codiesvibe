declare module '@qdrant/js-client-rest' {
  export class QdrantClient {
    constructor(url: string, apiKey?: string);
    constructor(config: { url: string; apiKey?: string; timeout?: number });

    // Collection operations
    getCollections(): Promise<{ collections: Array<{ name: string }> }>;
    getCollection(collectionName: string): Promise<any>;
    createCollection(collectionName: string, options: {
      vectors: {
        size: number;
        distance: 'Cosine' | 'Euclid' | 'Dot';
      };
    }): Promise<void>;
    deleteCollection(collectionName: string): Promise<void>;

    // Point operations
    upsert(collectionName: string, points: {
      batch?: Array<{
        id: string | number;
        vector: number[];
        payload?: any;
      }>;
      points?: Array<{
        id: string | number;
        vector: number[];
        payload?: any;
      }>;
      wait?: boolean;
    }): Promise<any>;

    // Search operations
    search(collectionName: string, params: {
      vector: number[];
      limit?: number;
      offset?: number;
      filter?: any;
      with_payload?: boolean | string[];
      with_vector?: boolean;
      score_threshold?: number;
    }): Promise<Array<{
      id: string | number;
      score: number;
      payload?: any;
      vector?: number[];
    }>>;

    // Retrieve operations
    retrieve(collectionName: string, params: {
      ids: (string | number)[];
      with_payload?: boolean | string[];
      with_vector?: boolean;
    }): Promise<Array<{
      id: string | number;
      payload?: any;
      vector?: number[];
    }>>;

    // Delete operations
    delete(collectionName: string, params: {
      points?: (string | number)[];
      filter?: any;
      wait?: boolean;
    }): Promise<any>;
  }

  export class QdrantClientUnexpectedResponseError extends Error {}
  export class QdrantClientConfigError extends Error {}
  export class QdrantClientTimeoutError extends Error {}
  export class QdrantClientResourceExhaustedError extends Error {}
}