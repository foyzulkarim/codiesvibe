# Troubleshooting Guide

Common issues and solutions for the CodiesVibe Search API.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Runtime Issues](#runtime-issues)
- [Search Issues](#search-issues)
- [Database Issues](#database-issues)
- [Performance Issues](#performance-issues)

---

## Installation Issues

### MongoDB Connection Refused

**Symptoms**:
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```

**Causes**:
- MongoDB container not running
- Wrong connection string
- Network configuration issues

**Solutions**:

```bash
# Check MongoDB status
docker-compose ps mongodb

# View MongoDB logs
docker-compose logs mongodb

# Restart MongoDB
docker-compose restart mongodb

# Verify connection string
echo $MONGODB_URI
```

**Correct connection string**:
```env
MONGODB_URI=mongodb://admin:password123@mongodb:27017/toolsearch?authSource=admin
```

---

### Qdrant Service Unavailable

**Symptoms**:
```
Error: Qdrant service unavailable at http://qdrant:6333
```

**Causes**:
- Qdrant container not running
- Port conflicts
- Network configuration issues

**Solutions**:

```bash
# Check Qdrant status
docker-compose ps qdrant

# Test Qdrant directly
curl http://localhost:6333/health

# Check for port conflicts
lsof -i :6333

# Restart Qdrant
docker-compose restart qdrant
```

---

### Together AI API Errors

**Symptoms**:
```
Error: Together AI API authentication failed
Error: Rate limit exceeded
```

**Causes**:
- Invalid API key
- Rate limit exceeded
- Network connectivity issues

**Solutions**:

```bash
# Verify API key is set
echo $TOGETHER_API_KEY

# Test Together AI directly
curl -H "Authorization: Bearer $TOGETHER_API_KEY" \
  https://api.together.xyz/models

# Check rate limits
# Wait a few minutes and retry
```

---

### Permission Errors (macOS/Linux)

**Symptoms**:
```
Error: EACCES: permission denied
```

**Solutions**:

```bash
# Fix Docker volume permissions
sudo chown -R $USER:$USER .

# Fix npm permissions
npm cache clean --force
rm -rf node_modules
npm install
```

---

## Runtime Issues

### Server Fails to Start

**Symptoms**:
```
Error: Missing required environment variables
Error: Port 4003 is already in use
```

**Solutions**:

```bash
# Check required environment variables
echo $MONGODB_URI
echo $QDRANT_HOST
echo $TOGETHER_API_KEY
echo $CLERK_SECRET_KEY

# Check port availability
lsof -i :4003

# Kill process using port
kill -9 $(lsof -t -i:4003)

# View server logs
docker-compose logs search-api
```

---

### Health Check Failures

**Symptoms**:
```
GET /health/ready returns 503 Service Unavailable
```

**Solutions**:

```bash
# Check all services
docker-compose ps

# Test MongoDB connection
docker exec -it mongodb mongosh --eval "db.adminCommand('ping')"

# Test Qdrant connection
curl http://localhost:6333/health

# View detailed health check
curl -v http://localhost:4003/health/ready
```

---

## Search Issues

### Search Returns Empty Results

**Causes**:
- No data seeded
- Vector collections empty
- Query too specific
- Cache issue

**Solutions**:

```bash
# Check MongoDB data
docker exec -it mongodb mongosh toolsearch \
  --username admin \
  --password password123 \
  --eval "db.tools.countDocuments()"

# Check Qdrant collections
curl http://localhost:6333/collections/tools

# Re-seed data
docker exec -it search-api npm run seed-vectors -- --force

# Enable debug mode
curl -X POST http://localhost:4003/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "test", "debug": true}'
```

---

### Search Is Slow

**Causes**:
- Cache disabled
- Too many vector types
- Database connection issues
- High query complexity

**Solutions**:

```bash
# Enable caching
# In .env:
ENABLE_CACHE=true
CACHE_TTL=3600

# Reduce vector types
VECTOR_TYPES=semantic,entities.categories

# Check database connections
curl http://localhost:4003/health/ready

# Monitor performance
curl http://localhost:4003/metrics | grep search_duration
```

---

### Validation Errors

**Symptoms**:
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR"
}
```

**Causes**:
- Invalid query characters
- Query too long/short
- Invalid parameters

**Solutions**:

```bash
# Check query length (1-1000 characters)
# Remove special characters: < > { } [ ] \

# Valid query
curl -X POST http://localhost:4003/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "AI code completion tools", "limit": 10}'

# Invalid query (will fail)
curl -X POST http://localhost:4003/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "<script>alert()</script>"}'
```

---

## Database Issues

### Vector Index Validation Failed

**Symptoms**:
```
Vector index validation failed: missing vectors
```

**Solutions**:

```bash
# Re-create collections
docker exec -it search-api npm run create-collections

# Force re-seed
docker exec -it search-api npm run seed-vectors -- --force

# Check collection info
curl http://localhost:6333/collections/tools
```

---

### MongoDB Sync Issues

**Symptoms**:
```
Sync worker errors
Documents out of sync with vectors
```

**Solutions**:

```bash
# Enable sync worker
# In .env:
ENABLE_SYNC_WORKER=true

# Manual sync trigger
curl -X POST http://localhost:4003/api/sync/sweep \
  -H "Authorization: Bearer <admin_token>"

# Check sync status
curl http://localhost:4003/api/sync/status \
  -H "Authorization: Bearer <admin_token>"
```

---

## Performance Issues

### High Memory Usage

**Causes**:
- Memory leaks
- Too many cached results
- Large response payloads

**Solutions**:

```bash
# Monitor memory
docker stats search-api

# Reduce cache TTL
# In .env:
CACHE_TTL=1800  # 30 minutes instead of 1 hour

# Limit response size
# In .env:
MULTIVECTOR_MAX_RESULTS=10  # instead of 20

# Restart service
docker-compose restart search-api
```

---

### Rate Limiting Issues

**Symptoms**:
```json
{
  "error": "Too many requests",
  "code": "RATE_LIMIT_EXCEEDED"
}
```

**Solutions**:

```bash
# Check rate limit headers
curl -I http://localhost:4003/api/search

# Response headers:
# RateLimit-Limit: 30
# RateLimit-Remaining: 0
# RateLimit-Reset: 1640995200

# Wait for reset or disable rate limiting (dev only)
# In .env:
ENABLE_RATE_LIMITING=false
```

---

## Debug Mode

Enable detailed logging and debugging:

### Environment

```env
LOG_LEVEL=debug
NODE_ENV=development
```

### API Request

```bash
curl -X POST http://localhost:4003/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "test query",
    "debug": true
  }'
```

**Debug Response Includes**:
- Node execution times
- Vector query details
- Execution path
- LLM prompts and responses
- Error stack traces

---

## Getting Help

If you're still experiencing issues:

1. **Check logs**:
   ```bash
   docker-compose logs -f search-api
   tail -f logs/search-api.log
   ```

2. **Check documentation**:
   - [Installation Guide](INSTALLATION.md)
   - [Configuration Guide](CONFIGURATION.md)
   - [API Reference](API.md)

3. **Report issue**:
   - [GitHub Issues](https://github.com/yourusername/codiesvibe/issues)
   - Include logs, environment variables (redacted), and steps to reproduce

---

[← Back to README](../README.md)
