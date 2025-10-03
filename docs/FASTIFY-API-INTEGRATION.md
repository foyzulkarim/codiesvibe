# Fastify API Integration Guide

This document provides comprehensive instructions for integrating and testing the Fastify API service with LangGraph and MongoDB MCP.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   NestJS API    │    │   Fastify API   │
│   (Port 3000)   │◄──►│   (Port 4001)   │◄──►│   (Port 4002)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │   MongoDB MCP   │
                                               │   (Port 3001)   │
                                               └─────────────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │    MongoDB      │
                                               │   (Port 27017)  │
                                               └─────────────────┘
```

## 🚀 Quick Start

### 1. Prerequisites

Ensure all services are running:

```bash
# Terminal 1: Start MongoDB (if not using Docker)
mongod

# Terminal 2: Start MongoDB MCP Server
cd /path/to/mcp-server
npm start

# Terminal 3: Start Ollama
ollama serve

# Terminal 4: Start Fastify API
cd backend/fastify-api
npm run dev

# Terminal 5: Start NestJS API
cd backend/nestjs-api
npm run start:dev
```

### 2. Verify Services

Check all services are healthy:

```bash
# Check Fastify API
curl http://localhost:4002/health

# Check NestJS API
curl http://localhost:4001/health

# Check MongoDB MCP
curl http://localhost:3001/health

# Check Ollama
curl http://localhost:11434/api/tags
```

## 🧪 Testing Guide

### Direct Fastify API Testing

#### 1. Health Check
```bash
curl -X GET http://localhost:4002/health \
  -H "Accept: application/json" | jq
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "fastify-api",
  "version": "1.0.0",
  "port": 4002,
  "dependencies": {
    "mcp": {
      "connected": true,
      "toolCount": 15,
      "baseUrl": "http://localhost:3001",
      "circuitBreaker": "CLOSED"
    },
    "agent": {
      "initialized": true,
      "toolCount": 15,
      "llmConfig": {
        "model": "llama3.2",
        "baseUrl": "http://localhost:11434"
      }
    }
  }
}
```

#### 2. Get Available Tools
```bash
curl -X GET http://localhost:4002/api/tools \
  -H "Accept: application/json" | jq
```

#### 3. Simple Query
```bash
curl -X POST http://localhost:4002/api/query \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"query": "Hello, how are you?"}' | jq
```

#### 4. Database Query
```bash
curl -X POST http://localhost:4002/api/query \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"query": "Show me all collections in the database"}' | jq
```

#### 5. Complex Database Operation
```bash
curl -X POST http://localhost:4002/api/query \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"query": "Find all users created in the last 7 days and count them by role"}' | jq
```

### NestJS Proxy Testing

#### 1. AI Health Check via NestJS
```bash
curl -X GET http://localhost:4001/ai/health \
  -H "Accept: application/json" | jq
```

#### 2. Get Tools via NestJS
```bash
curl -X GET http://localhost:4001/ai/tools \
  -H "Accept: application/json" | jq
```

#### 3. Process Query via NestJS
```bash
curl -X POST http://localhost:4001/ai/query \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"query": "Count total documents in each collection"}' | jq
```

## 📝 Test Scenarios

### Scenario 1: Basic AI Interaction
```bash
# Test simple conversation
curl -X POST http://localhost:4002/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What can you help me with?"}' | jq '.data.result'
```

### Scenario 2: Database Schema Discovery
```bash
# Discover database structure
curl -X POST http://localhost:4002/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What collections exist in the database and what are their schemas?"}' | jq
```

### Scenario 3: Data Retrieval
```bash
# Get specific data
curl -X POST http://localhost:4002/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Show me the first 5 users from the users collection"}' | jq
```

### Scenario 4: Data Analysis
```bash
# Analyze data patterns
curl -X POST http://localhost:4002/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Analyze user registration trends over the last month"}' | jq
```

### Scenario 5: Complex Aggregation
```bash
# Complex database operations
curl -X POST http://localhost:4002/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Group users by their registration date and show the count for each day in the last week"}' | jq
```

## 🔍 Debugging

### Enable Debug Logging

1. **Fastify API Debug Mode:**
```bash
cd backend/fastify-api
LOG_LEVEL=debug npm run dev
```

2. **View Structured Logs:**
```bash
cd backend/fastify-api
npm run dev | npx pino-pretty
```

### Common Issues and Solutions

#### Issue 1: MCP Server Not Connected
**Symptoms:** `"connected": false` in health check

**Solution:**
```bash
# Check MCP server status
curl http://localhost:3001/health

# Restart MCP server if needed
cd /path/to/mcp-server
npm restart
```

#### Issue 2: Ollama Not Available
**Symptoms:** Agent initialization fails

**Solution:**
```bash
# Check Ollama status
curl http://localhost:11434/api/tags

# Start Ollama if not running
ollama serve

# Pull required model
ollama pull llama3.2
```

#### Issue 3: Circuit Breaker Open
**Symptoms:** `"circuitBreaker": "OPEN"` in health check

**Solution:**
```bash
# Wait for circuit breaker to reset (default: 60 seconds)
# Or restart the Fastify API service
```

### Monitoring Requests

#### Monitor Fastify API Logs
```bash
cd backend/fastify-api
tail -f logs/app.log | npx pino-pretty
```

#### Monitor Network Traffic
```bash
# Monitor HTTP requests to Fastify API
sudo tcpdump -i lo0 -A -s 0 'port 4002'

# Monitor HTTP requests to MCP server
sudo tcpdump -i lo0 -A -s 0 'port 3001'
```

## 🧪 Automated Testing Script

Create a comprehensive test script:

```bash
#!/bin/bash
# test-integration.sh

echo "🧪 Testing Fastify API Integration..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
    local name="$1"
    local method="$2"
    local url="$3"
    local data="$4"
    local expected_status="$5"
    
    echo -e "\n${YELLOW}Testing: $name${NC}"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "%{http_code}" -X GET "$url" -H "Accept: application/json")
    else
        response=$(curl -s -w "%{http_code}" -X POST "$url" \
            -H "Content-Type: application/json" \
            -H "Accept: application/json" \
            -d "$data")
    fi
    
    status_code="${response: -3}"
    body="${response%???}"
    
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC} - Status: $status_code"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    else
        echo -e "${RED}❌ FAIL${NC} - Expected: $expected_status, Got: $status_code"
        echo "$body"
    fi
}

# Run tests
echo "🚀 Starting Integration Tests..."

# Health checks
test_endpoint "Fastify Health Check" "GET" "http://localhost:4002/health" "" "200"
test_endpoint "NestJS Health Check" "GET" "http://localhost:4001/health" "" "200"
test_endpoint "NestJS AI Health Check" "GET" "http://localhost:4001/ai/health" "" "200"

# Tool endpoints
test_endpoint "Get Fastify Tools" "GET" "http://localhost:4002/api/tools" "" "200"
test_endpoint "Get NestJS AI Tools" "GET" "http://localhost:4001/ai/tools" "" "200"

# Query endpoints
test_endpoint "Simple Fastify Query" "POST" "http://localhost:4002/api/query" '{"query": "Hello"}' "200"
test_endpoint "Simple NestJS AI Query" "POST" "http://localhost:4001/ai/query" '{"query": "Hello"}' "200"
test_endpoint "Database Query" "POST" "http://localhost:4002/api/query" '{"query": "Show me all collections"}' "200"

# Error cases
test_endpoint "Invalid Query Format" "POST" "http://localhost:4002/api/query" '{"invalid": "data"}' "400"
test_endpoint "Empty Query" "POST" "http://localhost:4002/api/query" '{"query": ""}' "400"

echo -e "\n🏁 Integration tests completed!"
```

Make it executable and run:
```bash
chmod +x test-integration.sh
./test-integration.sh
```

## 📊 Performance Testing

### Load Testing with Apache Bench

```bash
# Test health endpoint
ab -n 100 -c 10 http://localhost:4002/health

# Test simple queries
ab -n 50 -c 5 -p query.json -T application/json http://localhost:4002/api/query
```

Where `query.json` contains:
```json
{"query": "Hello, how are you?"}
```

### Stress Testing with curl

```bash
# Concurrent requests
for i in {1..10}; do
  curl -X POST http://localhost:4002/api/query \
    -H "Content-Type: application/json" \
    -d '{"query": "Test query '$i'"}' &
done
wait
```

## 🔧 Configuration Testing

### Environment Variable Testing

Test different configurations:

```bash
# Test with different log levels
LOG_LEVEL=debug npm run dev

# Test with different Ollama models
OLLAMA_MODEL=llama2 npm run dev

# Test with different timeouts
MCP_TIMEOUT=10000 npm run dev
```

## 📈 Monitoring and Metrics

### Key Metrics to Monitor

1. **Response Times**
   - Health check: < 100ms
   - Simple queries: < 2s
   - Complex queries: < 30s

2. **Success Rates**
   - Health checks: 100%
   - Simple queries: > 95%
   - Complex queries: > 90%

3. **Resource Usage**
   - Memory: < 512MB
   - CPU: < 50% under normal load

### Monitoring Commands

```bash
# Monitor response times
curl -w "@curl-format.txt" -s -o /dev/null http://localhost:4002/health

# Monitor memory usage
ps aux | grep "tsx.*server.ts"

# Monitor open connections
lsof -i :4002
```

Where `curl-format.txt` contains:
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

## 🚨 Troubleshooting

### Service Dependencies

Ensure services start in the correct order:
1. MongoDB
2. MongoDB MCP Server
3. Ollama
4. Fastify API
5. NestJS API

### Port Conflicts

Check for port conflicts:
```bash
# Check what's running on each port
lsof -i :3001  # MCP Server
lsof -i :4001  # NestJS API
lsof -i :4002  # Fastify API
lsof -i :11434 # Ollama
lsof -i :27017 # MongoDB
```

### Network Issues

Test network connectivity:
```bash
# Test internal service communication
curl -v http://localhost:4002/health
curl -v http://localhost:3001/health
curl -v http://localhost:11434/api/tags
```

## 📚 Additional Resources

- [Fastify Documentation](https://www.fastify.io/docs/)
- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [MongoDB MCP Protocol](https://modelcontextprotocol.io/)
- [Ollama API Reference](https://github.com/ollama/ollama/blob/main/docs/api.md)

## 🤝 Contributing

When adding new features or tests:

1. Update this documentation
2. Add corresponding test cases
3. Ensure all existing tests pass
4. Update the monitoring metrics
5. Document any new environment variables