# Updated Fastify Server Plan - Integrated with Backend Architecture 🚀

## Goal
Create a simple Fastify server in `backend/fastify-api/` that integrates with your existing gateway/nestjs setup and provides LangGraph + MongoDB MCP functionality.

---

## Task 1: Setup Fastify Directory Structure
**What to do:** Create the fastify-api directory alongside nestjs-api

**Directory to create:**
- `backend/fastify-api/`

**Files to create:**
- `backend/fastify-api/package.json` with dependencies:
  - fastify
  - @langchain/community
  - @langchain/core
  - langgraph
  - axios
  - zod
  - ollama
  - tsx (for development)
- `backend/fastify-api/.env.example`
- `backend/fastify-api/tsconfig.json`

**Done when:** Directory structure matches nestjs-api organization

---

## Task 2: Basic Fastify Server Setup
**What to do:** Create a minimal Fastify server with TypeScript

**Files to create:**
- `backend/fastify-api/server.ts` (main server file)
- `backend/fastify-api/.env` (local environment)

**Server features:**
- Listen on port 4002 (configurable via env)
- Routes:
  - `GET /health` returns `{ status: 'ok', service: 'fastify-api' }`
  - `GET /` returns service info
- Basic logging enabled
- CORS enabled for local development

**Done when:** You can run `tsx server.ts` and visit `http://localhost:4002/health`

---

## Task 3: Docker Integration
**What to do:** Add Fastify service to existing Docker setup

**Files to update:**
- `docker-compose.backend.yml` - add fastify-api service
- `docker-compose.production.yml` - add fastify-api service

**Docker service config:**
- Build from `backend/fastify-api`
- Expose port 4002
- Connect to existing `codiesvibe-network`
- Environment variables for MongoDB connection
- Volume mount for development

**Files to create:**
- `backend/fastify-api/Dockerfile.fastify`

**Done when:** `docker compose -f docker-compose.backend.yml up -d fastify-api` works

---

## Task 4: MCP Client - Just the Basics
**What to do:** Create a simple class that talks to the MCP server

**File to create:**
- `backend/fastify-api/mcp-client.ts`

**What it needs:**
- Method to fetch tool list from MCP server
- Method to call a tool by name with arguments
- Use axios to make HTTP POST requests to MCP server
- Parse the JSON-RPC response and extract the text content
- Basic error handling and logging

**Done when:** You can call `mcpClient.listTools()` and `mcpClient.callTool('list-databases', {})` and get results

---

## Task 5: Convert MCP Tools to LangChain Format
**What to do:** Take MCP tool definitions and make them work with LangChain

**File to create:**
- `backend/fastify-api/tools.ts`

**What it needs:**
- Function that takes MCP tools and converts them to LangChain tools
- Handle JSON Schema → Zod conversion (basic types: string, number, object)
- Each tool should call the MCP client when executed
- Return array of LangChain-compatible tools
- Export utility functions for tool management

**Done when:** You can pass MCP tools through this converter and get LangChain tools that work

---

## Task 6: Simple LangGraph Agent
**What to do:** Create the simplest possible LangGraph agent

**File to create:**
- `backend/fastify-api/agent.ts`

**What it needs:**
- Use Ollama (locally running) with llama3.2 or similar
- Create a basic LangGraph workflow:
  - Agent node (calls LLM with tools)
  - Tool node (executes tools)
  - Simple routing (if tool calls → run tools, else → end)
- Method to process a user query and return response
- Export agent initialization and query functions

**Done when:** You can send a query like "list databases" and the agent calls the right tool

---

## Task 7: Connect Everything in Main Server
**What to do:** Wire up the API endpoint that uses the agent

**Update file:**
- `backend/fastify-api/server.ts`

**What to add:**
- Initialize MCP client on startup
- Fetch tools and create LangGraph agent on startup
- Add route: `POST /api/query` that:
  - Takes `{ prompt: "your question" }` in body
  - Validates input with Fastify schema
  - Calls the agent with the prompt
  - Returns the agent's response
- Add route: `GET /api/tools` to list available tools
- Graceful shutdown handling

**Done when:** You can POST to `/api/query` with a prompt and get an answer

---

## Task 8: Add Basic Error Handling & Logging
**What to do:** Don't crash on errors, return proper HTTP responses

**Update files:**
- `backend/fastify-api/server.ts`
- `backend/fastify-api/mcp-client.ts`
- `backend/fastify-api/agent.ts`

**What to add:**
- Try/catch blocks around MCP calls
- Try/catch blocks around agent calls
- Proper HTTP status codes (400, 500, etc.)
- Structured error responses
- Request/response logging
- Health check that verifies MCP connection

**Done when:** Bad requests return proper errors instead of crashing the server

---

## Task 9: Integration with Existing Services
**What to do:** Ensure Fastify can be called from NestJS and works with gateway

**What to verify:**
- Fastify server is accessible from NestJS container
- Network connectivity between services
- Consider adding Fastify routes to gateway (optional)
- Document the API for NestJS integration

**Files to update:**
- `backend/fastify-api/README.md` - document API endpoints
- Add example of calling from NestJS

**Done when:** You can make HTTP calls from NestJS to Fastify successfully

---

## Task 10: Documentation & Testing
**What to do:** Create simple documentation and test commands

**File to create:**
- `backend/fastify-api/README.md`

**What to include:**
1. How to start Ollama (if not running)
2. How to start Docker services: `docker compose -f docker-compose.backend.yml up -d`
3. How to install dependencies: `npm install`
4. How to start server: `tsx server.ts`
5. API documentation with examples
6. Example curl commands:
```bash
# Health check
curl http://localhost:4002/health

# Query the agent
curl -X POST http://localhost:4002/api/query \
  -H "Content-Type: application/json" \
  -d '{"prompt": "show me all databases"}'

# List available tools
curl http://localhost:4002/api/tools
```

**Done when:** You can follow the README and get everything running

---

## Updated File Structure
```
backend/
├── gateway/
├── nestjs-api/
└── fastify-api/
    ├── package.json
    ├── tsconfig.json
    ├── Dockerfile.fastify
    ├── .env.example
    ├── server.ts
    ├── mcp-client.ts
    ├── tools.ts
    ├── agent.ts
    └── README.md
```

## Integration Points

### Docker Network
- All services on `codiesvibe-network`
- Fastify accessible at `fastify-api:4002` from other containers
- External access at `localhost:4002`

### Service Communication
- NestJS → Fastify: `http://fastify-api:4002/api/query`
- Gateway can optionally proxy `/ai/*` to Fastify

### Environment Variables
- MongoDB connection string shared across services
- Ollama endpoint configuration
- MCP server endpoint configuration

## Testing the Complete Setup
```bash
# Start all backend services
docker compose -f docker-compose.backend.yml up -d

# Start Ollama (separate terminal)
ollama serve

# Test the integration
curl -X POST http://localhost:4002/api/query \
  -H "Content-Type: application/json" \
  -d '{"prompt": "list all databases"}'
```

**Total tasks: 10** (2 more than original for proper integration)

This updated plan maintains the simplicity you want while properly integrating with your existing backend architecture!