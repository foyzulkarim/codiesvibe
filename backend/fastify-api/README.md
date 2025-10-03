# Fastify API with LangGraph & MongoDB MCP Integration

A high-performance AI-powered API service built with Fastify, integrating LangGraph for AI workflows and MongoDB MCP (Model Context Protocol) for database operations.

## 🚀 Features

- **AI Query Processing**: Process natural language queries using LangGraph and Ollama
- **MongoDB Integration**: Database operations via MCP (Model Context Protocol)
- **Tool Execution**: Dynamic tool discovery and execution
- **Comprehensive Logging**: Structured logging with Pino
- **Error Handling**: Circuit breaker pattern and retry mechanisms
- **Health Monitoring**: Health checks and service status endpoints
- **CORS Support**: Configurable cross-origin resource sharing

## 📋 Prerequisites

- Node.js 18+ 
- TypeScript 5+
- Ollama running locally (default: http://localhost:11434)
- MongoDB MCP server running (default: http://localhost:3001)

## 🛠️ Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start the service:**
```bash
# Development mode with hot reload
npm run dev

# Production mode
npm start
```

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment mode |
| `PORT` | `4002` | Server port |
| `HOST` | `0.0.0.0` | Server host |
| `LOG_LEVEL` | `info` | Logging level |
| `CORS_ORIGIN` | `http://localhost:3000` | CORS allowed origins |
| `MCP_SERVER_URL` | `http://localhost:3001` | MongoDB MCP server URL |
| `MCP_TIMEOUT` | `30000` | MCP request timeout (ms) |
| `MCP_RETRY_ATTEMPTS` | `3` | MCP retry attempts |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama server URL |
| `OLLAMA_MODEL` | `llama3.2` | Ollama model name |
| `OLLAMA_TIMEOUT` | `60000` | Ollama request timeout (ms) |

## 🔌 API Endpoints

### Health & Info

#### `GET /health`
Returns service health status and dependency information.

**Response:**
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

#### `GET /info`
Returns detailed service information and configuration.

### AI Operations

#### `GET /api/tools`
Retrieves all available AI tools with their schemas.

**Response:**
```json
{
  "success": true,
  "data": {
    "langchainTools": [...],
    "mcpTools": [...],
    "totalCount": 15,
    "mcpToolCount": 15
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### `POST /api/query`
Processes AI queries using available tools.

**Request:**
```json
{
  "query": "Find all users with email containing 'john'"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "query": "Find all users with email containing 'john'",
    "result": "Found 3 users matching the criteria...",
    "toolCalls": [
      {
        "tool": "mongodb_find",
        "input": {
          "collection": "users",
          "filter": { "email": { "$regex": "john", "$options": "i" } }
        },
        "output": "..."
      }
    ],
    "processingTimeMs": 1250,
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

## 🔗 Integration with NestJS API

The Fastify API integrates seamlessly with the existing NestJS API through HTTP endpoints.

### NestJS Integration Endpoints

The NestJS API provides proxy endpoints for AI functionality:

- `POST /ai/query` - Process AI queries
- `GET /ai/tools` - Get available tools
- `GET /ai/health` - Check AI service health

### Example Usage from NestJS

```typescript
// In your NestJS service
import { HttpService } from '@nestjs/axios';

@Injectable()
export class AIService {
  constructor(private httpService: HttpService) {}

  async processQuery(query: string) {
    const response = await this.httpService.post(
      `${process.env.FASTIFY_API_URL}/api/query`,
      { query }
    ).toPromise();
    
    return response.data;
  }
}
```

## 🧪 Testing

### Manual Testing with cURL

#### Health Check
```bash
curl -X GET http://localhost:4002/health
```

#### Get Available Tools
```bash
curl -X GET http://localhost:4002/api/tools
```

#### Process AI Query
```bash
curl -X POST http://localhost:4002/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Show me all users in the database"}'
```

#### Complex Query Example
```bash
curl -X POST http://localhost:4002/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Find users created in the last 7 days and group them by role"}'
```

### Testing via NestJS Proxy
```bash
# Through NestJS API (port 4001)
curl -X POST http://localhost:4001/ai/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Count total number of documents in each collection"}'
```

## 🏗️ Architecture

### Components

1. **MCP Client** (`src/mcp/`): Handles MongoDB MCP server communication
2. **LangGraph Agent** (`src/langchain/`): AI workflow orchestration
3. **Tool Converter** (`src/langchain/tool-converter.ts`): Converts MCP tools to LangChain format
4. **Error Handling** (`src/utils/error-handler.ts`): Comprehensive error management
5. **Logging** (`src/utils/logger.ts`): Structured logging with Pino

### Data Flow

```
Client Request → Fastify Router → LangGraph Agent → Tool Execution → MCP Server → MongoDB
                                      ↓
Response ← JSON Formatter ← Result Processor ← Tool Response ← Query Result
```

## 🔧 Development

### Project Structure
```
src/
├── mcp/           # MongoDB MCP client
├── langchain/     # LangGraph agent and tools
├── utils/         # Logging and error handling
└── types/         # TypeScript type definitions
```

### Adding New Tools

1. Tools are automatically discovered from the MCP server
2. The `MCPToolConverter` converts MCP tools to LangChain format
3. Tools are available immediately after server restart

### Debugging

Enable debug logging:
```bash
LOG_LEVEL=debug npm run dev
```

View logs in structured format:
```bash
npm run dev | npx pino-pretty
```

## 🚨 Error Handling

The service implements comprehensive error handling:

- **Circuit Breaker**: Prevents cascade failures
- **Retry Logic**: Automatic retry with exponential backoff
- **Validation**: Request/response validation
- **Logging**: All errors are logged with context

### Common Error Responses

#### Service Unavailable (503)
```json
{
  "error": "ServiceUnavailable",
  "message": "The AI agent is not initialized. Please try again later.",
  "statusCode": 503,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### Validation Error (400)
```json
{
  "error": "ValidationError",
  "message": "Query must be a non-empty string",
  "statusCode": 400,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/query"
}
```

## 📊 Monitoring

### Health Checks

The service provides comprehensive health checks:
- MCP server connectivity
- Agent initialization status
- Tool availability
- Circuit breaker state

### Logging

Structured JSON logs include:
- Request/response details
- Tool execution traces
- Error context
- Performance metrics

## 🔒 Security

- Input validation on all endpoints
- Request size limits
- CORS configuration
- Error message sanitization
- No sensitive data in logs

## 🚀 Deployment

### Docker
```bash
docker build -f Dockerfile.fastify -t fastify-api .
docker run -p 4002:4002 --env-file .env fastify-api
```

### Production Considerations

1. Set `NODE_ENV=production`
2. Configure proper CORS origins
3. Set up monitoring and alerting
4. Use process manager (PM2)
5. Configure reverse proxy (nginx)

## 🤝 Contributing

1. Follow TypeScript best practices
2. Add comprehensive error handling
3. Include structured logging
4. Write tests for new features
5. Update documentation

## 📝 License

ISC License - see LICENSE file for details.