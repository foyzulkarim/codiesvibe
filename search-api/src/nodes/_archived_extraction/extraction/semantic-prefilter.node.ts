import { enumValues } from "@/config/constants";
import { embeddingService } from "@/services/embedding.service";
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
    const queryEmbedding = await embeddingService.generateEmbedding(preprocessedQuery);

    // Get pre-computed embeddings for enum values
    const enumEmbeddings = await getEnumEmbeddings();

    // Find similar candidates for each enum type
    const semanticCandidates: Record<string, Array<{ value: string; score: number }>> = {};

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


async function getEnumEmbeddings(): Promise<any> {
  const categories = await embeddingService.generateEmbeddings(enumValues.categories);
  const functionality = await embeddingService.generateEmbeddings(enumValues.functionality);
  const userTypes = await embeddingService.generateEmbeddings(enumValues.userTypes);
  const interfaceEmbeddings = await embeddingService.generateEmbeddings(enumValues.interface);
  const deployment = await embeddingService.generateEmbeddings(enumValues.deployment);
  const pricingModel = await embeddingService.generateEmbeddings(enumValues.pricingModel);
  return {
    categories: categories.map(embedding => ({ embedding })),
    functionality: functionality.map(embedding => ({ embedding })),
    userTypes: userTypes.map(embedding => ({ embedding })),
    interface: interfaceEmbeddings.map(embedding => ({ embedding })),
    deployment: deployment.map(embedding => ({ embedding })),
    pricingModel: pricingModel.map(embedding => ({ embedding }))
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
  // Add null/undefined checks
  if (!a || !b || a.length === 0 || b.length === 0) {
    return 0;
  }
  
  const dotProduct = a.reduce((sum, val, i) => sum + val * (b[i] || 0), 0);
  const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  
  // Avoid division by zero
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (normA * normB);
}
