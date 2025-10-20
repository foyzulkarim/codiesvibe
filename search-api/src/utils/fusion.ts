import { Candidate } from '../types/candidate';

// Configuration for logging
const LOG_CONFIG = {
  enabled: process.env.NODE_ENV !== 'production',
  prefix: '🔀 Fusion:',
};

// Helper function for conditional logging
const log = (message: string, data?: any) => {
  if (LOG_CONFIG.enabled) {
    console.log(`${LOG_CONFIG.prefix} ${message}`, data ? data : '');
  }
};

/**
 * Normalize scores to [0, 1] range using min-max normalization
 */
export function normalizeScores(candidates: Candidate[]): Candidate[] {
  if (candidates.length === 0) return [];

  const scores = candidates.map(c => c.score);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const range = maxScore - minScore;

  // If all scores are the same, assign equal normalized scores
  if (range === 0) {
    return candidates.map(candidate => ({
      ...candidate,
      score: 0.5 // Equal scores when no variation
    }));
  }

  return candidates.map(candidate => ({
    ...candidate,
    score: (candidate.score - minScore) / range
  }));
}

/**
 * Reciprocal Rank Fusion (RRF) - combines rankings from multiple sources
 * RRF score = Σ(1 / (k + rank_i)) where k is a constant (typically 60)
 */
export function reciprocalRankFusion(
  candidatesBySource: Map<string, Candidate[]>,
  k: number = 60
): Candidate[] {
  log('Starting RRF fusion', {
    sourceCount: candidatesBySource.size,
    totalCandidates: Array.from(candidatesBySource.values()).reduce((sum, candidates) => sum + candidates.length, 0)
  });

  const scoreMap = new Map<string, { score: number; candidate: Candidate; sources: string[] }>();

  // Calculate RRF scores for each candidate
  for (const [source, candidates] of candidatesBySource) {
    const sortedCandidates = [...candidates].sort((a, b) => b.score - a.score);

    sortedCandidates.forEach((candidate, rank) => {
      const rrfScore = 1 / (k + rank + 1); // rank is 0-based, so add 1

      if (scoreMap.has(candidate.id)) {
        const existing = scoreMap.get(candidate.id)!;
        existing.score += rrfScore;
        existing.sources.push(source);
      } else {
        scoreMap.set(candidate.id, {
          score: rrfScore,
          candidate: {
            ...candidate,
            source: 'fusion',
            provenance: {
              ...candidate.provenance,
              filtersApplied: [
                ...(candidate.provenance?.filtersApplied || []),
                `fusion_source_${source}`
              ]
            }
          },
          sources: [source]
        });
      }
    });
  }

  // Convert back to array and sort by RRF score
  const fusedCandidates = Array.from(scoreMap.values())
    .map(({ score, candidate, sources }) => ({
      ...candidate,
      score,
      provenance: {
        ...candidate.provenance,
        filtersApplied: [
          ...(candidate.provenance?.filtersApplied || []),
          `fused_from_${sources.join(',')}`
        ]
      }
    }))
    .sort((a, b) => b.score - a.score);

  log('RRF fusion completed', {
    uniqueCandidates: fusedCandidates.length,
    topScore: fusedCandidates[0]?.score || 0
  });

  return fusedCandidates;
}

/**
 * Weighted Sum Fusion - combines weighted scores from multiple sources
 */
export function weightedSumFusion(
  candidatesBySource: Map<string, Candidate[]>,
  sourceWeights: Map<string, number> = new Map()
): Candidate[] {
  log('Starting weighted sum fusion', {
    sourceCount: candidatesBySource.size,
    weightedSources: Array.from(sourceWeights.entries())
  });

  const scoreMap = new Map<string, { score: number; candidate: Candidate; sources: string[] }>();

  // Calculate weighted scores for each candidate
  for (const [source, candidates] of candidatesBySource) {
    const weight = sourceWeights.get(source) || 1.0;

    candidates.forEach(candidate => {
      const weightedScore = candidate.score * weight;

      if (scoreMap.has(candidate.id)) {
        const existing = scoreMap.get(candidate.id)!;
        existing.score += weightedScore;
        existing.sources.push(source);
      } else {
        scoreMap.set(candidate.id, {
          score: weightedScore,
          candidate: {
            ...candidate,
            source: 'fusion',
            provenance: {
              ...candidate.provenance,
              filtersApplied: [
                ...(candidate.provenance?.filtersApplied || []),
                `fusion_source_${source}_weight_${weight}`
              ]
            }
          },
          sources: [source]
        });
      }
    });
  }

  // Convert back to array and sort by weighted score
  const fusedCandidates = Array.from(scoreMap.values())
    .map(({ score, candidate, sources }) => ({
      ...candidate,
      score,
      provenance: {
        ...candidate.provenance,
        filtersApplied: [
          ...(candidate.provenance?.filtersApplied || []),
          `fused_from_${sources.join(',')}`
        ]
      }
    }))
    .sort((a, b) => b.score - a.score);

  // Normalize final scores to [0, 1]
  const normalizedCandidates = normalizeScores(fusedCandidates);

  log('Weighted sum fusion completed', {
    uniqueCandidates: normalizedCandidates.length,
    topScore: normalizedCandidates[0]?.score || 0
  });

  return normalizedCandidates;
}

/**
 * Concat (No Fusion) - simply concatenates results from multiple sources
 */
export function concatFusion(
  candidatesBySource: Map<string, Candidate[]>
): Candidate[] {
  log('Starting concat fusion', {
    sourceCount: candidatesBySource.size,
    totalCandidates: Array.from(candidatesBySource.values()).reduce((sum, candidates) => sum + candidates.length, 0)
  });

  const allCandidates: Candidate[] = [];
  const seenIds = new Set<string>();

  // Add candidates in order of source, maintaining original order within each source
  for (const [source, candidates] of candidatesBySource) {
    for (const candidate of candidates) {
      if (!seenIds.has(candidate.id)) {
        allCandidates.push({
          ...candidate,
          source: 'fusion',
          provenance: {
            ...candidate.provenance,
            filtersApplied: [
              ...(candidate.provenance?.filtersApplied || []),
              `concat_source_${source}`
            ]
          }
        });
        seenIds.add(candidate.id);
      }
    }
  }

  log('Concat fusion completed', {
    uniqueCandidates: allCandidates.length
  });

  return allCandidates;
}

/**
 * Main fusion function that selects and applies the appropriate fusion method
 */
export function fuseResults(
  candidatesBySource: Map<string, Candidate[]>,
  method: 'rrf' | 'weighted_sum' | 'concat' | 'none',
  sourceWeights?: Map<string, number>
): Candidate[] {
  if (candidatesBySource.size === 0) {
    log('No candidates to fuse');
    return [];
  }

  if (candidatesBySource.size === 1) {
    // Single source, just normalize and return
    const singleSourceCandidates = Array.from(candidatesBySource.values())[0];
    return normalizeScores(singleSourceCandidates);
  }

  log('Fusing results', {
    method,
    sourceCount: candidatesBySource.size
  });

  switch (method) {
    case 'rrf':
      return reciprocalRankFusion(candidatesBySource);

    case 'weighted_sum':
      return weightedSumFusion(candidatesBySource, sourceWeights);

    case 'concat':
      return concatFusion(candidatesBySource);

    case 'none':
      // Return all candidates concatenated without any fusion
      const allCandidates: Candidate[] = [];
      for (const candidates of candidatesBySource.values()) {
        allCandidates.push(...candidates);
      }
      return normalizeScores(allCandidates);

    default:
      logError('Unknown fusion method', { method });
      // Default to RRF
      return reciprocalRankFusion(candidatesBySource);
  }
}

/**
 * Helper function to group candidates by source
 */
export function groupCandidatesBySource(candidates: Candidate[]): Map<string, Candidate[]> {
  const sourceMap = new Map<string, Candidate[]>();

  for (const candidate of candidates) {
    const source = candidate.source;
    if (!sourceMap.has(source)) {
      sourceMap.set(source, []);
    }
    sourceMap.get(source)!.push(candidate);
  }

  return sourceMap;
}

// Helper function for error logging
const logError = (message: string, error?: any) => {
  console.error(`${LOG_CONFIG.prefix} ERROR: ${message}`, error ? error : '');
};