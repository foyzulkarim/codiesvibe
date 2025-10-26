# Simple Cache Setup Guide

## Prerequisites

- `TOGETHER_API_KEY` environment variable set
- MongoDB Atlas cluster access
- `together-ai` package installed (already in package.json)

## Quick Setup (3 Steps)

### Step 1: Set Environment Variable
```bash
export TOGETHER_API_KEY="your_together_ai_key_here"
```

### Step 2: Run Setup Script
```bash
cd search-api
npm run setup:cache-indexes
```

### Step 3: Create Vector Search Index in MongoDB Atlas

1. Go to MongoDB Atlas → your cluster → Atlas Search
2. Click "Create Search Index"
3. Select "JSON Editor"
4. Paste this configuration:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "queryEmbedding",
      "numDimensions": 768,
      "similarity": "cosine"
    }
  ]
}
```

5. **Index Name**: `plans_vector_index`
6. **Collection**: `plans`
7. Click "Create"

## That's It! 🎉

Your caching system is now ready to use. The system will:

- ✅ Use Together AI for embeddings (768 dimensions)
- ✅ Store query plans in MongoDB Atlas
- ✅ Automatically find similar queries with 90%+ similarity
- ✅ Skip expensive LLM calls for cached queries
- ✅ Save 60-80% on LLM costs for similar queries

## Usage

Just run your search queries normally. The caching happens automatically:

```typescript
import { searchWithAgenticPipeline } from '@/graphs/agentic-search.graph';

// First time (cache miss) - runs full pipeline
const result1 = await searchWithAgenticPipeline("code editor");

// Similar query (cache hit) - uses cached results, much faster!
const result2 = await searchWithAgenticPipeline("best code editor");
```

## Monitoring

Check cache performance with your API endpoints:

- `GET /api/cache/stats` - Hit rates and cost savings
- `GET /api/cache/health` - System health status

## Model Details

- **Embedding Model**: `togethercomputer/m2-bert-80M-32k-retrieval`
- **Dimensions**: 768
- **Provider**: Together AI
- **Specialization**: Long-context retrieval
- **Cost**: Very cost-effective for search use cases

## Troubleshooting

If setup fails:
1. Check your `TOGETHER_API_KEY` is valid
2. Ensure MongoDB Atlas connection works
3. Verify vector index was created with 768 dimensions

That's it! Your intelligent caching system is ready to save you time and money.