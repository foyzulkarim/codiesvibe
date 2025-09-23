# CodiesVibe Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-09-16

## Active Technologies
- TypeScript with React + Vite frontend, NestJS backend
- MongoDB database with AI tools collection (external, not containerized)
- Jest for unit tests, React Testing Library for frontend
- Docker and Docker Compose for containerization
- Nginx for static file serving and optimization
- Cloudflare Tunnels for secure external access and SSL termination
- GitHub Actions for CI/CD with GitHub Container Registry (ghcr.io)
- Search and sort functionality for AI tools directory

## Project Structure
```
frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/
```

## Commands
- Search API: GET /api/tools/search with query and sort parameters
- Frontend components: SearchBar, ToolCard with highlighting
- Database queries: Text search with MongoDB indexes
- Docker commands: docker-compose up/down, build, logs
- Infrastructure: docker-compose -f docker-compose.infra.yml up -d
- Development: docker-compose -f docker-compose.dev.yml up -d
- Production: docker-compose -f docker-compose.production.yml up -d
- Cloudflare: docker-compose -f docker-compose.cloudflare.yml up -d
- Health checks: curl http://localhost:3000/health, curl http://localhost:4000/health

## Code Style
- Use React hooks (useState, useEffect) for state management
- NestJS decorators for validation and API documentation
- MongoDB aggregation pipelines for complex queries
- Follow TDD principles with failing tests first
- Multi-stage Docker builds for TypeScript applications
- Alpine Linux base images for security and size optimization
- Non-root user execution in containers
- Environment-based configuration with Docker secrets

## Docker Development Workflow

**Infrastructure First Approach:**
1. Start infrastructure: `docker-compose -f docker-compose.infra.yml up -d`
2. Verify services are healthy via health checks
3. Use infrastructure connection strings from `backend/.env.example`
4. Connect application containers to `codiesvibe-network`

**Environment Variables:**
- Use container network addresses (mongodb:27017, redis:6379)
- Reference `backend/.env.example` for infrastructure integration examples
- Override with `docker-compose.override.yml` for local customization

**Port Strategy:**
- Infrastructure: Standard ports (27017, 6379, 9090, etc.)
- Applications: 3000 (frontend), 4000 (backend)
- Development overrides available (3010, 4010) if conflicts occur

## Infrastructure Setup

**Quick Start Infrastructure:**
```bash
# Start all supporting services (MongoDB, Redis, Prometheus, Grafana, etc.)
docker-compose -f docker-compose.infra.yml up -d

# View services: http://localhost:3001 (Grafana), http://localhost:8081 (Mongo Express)
```

**Infrastructure Services Available:**
- MongoDB (port 27017) with admin UI at http://localhost:8081
- Redis (port 6379) for caching
- Prometheus (port 9090) for metrics collection
- Grafana (port 3001) for dashboards
- Loki (port 3100) for log aggregation
- MailHog (ports 1025/8025) for email testing

**Infrastructure Integration:**
- All services connected via `codiesvibe-network`
- See `README-infra.md` for detailed setup instructions
- See `docs/NETWORK-STRATEGY.md` for networking details
- See `docs/PORT-ALLOCATION.md` for port management

## Recent Changes
- 005-i-am-thinking: Added comprehensive Docker containerization with multiple deployment strategies
- Phase 0.5: Added infrastructure stack (docker-compose.infra.yml) with MongoDB, Redis, monitoring
- 004-build-a-search: Added search and sort system with button-triggered filtering, text highlighting, and results counter

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->