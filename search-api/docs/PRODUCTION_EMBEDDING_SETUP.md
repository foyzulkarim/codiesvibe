# Production Embedding Setup Guide

This guide explains how to set up Together AI embeddings for production deployment of your caching system.

## Overview

The system automatically switches between development and production embedding services:

- **Development**: Uses local Ollama with `mxbai-embed-large` (1024 dimensions)
- **Production**: Uses Together AI with `togethercomputer/m2-bert-80M-32k-retrieval` (768 dimensions)

## Production Setup

### 1. Environment Variables

Make sure you have the Together AI API key set in your production environment:

```bash
export TOGETHER_API_KEY="your_together_ai_api_key_here"
export NODE_ENV=production
```

### 2. Required Dependencies

Ensure you have the `together-ai` package installed:

```bash
npm install together-ai
```

### 3. Vector Search Index Configuration

**For Production (768 dimensions)**:

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

### 4. MongoDB Atlas Setup

1. **Create Vector Search Index**:
   - Go to MongoDB Atlas → your cluster → Atlas Search
   - Create index with the configuration above
   - Name it: `plans_vector_index`

2. **Index Configuration**:
   - **Collection**: `plans`
   - **Type**: Vector Search
   - **Dimensions**: 768 (production)

### 5. Testing Production Setup

```bash
# Test in production mode
NODE_ENV=production npm run setup:cache-indexes

# Or run with environment variables
export NODE_ENV=production
export TOGETHER_API_KEY="your_key"
npm run setup:cache-indexes
```

## Model Information

### Production Model: `togethercomputer/m2-bert-80M-32k-retrieval`

- **Provider**: Together AI
- **Dimensions**: 768
- **Context Length**: 32,768 tokens
- **Specialization**: Long-context retrieval
- **Cost**: Lower than larger embedding models
- **Performance**: Optimized for search/retrieval tasks

### API Usage

The service automatically handles both Together AI direct API calls and LangChain integration:

```typescript
// Direct Together AI API (used in cache service)
const together = new Together({ apiKey: process.env.TOGETHER_API_KEY });
const response = await together.embeddings.create({
  model: "togethercomputer/m2-bert-80M-32k-retrieval",
  input: "your query here"
});

// LangChain compatible (for other parts of system)
const model = new ChatOpenAI({
  configuration: {
    baseURL: 'https://api.together.xyz/v1',
    apiKey: process.env.TOGETHER_API_KEY,
  },
  modelName: 'togethercomputer/m2-bert-80M-32k-retrieval',
});
```

## Environment-Specific Behavior

### Development Environment
- Uses Ollama local embeddings
- 1024 dimensions
- No API costs
- Requires Ollama running locally

### Production Environment
- Uses Together AI embeddings
- 768 dimensions
- Pay-per-use pricing
- Requires `TOGETHER_API_KEY`
- More reliable and scalable

## Migration Steps

### From Development to Production

1. **Set Environment Variables**:
   ```bash
   export NODE_ENV=production
   export TOGETHER_API_KEY="your_key"
   ```

2. **Update Vector Index**:
   - Delete existing index if needed
   - Create new index with 768 dimensions

3. **Clear Existing Cache** (optional):
   ```bash
   # Use cache management endpoint or script
   ```

4. **Test the Setup**:
   ```bash
   npm run setup:cache-indexes
   ```

## Cost Optimization

The Together AI embedding model is cost-effective:
- **Model Size**: 80M parameters (smaller = cheaper)
- **Specialized**: Optimized for retrieval tasks
- **Efficient**: Lower cost per 1M tokens compared to larger models

## Troubleshooting

### Common Issues

1. **API Key Issues**:
   ```bash
   export TOGETHER_API_KEY="sk-your-key-here"
   ```

2. **Dimension Mismatch**:
   - Ensure MongoDB Atlas index uses 768 dimensions for production
   - Run setup script with `NODE_ENV=production`

3. **Model Availability**:
   - Verify Together AI access to `togethercomputer/m2-bert-80M-32k-retrieval`
   - Check API key permissions

### Verification Commands

```bash
# Check which embedding service will be used
node -e "console.log('Dimensions:', require('./src/config/constants').embeddingConfig.dimensions)"

# Test Together AI connection
curl -X POST "https://api.together.xyz/v1/embeddings" \
  -H "Authorization: Bearer $TOGETHER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "togethercomputer/m2-bert-80M-32k-retrieval",
    "input": "test query"
  }'
```

## Monitoring

Monitor your production embedding usage:
- Together AI dashboard for API usage
- MongoDB Atlas for vector search performance
- Cache hit rates and cost savings

## Benefits of Production Setup

✅ **Reliability**: Cloud-based service with 99.9% uptime
✅ **Scalability**: Handles high traffic without local resource limits
✅ **Consistency**: Same embedding model across all deployments
✅ **Cost**: Predictable per-use pricing
✅ **Performance**: Optimized for retrieval tasks
✅ **Integration**: Seamless LangChain compatibility