# Frequently Asked Questions (FAQ)

Common questions and answers about the CodiesVibe Search API.

## Table of Contents

- [General](#general)
- [Architecture](#architecture)
- [Performance](#performance)
- [Development](#development)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## General

### What is the CodiesVibe Search API?

An AI-powered semantic search service built with LangGraph for intelligent tool discovery. It uses multi-vector similarity search, LLM-powered intent extraction, and dynamic query planning.

### What LLM providers are supported?

**Currently supported**:
- **Together AI** (primary, required for production)
- **Ollama** (optional, for local development)

Together AI is required because it provides:
- Fast inference
- Structured output support
- Cost-effective pricing

### Is it free to use?

The codebase is open source (MIT License), but requires:
- **Together AI API key** (paid service)
- **Clerk account** (free tier available)
- **MongoDB & Qdrant** (self-hosted free, or paid cloud services)

### Can I use my own LLM?

Yes, but requires code changes:
1. Implement a new LLM service in `src/services/`
2. Update intent extractor and query planner nodes
3. Ensure structured output support

---

## Architecture

### How does the search pipeline work?

**5-Node LangGraph Pipeline**:
1. **CacheCheck**: Look for cached similar queries
2. **IntentExtractor**: Extract user intent with LLM
3. **QueryPlanner**: Plan execution strategy
4. **QueryExecutor**: Execute Qdrant + MongoDB queries
5. **CacheStore**: Cache results for future use

See [Architecture Documentation](ARCHITECTURE.md) for details.

### What is schema-driven architecture?

A design pattern that separates domain-agnostic core logic from domain-specific implementations. Benefits:
- Easy to add new domains (3 files only)
- Single source of truth for domain knowledge
- No changes needed to core framework

### Why use both MongoDB and Qdrant?

**MongoDB**: Structured data (categories, pricing, metadata)
**Qdrant**: Vector embeddings for semantic similarity

Combined, they enable:
- Semantic search (Qdrant)
- Structured filtering (MongoDB)
- Hybrid query strategies

### How does caching work?

**Vector-based caching**:
1. Generate embedding for query
2. Search cache collection for similar queries
3. If similarity > 0.85, return cached results
4. Otherwise, execute full pipeline

**Benefits**:
- Reduces LLM API calls (~40% hit rate)
- Faster response time (50-100ms vs 200-500ms)
- Lower costs

---

## Performance

### What's the expected response time?

| Scenario | Latency |
|----------|---------|
| **Cache hit** | 50-100ms |
| **Cache miss** | 200-500ms |
| **Debug mode** | 500-1000ms |

### How can I improve search performance?

1. **Enable caching**: `ENABLE_CACHE=true`
2. **Reduce vector types**: Use only essential types
3. **Increase cache TTL**: `CACHE_TTL=7200` (2 hours)
4. **Use MongoDB indexes**: Index frequently queried fields
5. **Optimize query limit**: Lower `MULTIVECTOR_MAX_RESULTS`

### Can it handle high traffic?

Yes, with proper scaling:
- **Horizontal scaling**: Run multiple instances behind load balancer
- **Managed databases**: Use MongoDB Atlas + Qdrant Cloud
- **Caching**: Reduces load on LLM API and databases
- **Rate limiting**: Protects against abuse

### What are the resource requirements?

See [Deployment Guide](DEPLOYMENT.md#resource-requirements):
- **Development**: 1GB RAM, 1 CPU
- **Production**: 2GB RAM, 2 CPUs
- **High Traffic**: 4GB RAM, 4 CPUs

---

## Development

### How do I add a new domain?

Create 3 files in `src/domains/{domain}/`:
1. `{domain}.schema.ts` - Domain schema
2. `{domain}.filters.ts` - Filter mapping
3. `{domain}.validators.ts` - Validation logic

Then wire in `src/core/pipeline.init.ts`. No changes needed to core framework!

See [Architecture Guide](ARCHITECTURE.md#adding-new-domains) for step-by-step instructions.

### Can I use a different vector database?

Yes, but requires implementing the Qdrant service interface:
1. Create new service in `src/services/`
2. Implement search, upsert, delete methods
3. Update configuration

### Can I use a different embedding model?

Yes, update `src/services/embedding.service.ts`:
- Change model name
- Adjust vector dimensions
- Update Qdrant collection configuration

### How do I run tests locally?

```bash
# All tests
npm test

# With coverage
npm run test:cov

# E2E tests
npm run test:e2e

# Security tests
npx tsx test-security-validation.ts
```

See [Testing Guide](TESTING.md) for details.

---

## Deployment

### Can I deploy without Docker?

Yes:
1. Install MongoDB and Qdrant separately
2. Configure `.env` with connection strings
3. Build and run: `npm run build && npm run start:prod`

See [Deployment Guide](DEPLOYMENT.md#pm2-deployment).

### How do I enable SSL/TLS?

Use a reverse proxy (nginx, Caddy, Traefik) in front of the API:

```nginx
server {
    listen 443 ssl;
    server_name api.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:4003;
    }
}
```

### What's the recommended production setup?

- **Application**: Docker containers on AWS ECS, Kubernetes, or similar
- **MongoDB**: MongoDB Atlas (managed, auto-scaling)
- **Qdrant**: Qdrant Cloud (managed, distributed)
- **Load Balancer**: AWS ALB, CloudFlare, or nginx
- **Monitoring**: Prometheus + Grafana
- **Logging**: Loggly or ELK stack

### How do I scale horizontally?

```bash
# Docker Compose
docker-compose up --scale search-api=3 -d

# Kubernetes
kubectl scale deployment search-api --replicas=3
```

Add a load balancer to distribute traffic across instances.

---

## Troubleshooting

### Search returns empty results

**Common causes**:
1. No data seeded
2. Vector collections empty
3. Query too specific

**Solutions**:
```bash
# Check data
docker exec -it mongodb mongosh toolsearch --eval "db.tools.countDocuments()"

# Re-seed
docker exec -it search-api npm run seed-vectors -- --force
```

See [Troubleshooting Guide](TROUBLESHOOTING.md#search-returns-empty-results).

### MongoDB connection refused

**Solutions**:
```bash
# Check MongoDB
docker-compose ps mongodb

# Verify connection string
echo $MONGODB_URI

# Restart MongoDB
docker-compose restart mongodb
```

See [Troubleshooting Guide](TROUBLESHOOTING.md#mongodb-connection-refused).

### Rate limiting errors

**Solutions**:
- Wait for rate limit reset (check `RateLimit-Reset` header)
- Reduce request frequency
- Disable rate limiting in development: `ENABLE_RATE_LIMITING=false`

See [Troubleshooting Guide](TROUBLESHOOTING.md#rate-limiting-issues).

---

## Still have questions?

- **Documentation**: Browse the [docs](.) directory
- **GitHub Issues**: [Report a bug](https://github.com/yourusername/codiesvibe/issues)
- **GitHub Discussions**: [Ask a question](https://github.com/yourusername/codiesvibe/discussions)

---

[← Back to README](../README.md)
