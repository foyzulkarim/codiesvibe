/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error("Vectors must have the same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

/**
 * Calculate cosine similarity between a vector and multiple vectors
 */
export function cosineSimilarityBatch(
  vector: number[],
  vectors: number[][]
): number[] {
  return vectors.map(vec => cosineSimilarity(vector, vec));
}

/**
 * Find the most similar vectors to a query vector
 */
export function findMostSimilar(
  queryVector: number[],
  candidateVectors: number[][],
  topK: number = 5
): Array<{ index: number; similarity: number }> {
  const similarities = cosineSimilarityBatch(queryVector, candidateVectors);

  // Create array of objects with index and similarity
  const indexedSimilarities = similarities.map((similarity, index) => ({
    index,
    similarity,
  }));

  // Sort by similarity (descending)
  indexedSimilarities.sort((a, b) => b.similarity - a.similarity);

  // Return top K results
  return indexedSimilarities.slice(0, topK);
}