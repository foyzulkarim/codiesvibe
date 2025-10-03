# Minimal MVP Task List - Just Get It Working! 🚀

## Goal
Get a working API where you send a prompt and it uses LangGraph + MongoDB MCP to query your database. That's it!

---

## Task 1: Setup Docker Environment
**What to do:** Create a simple docker-compose.yml that starts MongoDB and MongoDB MCP server

**Files to create:**
- `docker-compose.yml`

**Services needed:**
- MongoDB (port 27017)
- MongoDB MCP Server (official image, HTTP mode on port 3000)

**Environment variables for MCP:**
- Connection string to MongoDB
- HTTP transport mode
- Disable read-only mode

**Done when:** You can run `docker-compose up` and both services start without errors

---

## Task 2: Basic Fastify Server Setup
**What to do:** Create a minimal Fastify server using typescript that responds to health check

**Files to create:**
- `package.json` with dependencies:
  - fastify
  - @langchain/community
  - @langchain/core
  - langgraph
  - axios
  - zod
  - ollama
- `server.ts` (main server file)

**Server features:**
- Listen on port 4002
- Single route: `GET /health` returns `{ status: 'ok' }`
- Basic logging enabled

**Done when:** You can run `node server.js` and visit `http://localhost:4002/health`

---

## Task 3: MCP Client - Just the Basics
**What to do:** Create a simple class that talks to the MCP server

**File to create:**
- `mcp-client.ts` (main client file)

**What it needs:**
- Method to fetch tool list from MCP server
- Method to call a tool by name with arguments
- Use axios to make HTTP POST requests to `http://localhost:3000`
- Parse the JSON-RPC response and extract the text content

**Done when:** You can call `mcpClient.listTools()` and `mcpClient.callTool('list-databases', {})` and get results

---

## Task 4: Convert MCP Tools to LangChain Format
**What to do:** Take MCP tool definitions and make them work with LangChain

**File to create:**
- `tools.ts` (main tools file)

**What it needs:**
- Function that takes MCP tools and converts them to LangChain tools
- Handle JSON Schema → Zod conversion (just basic types: string, number, object)
- Each tool should call the MCP client when executed
- Return array of LangChain-compatible tools

**Done when:** You can pass MCP tools through this converter and get LangChain tools that work

---

## Task 5: Simple LangGraph Agent
**What to do:** Create the simplest possible LangGraph agent

**File to create:**
- `agent.ts` (main agent file)

**What it needs:**
- Use Ollama (locally running) with llama3.2 or similar
- Create a basic LangGraph workflow:
  - Agent node (calls LLM with tools)
  - Tool node (executes tools)
  - Simple routing (if tool calls → run tools, else → end)
- Method to process a user query and return response

**Done when:** You can send a query like "list databases" and the agent calls the right tool

---

## Task 6: Connect Everything in Main Server
**What to do:** Wire up the API endpoint that uses the agent

**Update file:**
- `server.ts`

**What to add:**
- Initialize MCP client
- Fetch tools and create LangGraph agent on startup
- Add route: `POST /api/query` that:
  - Takes `{ prompt: "your question" }` in body
  - Calls the agent with the prompt
  - Returns the agent's response

**Done when:** You can POST to `/api/query` with a prompt and get an answer

---

## Task 7: Add Basic Error Handling
**What to do:** Don't crash on errors, just return error messages

**Update files:**
- `server.ts`
- `mcp-client.ts`
- `agent.ts`

**What to add:**
- Try/catch blocks around MCP calls
- Try/catch blocks around agent calls
- Return friendly error messages instead of crashing
- Log errors to console

**Done when:** Bad requests return errors instead of crashing the server

---

## Task 8: Add Simple Instructions
**What to do:** Create a basic README so you remember how to run this

**File to create:**
- `README.md`

**What to include:**
1. How to start Ollama (if not running)
2. How to start Docker services: `docker-compose up`
3. How to install dependencies: `npm install`
4. How to start server: `tsx server.ts`
5. Example curl command to test:
```bash
curl -X POST http://localhost:4002/api/query \
  -H "Content-Type: application/json" \
  -d '{"prompt": "show me all databases"}'
```

**Done when:** You can follow the README and get everything running

---

## That's It! 🎉

**Total tasks: 8**

**What you'll have:**
- Docker running MongoDB + MCP Server
- Fastify API on port 4002
- One endpoint: `POST /api/query`
- LangGraph agent that can understand questions and use MongoDB tools
- Basic error handling

**Test it works:**
```bash
# Start services
docker-compose up -d

# Start Ollama (separate terminal)
ollama serve

# Start your app
node server.js

# Test it
curl -X POST http://localhost:4002/api/query \
  -H "Content-Type: application/json" \
  -d '{"prompt": "list all databases"}'
```

**You should see:** The agent understanding your question, calling the MongoDB tool, and returning results!

---

## File Structure
```
project/
├── docker-compose.yml
├── package.json
├── server.js
├── mcp-client.js
├── tools.js
├── agent.js
└── README.md
```

That's literally it. 7 files. No complicated architecture. Just the basics to see it work.
