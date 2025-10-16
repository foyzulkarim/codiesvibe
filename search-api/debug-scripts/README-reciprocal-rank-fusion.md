# Reciprocal Rank Fusion Debug Script

This document describes the `test-reciprocal-rank-fusion.ts` debug script for testing the Reciprocal Rank Fusion (RRF) implementation.

## Overview

The debug script comprehensively tests the RRF service implementation from T037, demonstrating how the algorithm merges search results from multiple sources while maintaining original metadata and removing duplicates.

## Usage

Run the script from the search-api directory:

```bash
cd search-api
npx ts-node -r tsconfig-paths/register debug-scripts/test-reciprocal-rank-fusion.ts
```

## Test Scenarios

### 1. Basic Merging
- Tests merging of 2-3 result sets with overlapping items
- Demonstrates how RRF combines results from vector, traditional, and hybrid search
- Shows deduplication and ranking mechanisms

### 2. K Value Testing
- Tests different k values (20, 40, 60, 80, 100) and their impact on rankings
- Demonstrates how the k parameter affects RRF scores
- Shows the relationship between k value and score distribution

### 3. Duplicate Handling
- Tests with intentional duplicates across and within sources
- Demonstrates deduplication algorithms
- Shows how duplicate items are merged with combined RRF scores

### 4. Source Weights
- Tests different source weight configurations:
  - Equal weights (vector: 1.0, traditional: 1.0)
  - Vector preferred (vector: 1.5, traditional: 0.7)
  - Traditional preferred (vector: 0.7, traditional: 1.5)
  - Balanced hybrid (vector: 1.2, traditional: 1.2, hybrid: 1.0)
- Shows how source weights affect final rankings

### 5. Empty Results
- Tests with all empty sources
- Tests with mixed empty and non-empty sources
- Demonstrates graceful handling of edge cases

### 6. Performance Testing
- Tests with large datasets (100 items per source, 4 sources)
- Measures processing efficiency
- Shows deduplication performance at scale

### 7. Configuration Validation
- Tests validation of invalid configurations
- Ensures proper error handling for bad parameters
- Validates boundary conditions

## Output Format

The script provides detailed output including:

- **Test Results**: Success/failure status for each test
- **Performance Metrics**: Processing time, efficiency measurements
- **RRF Analysis**: Detailed RRF scores, source contributions, rankings
- **Deduplication Stats**: Input/output counts, duplicate removal rates
- **Configuration Details**: Test parameters and their effects

## Sample Output

```
🧪 T038: Reciprocal Rank Fusion Debug Test Suite
Testing RRF implementation with various scenarios and configurations

🧪 Testing Basic Merging of Multiple Result Sets
✅ Basic merging completed in 1ms
📊 Input: 15 results from 3 sources
📊 Output: 10 unique results
🗑️  Duplicates removed: 5
📈 Average RRF Score: 0.0214
📈 Average Source Count: 1.50

📊 Top 5 Merged Results (Basic Merging)
================================================================================

1. React (Rank: 1)
   RRF Score: 0.0443
   Original Score: 0.9500
   Source Count: 3
   Sources: vector, traditional, hybrid
   Original Rankings:
     - vector: Rank 1, Score 0.9500
     - traditional: Rank 1, Score 0.9200
     - hybrid: Rank 1, Score 0.9300
```

## Key Metrics

The script tracks and reports:

- **RRF Score**: Reciprocal rank fusion score for each result
- **Source Count**: Number of sources contributing to each result
- **Original Rankings**: Rank and score from each source
- **Deduplication Rate**: Percentage of duplicates removed
- **Processing Efficiency**: Items processed per second
- **Configuration Impact**: Effect of different parameter settings

## Test Data

The script uses realistic test data including:

- **Vector Search Results**: Semantic similarity-based results
- **Traditional Search Results**: Full-text search results
- **Hybrid Search Results**: Combined vector and text search
- **Large Datasets**: Generated data for performance testing

## Integration

This debug script follows the same patterns as other debug scripts in the `search-api/debug-scripts/` directory:

- Uses the same import structure and logging style
- Includes proper TypeScript types and error handling
- Provides comprehensive test coverage
- Generates detailed performance reports

## Dependencies

- `resultMergerService` from `../src/services`
- TypeScript types from `../src/services/result-merger.service`
- No external dependencies beyond the search-api project

## Troubleshooting

If you encounter issues:

1. Ensure you're in the `search-api` directory
2. Check that TypeScript dependencies are installed (`npm install`)
3. Verify the result merger service is properly implemented
4. Check for any import path issues

## Customization

You can modify the test data, configurations, or test scenarios by editing the script:

- Change sample data in the `SAMPLE_*_SEARCH_RESULTS` constants
- Adjust test parameters in individual test functions
- Add new test scenarios following the existing pattern
- Modify performance test sizes for different scale testing
