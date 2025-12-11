# Development Guide

Local development workflow and guidelines for the CodiesVibe Search API.

## Table of Contents

- [Local Setup](#local-setup)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Debugging](#debugging)

---

## Local Setup

See [Installation Guide](INSTALLATION.md#local-development-setup) for complete setup instructions.

**Quick Start:**
```bash
npm install
docker-compose -f docker-compose.infra.yml up -d
npm run dev
```

---

## Available Scripts

### Development

| Script | Description |
|--------|-------------|
| `npm run dev` | Start with hot reload (tsx watch) |
| `npm run dev:nodemon` | Start with nodemon (alternative) |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run start` | Run compiled code |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` | Run ESLint |

### Testing

| Script | Description |
|--------|-------------|
| `npm test` | Run unit tests (Jest) |
| `npm run test:e2e` | Run E2E tests |
| `npm run test:cov` | Run tests with coverage |
| `npm run test:integration` | Run integration tests |

### Database

| Script | Description |
|--------|-------------|
| `npm run create-collections` | Create Qdrant collections |
| `npm run seed-vectors` | Seed vectors from MongoDB |
| `npm run seed-vectors -- --force` | Force re-seed (clears data) |

### Debug Scripts

| Script | Description |
|--------|-------------|
| `npm run test:script:intent` | Test intent extractor only |
| `npm run test:script:plan` | Test query planner only |
| `npm run test:script:executor` | Test query executor only |
| `npm run test:script:pipeline` | Test full pipeline |

### Production

| Script | Description |
|--------|-------------|
| `npm run build:prod` | Production build (no sourcemaps) |
| `npm run start:prod` | Start in production mode |
| `npm run start:prod:pm2` | Start with PM2 |
| `npm run deploy:prod` | Build and deploy with PM2 |

---

## Project Structure

```
search-api/
├── src/
│   ├── core/                   # Domain-agnostic framework
│   │   ├── types/              # Schema types & interfaces
│   │   ├── validators/         # Schema validation
│   │   ├── prompts/            # Dynamic prompt generation
│   │   └── pipeline.init.ts    # Schema wiring
│   ├── domains/                # Domain-specific logic
│   │   └── tools/
│   │       ├── tools.schema.ts     # Tools domain schema
│   │       ├── tools.filters.ts    # Filter mapping
│   │       └── tools.validators.ts # Query plan validation
│   ├── graphs/                 # LangGraph orchestration
│   │   ├── agentic-search.graph.ts # Main graph
│   │   └── nodes/              # Pipeline nodes
│   │       ├── cache-check.node.ts
│   │       ├── intent-extractor.node.ts
│   │       ├── query-planner.node.ts
│   │       ├── query-executor.node.ts
│   │       └── cache-store.node.ts
│   ├── services/               # Business logic services
│   │   ├── embedding.service.ts
│   │   ├── qdrant.service.ts
│   │   ├── vector-indexing.service.ts
│   │   ├── health-check.service.ts
│   │   ├── metrics.service.ts
│   │   └── circuit-breaker.service.ts
│   ├── middleware/             # Express middleware
│   │   ├── clerk-auth.middleware.ts
│   │   ├── correlation.middleware.ts
│   │   ├── rate-limiters.ts
│   │   └── timeout.middleware.ts
│   ├── routes/                 # API routes
│   │   ├── tools.routes.ts
│   │   └── sync.routes.ts
│   ├── config/                 # Configuration
│   │   ├── database.ts
│   │   ├── logger.ts
│   │   └── http-client.ts
│   ├── utils/                  # Utility functions
│   └── server.ts               # Express server
├── test/                       # Test files
├── docs/                       # Documentation
├── logs/                       # Log files
├── Dockerfile                  # Docker image
├── docker-compose.yml          # Service orchestration
├── tsconfig.json              # TypeScript config
├── jest.config.js             # Jest config
└── openapi.yaml               # API specification
```

---

## Development Workflow

### 1. Create Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Changes

Edit code in `src/` directory with hot reload:
```bash
npm run dev
```

### 3. Test Changes

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Unit tests
npm test

# E2E tests
npm run test:e2e
```

### 4. Commit Changes

```bash
git add .
git commit -m "feat(scope): description"
git push origin feature/your-feature-name
```

See [Contributing Guide](CONTRIBUTING.md) for commit message format.

---

## Code Standards

### TypeScript

- **Strict Mode**: Enabled in `tsconfig.json`
- **ESLint**: Run before commits
- **Naming Conventions**:
  - Files: `kebab-case.ts`
  - Classes: `PascalCase`
  - Functions: `camelCase`
  - Constants: `SCREAMING_SNAKE_CASE`

### Module Path Aliases

Use `#` prefix for imports:

```typescript
import { searchLogger } from '#config/logger';
import { StateAnnotation } from '#types/state';
import { toolsSchema } from '#domains/tools/tools.schema';
```

Available aliases:
- `#config` → `./dist/config`
- `#types` → `./dist/types`
- `#services` → `./dist/services`
- `#middleware` → `./dist/middleware`
- `#routes` → `./dist/routes`
- `#graphs` → `./dist/graphs`
- `#core` → `./dist/core`
- `#domains` → `./dist/domains`

### Code Style

- **Formatting**: Consistent indentation (2 spaces)
- **Comments**: JSDoc for public functions
- **Error Handling**: Always use try-catch for async operations
- **Logging**: Use `searchLogger` from `#config/logger`

---

## Debugging

### Debug Mode

Enable detailed logging:

```bash
# Set in .env
LOG_LEVEL=debug

# Or via environment variable
LOG_LEVEL=debug npm run dev
```

### Debug Search Pipeline

```bash
# Test specific components
npm run test:script:intent      # Intent extractor
npm run test:script:plan        # Query planner
npm run test:script:executor    # Query executor
npm run test:script:pipeline    # Full pipeline
```

### Debug API Request

Enable debug flag in search request:

```bash
curl -X POST http://localhost:4003/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "test",
    "debug": true
  }'
```

Response includes:
- Node execution times
- Vector query details
- Execution path
- Error traces

### VS Code Debugging

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Server",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "skipFiles": ["<node_internals>/**"],
      "console": "integratedTerminal"
    }
  ]
}
```

### Logging

View logs in real-time:

```bash
# Docker
docker-compose logs -f search-api

# Local
tail -f logs/search-api.log
tail -f logs/security.log
```

---

[← Back to README](../README.md)
