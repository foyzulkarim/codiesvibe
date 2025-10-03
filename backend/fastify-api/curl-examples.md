# Fastify API - cURL Examples

This document provides comprehensive cURL examples for testing the Fastify API service.

## 🚀 Quick Start Examples

### Health Check
```bash
curl -X GET http://localhost:4002/health \
  -H "Accept: application/json" | jq
```

### Service Information
```bash
curl -X GET http://localhost:4002/info \
  -H "Accept: application/json" | jq
```

### Get Available Tools
```bash
curl -X GET http://localhost:4002/api/tools \
  -H "Accept: application/json" | jq
```

## 💬 Query Examples

### Simple Conversation
```bash
curl -X POST http://localhost:4002/api/query \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"query": "Hello, how are you?"}' | jq
```

### Ask About Capabilities
```bash
curl -X POST http://localhost:4002/api/query \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"query": "What can you help me with?"}' | jq
```

### General Information Query
```bash
curl -X POST http://localhost:4002/api/query \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"query": "Tell me about artificial intelligence"}' | jq
```

## 🗄️ Database Query Examples

### List All Collections
```bash
curl -X POST http://localhost:4002/api/query \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"query": "Show me all collections in the database"}' | jq
```

### Get Database Schema Information
```bash
curl -X POST http://localhost:4002/api/query \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"query": "What collections exist in the database and what are their schemas?"}' | jq
```

### Count Documents in Collections
```bash
curl -X POST http://localhost:4002/api/query \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"query": "Count the total number of documents in each collection"}' | jq
```

### Find Specific Data
```bash
curl -X POST http://localhost:4002/api/query \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"query": "Show me the first 5 users from the users collection"}' | jq
```

### Search for Users
```bash
curl -X POST http://localhost:4002/api/query \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"query": "Find all users with email containing gmail.com"}' | jq
```

### Get Recent Records
```bash
curl -X POST http://localhost:4002/api/query \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"query": "Find all users created in the last 7 days"}' | jq
```

## 📊 Data Analysis Examples

### User Registration Trends
```bash
curl -X POST http://localhost:4002/api/query \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"query": "Analyze user registration trends over the last month"}' | jq
```

### Group and Count Data
```bash
curl -X POST http://localhost:4002/api/query \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"query": "Group users by their registration date and show the count for each day"}' | jq
```

### Statistical Analysis
```bash
curl -X POST http://localhost:4002/api/query \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"query": "Calculate the average, minimum, and maximum age of users"}' | jq
```

### Complex Aggregation
```bash
curl -X POST http://localhost:4002/api/query \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"query": "Find the top 10 most active users based on their last login date"}' | jq
```

## 🔍 Advanced Query Examples

### Multi-Collection Analysis
```bash
curl -X POST http://localhost:4002/api/query \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"query": "Compare the number of users vs the number of posts in the database"}' | jq
```

### Data Validation
```bash
curl -X POST http://localhost:4002/api/query \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"query": "Find all users with missing or invalid email addresses"}' | jq
```

### Performance Analysis
```bash
curl -X POST http://localhost:4002/api/query \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"query": "Show me the database indexes and their usage statistics"}' | jq
```

### Data Export Query
```bash
curl -X POST http://localhost:4002/api/query \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"query": "Export all user data in JSON format for users created this month"}' | jq
```

## 🌐 NestJS Proxy Examples

### Health Check via NestJS
```bash
curl -X GET http://localhost:4001/ai/health \
  -H "Accept: application/json" | jq
```

### Get Tools via NestJS
```bash
curl -X GET http://localhost:4001/ai/tools \
  -H "Accept: application/json" | jq
```

### Query via NestJS Proxy
```bash
curl -X POST http://localhost:4001/ai/query \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"query": "Show me all collections in the database"}' | jq
```

### Complex Query via NestJS
```bash
curl -X POST http://localhost:4001/ai/query \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"query": "Find all users created in the last week and group them by role"}' | jq
```

## ❌ Error Testing Examples

### Invalid Request Format
```bash
curl -X POST http://localhost:4002/api/query \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"invalid": "field"}' | jq
```

### Empty Query
```bash
curl -X POST http://localhost:4002/api/query \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"query": ""}' | jq
```

### Missing Query Field
```bash
curl -X POST http://localhost:4002/api/query \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{}' | jq
```

### Invalid JSON
```bash
curl -X POST http://localhost:4002/api/query \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{invalid json}' | jq
```

### Non-existent Endpoint
```bash
curl -X GET http://localhost:4002/api/nonexistent \
  -H "Accept: application/json" | jq
```

### Wrong HTTP Method
```bash
curl -X DELETE http://localhost:4002/api/query \
  -H "Accept: application/json" | jq
```

## 🔧 Advanced cURL Options

### With Verbose Output
```bash
curl -v -X POST http://localhost:4002/api/query \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"query": "Hello"}' | jq
```

### With Timing Information
```bash
curl -w "@curl-format.txt" -s -X POST http://localhost:4002/api/query \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"query": "Hello"}' | jq
```

Create `curl-format.txt` with:
```
     time_namelookup:  %{time_namelookup}\n
        time_connect:  %{time_connect}\n
     time_appconnect:  %{time_appconnect}\n
    time_pretransfer:  %{time_pretransfer}\n
       time_redirect:  %{time_redirect}\n
  time_starttransfer:  %{time_starttransfer}\n
                     ----------\n
          time_total:  %{time_total}\n
```

### With Custom Headers
```bash
curl -X POST http://localhost:4002/api/query \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "User-Agent: MyApp/1.0" \
  -H "X-Request-ID: test-123" \
  -d '{"query": "Hello"}' | jq
```

### Save Response to File
```bash
curl -X POST http://localhost:4002/api/query \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"query": "Show me all collections"}' \
  -o response.json
```

### Follow Redirects
```bash
curl -L -X GET http://localhost:4002/health \
  -H "Accept: application/json" | jq
```

## 🚀 Performance Testing

### Simple Load Test
```bash
# Run 100 requests with 10 concurrent connections
for i in {1..100}; do
  curl -s -X POST http://localhost:4002/api/query \
    -H "Content-Type: application/json" \
    -d '{"query": "Hello"}' &
  
  # Limit concurrent requests
  if (( i % 10 == 0 )); then
    wait
  fi
done
wait
```

### Stress Test with Different Queries
```bash
queries=(
  '{"query": "Hello"}'
  '{"query": "Show me all collections"}'
  '{"query": "Count documents in each collection"}'
  '{"query": "Find recent users"}'
)

for i in {1..20}; do
  query=${queries[$((i % 4))]}
  curl -s -X POST http://localhost:4002/api/query \
    -H "Content-Type: application/json" \
    -d "$query" > /dev/null &
done
wait
```

## 📊 Monitoring Examples

### Health Check with Timing
```bash
curl -w "Response Time: %{time_total}s\nHTTP Code: %{http_code}\n" \
  -s -o /dev/null \
  -X GET http://localhost:4002/health
```

### Monitor Response Sizes
```bash
curl -w "Size: %{size_download} bytes\nTime: %{time_total}s\n" \
  -s -o /dev/null \
  -X POST http://localhost:4002/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Show me all collections"}'
```

### Check Service Availability
```bash
# Simple availability check
if curl -s -f http://localhost:4002/health > /dev/null; then
  echo "✅ Service is available"
else
  echo "❌ Service is not available"
fi
```

## 🔄 Batch Operations

### Multiple Queries in Sequence
```bash
queries=(
  "Hello, how are you?"
  "What collections exist in the database?"
  "Count documents in each collection"
  "Find users created today"
  "Show me database statistics"
)

for query in "${queries[@]}"; do
  echo "🔍 Query: $query"
  curl -s -X POST http://localhost:4002/api/query \
    -H "Content-Type: application/json" \
    -d "{\"query\": \"$query\"}" | jq '.data.result'
  echo "---"
done
```

### Test All Endpoints
```bash
endpoints=(
  "GET /health"
  "GET /info"
  "GET /api/tools"
  "POST /api/query"
)

echo "Testing all endpoints..."

# Health
curl -s http://localhost:4002/health | jq '.status'

# Info
curl -s http://localhost:4002/info | jq '.service'

# Tools
curl -s http://localhost:4002/api/tools | jq 'length'

# Query
curl -s -X POST http://localhost:4002/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Hello"}' | jq '.success'
```

## 🛠️ Debugging Examples

### Debug with Full Headers
```bash
curl -D headers.txt -X POST http://localhost:4002/api/query \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"query": "Hello"}' | jq

echo "Response headers:"
cat headers.txt
```

### Trace Network Issues
```bash
curl --trace-ascii trace.log -X POST http://localhost:4002/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Hello"}' | jq

echo "Network trace saved to trace.log"
```

### Test with Different Content Types
```bash
# Test with explicit charset
curl -X POST http://localhost:4002/api/query \
  -H "Content-Type: application/json; charset=utf-8" \
  -H "Accept: application/json" \
  -d '{"query": "Hello"}' | jq
```

## 📝 Response Format Examples

All successful responses follow this format:

```json
{
  "success": true,
  "data": {
    "result": "AI response here",
    "toolCalls": [
      {
        "tool": "tool_name",
        "input": {...},
        "output": {...}
      }
    ],
    "processingTime": 1234
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

Error responses follow this format:

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": {...}
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 🎯 Tips for Effective Testing

1. **Use jq for JSON formatting**: Always pipe JSON responses through `jq` for better readability
2. **Save responses**: Use `-o filename.json` to save responses for analysis
3. **Monitor timing**: Use `-w` flag to measure response times
4. **Test error cases**: Always test invalid inputs to ensure proper error handling
5. **Use verbose mode**: Add `-v` flag when debugging connection issues
6. **Set timeouts**: Use `-m seconds` to set request timeouts
7. **Test concurrency**: Use background processes (`&`) to test concurrent requests
8. **Check exit codes**: Use `$?` to check if curl command succeeded

## 🔗 Related Documentation

- [Integration Guide](../docs/FASTIFY-API-INTEGRATION.md)
- [API Documentation](README.md)
- [Environment Configuration](.env.example)