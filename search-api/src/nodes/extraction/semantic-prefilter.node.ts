import { StateAnnotation } from "@/types/state";

/**
 * Pre-filter enum candidates using semantic similarity
 */
export async function semanticPrefilterNode(state: typeof StateAnnotation.State): Promise<Partial<typeof StateAnnotation.State>> {
  const { preprocessedQuery } = state;

  if (!preprocessedQuery) {
    return {
      extractionSignals: {
        ...state.extractionSignals,
        semanticCandidates: {
          categories: [],
          functionality: [],
          userTypes: [],
          interface: [],
          deployment: [],
          pricingModel: []
        }
      }
    };
  }

  try {
    // Generate embedding for the preprocessed query
    // TODO: Implement embedding service integration
    const queryEmbedding = await generateEmbedding(preprocessedQuery);

    // Get pre-computed embeddings for enum values
    // TODO: Implement embedding service for enum values
    const enumEmbeddings = await getEnumEmbeddings();

    // Find similar candidates for each enum type
    const semanticCandidates: Record<string, Array<{ value: string; score: number }>> = {};

    // Mock enum values for now - these should come from constants
    const enumValues = {
      categories: ["development", "design", "productivity", "communication", "data"],
      functionality: ["code editing", "version control", "project management", "collaboration", "analytics"],
      userTypes: ["developers", "designers", "project managers", "business analysts", "data scientists"],
      interface: ["web app", "desktop app", "mobile app", "cli", "api"],
      deployment: ["cloud", "on-premise", "hybrid", "saas", "self-hosted"],
      pricingModel: ["free", "freemium", "subscription", "one-time", "usage-based"]
    };

    // Categories
    const categoryCandidates = findMostSimilar(
      queryEmbedding,
      enumEmbeddings.categories.map((e: any) => e.embedding),
      5
    );
    semanticCandidates.categories = categoryCandidates.map(c => ({
      value: enumValues.categories[c.index],
      score: c.similarity
    }));

    // Functionality
    const functionalityCandidates = findMostSimilar(
      queryEmbedding,
      enumEmbeddings.functionality.map((e: any) => e.embedding),
      5
    );
    semanticCandidates.functionality = functionalityCandidates.map(c => ({
      value: enumValues.functionality[c.index],
      score: c.similarity
    }));

    // User types
    const userTypeCandidates = findMostSimilar(
      queryEmbedding,
      enumEmbeddings.userTypes.map((e: any) => e.embedding),
      5
    );
    semanticCandidates.userTypes = userTypeCandidates.map(c => ({
      value: enumValues.userTypes[c.index],
      score: c.similarity
    }));

    // Interface
    const interfaceCandidates = findMostSimilar(
      queryEmbedding,
      enumEmbeddings.interface.map((e: any) => e.embedding),
      5
    );
    semanticCandidates.interface = interfaceCandidates.map(c => ({
      value: enumValues.interface[c.index],
      score: c.similarity
    }));

    // Deployment
    const deploymentCandidates = findMostSimilar(
      queryEmbedding,
      enumEmbeddings.deployment.map((e: any) => e.embedding),
      5
    );
    semanticCandidates.deployment = deploymentCandidates.map(c => ({
      value: enumValues.deployment[c.index],
      score: c.similarity
    }));

    // Pricing model
    const pricingModelCandidates = findMostSimilar(
      queryEmbedding,
      enumEmbeddings.pricingModel.map((e: any) => e.embedding),
      5
    );
    semanticCandidates.pricingModel = pricingModelCandidates.map(c => ({
      value: enumValues.pricingModel[c.index],
      score: c.similarity
    }));

    return {
      extractionSignals: {
        ...state.extractionSignals,
        semanticCandidates
      }
    };
  } catch (error) {
    console.error("Error in semanticPrefilterNode:", error);
    return {
      extractionSignals: {
        ...state.extractionSignals,
        semanticCandidates: {
          categories: [],
          functionality: [],
          userTypes: [],
          interface: [],
          deployment: [],
          pricingModel: []
        }
      }
    };
  }
}

// TODO: Move these to embedding service
async function generateEmbedding(text: string): Promise<number[]> {
  // Mock implementation - replace with actual embedding service
  return Array.from({ length: 384 }, () => Math.random());
}

async function getEnumEmbeddings(): Promise<any> {
  // Mock implementation - replace with actual enum embeddings
  return {
    categories: Array.from({ length: 5 }, () => ({ embedding: Array.from({ length: 384 }, () => Math.random()) })),
    functionality: Array.from({ length: 5 }, () => ({ embedding: Array.from({ length: 384 }, () => Math.random()) })),
    userTypes: Array.from({ length: 5 }, () => ({ embedding: Array.from({ length: 384 }, () => Math.random()) })),
    interface: Array.from({ length: 5 }, () => ({ embedding: Array.from({ length: 384 }, () => Math.random()) })),
    deployment: Array.from({ length: 5 }, () => ({ embedding: Array.from({ length: 384 }, () => Math.random()) })),
    pricingModel: Array.from({ length: 5 }, () => ({ embedding: Array.from({ length: 384 }, () => Math.random()) }))
  };
}

function findMostSimilar(queryEmbedding: number[], candidateEmbeddings: number[][], topK: number): Array<{ index: number; similarity: number }> {
  const similarities = candidateEmbeddings.map((embedding, index) => ({
    index,
    similarity: cosineSimilarity(queryEmbedding, embedding)
  }));

  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (normA * normB);
}