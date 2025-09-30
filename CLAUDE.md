# CodiesVibe Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-09-24

## Active Technologies
- TypeScript with React + Vite frontend, NestJS backend
- MongoDB database with AI tools collection (external, not containerized)
- Jest for unit tests, React Testing Library for frontend
- Docker and Docker Compose for containerization
- Nginx/Alpine for optimized static file serving and minimal container footprint
- Cloudflare Tunnels for secure external access and SSL termination
- GitHub Actions for CI/CD with GitHub Container Registry (ghcr.io)
- Search and sort functionality for AI tools directory
- Container optimization with multi-stage builds for production efficiency

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
- Infrastructure: npm run infra:start, npm run infra:stop, npm run infra:status
- Development: npm run dev (frontend), cd backend && npm run dev (backend)
- Production: docker-compose -f docker-compose.production.yml up -d
- Cloudflare: docker-compose -f docker-compose.cloudflare.yml up -d
- Health checks: curl http://localhost:3000/health, curl http://localhost:4000/health
- Container optimization: docker build -f Dockerfile.frontend --target production
- Performance testing: docker stats, ab -n 1000 -c 10, docker images --format table
- Database seeding: cd backend && npm run seed

## Code Style
- Use React hooks (useState, useEffect) for state management
- NestJS decorators for validation and API documentation
- MongoDB aggregation pipelines for complex queries
- Follow TDD principles with failing tests first
- Multi-stage Docker builds for TypeScript applications
- Alpine Linux base images for security and size optimization
- Non-root user execution in containers
- Environment-based configuration with Docker secrets

## Development Workflow

**Local Development Approach:**
1. Start infrastructure: `npm run infra:start`
2. Verify services are healthy via health checks
3. Configure frontend environment: `cp .env.example .env.local`
4. Configure backend environment: `cp backend/.env.example backend/.env`
5. Start development servers natively for maximum speed

**Environment Variables:**
- Frontend: Copy `.env.example` to `.env.local` for frontend development configuration
- Backend: Copy `backend/.env.example` to `backend/.env` for backend configuration
- Use localhost addresses for local development (localhost:27017, localhost:6379)
- Infrastructure services run in Docker, applications run natively
- Frontend uses `VITE_API_URL=http://localhost:4000/api` to connect to backend

**Port Strategy:**
- Infrastructure: Standard ports (27017, 6379, 9090, etc.)
- Applications: 3000 (frontend), 4000 (backend) running natively
- No port conflicts as applications run outside containers

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
- 006-frontend-container-optimization: Added nginx/alpine optimization for 95% memory reduction and 90% image size reduction
- 005-i-am-thinking: Added comprehensive Docker containerization with multiple deployment strategies
- Phase 0.5: Added infrastructure stack (docker-compose.infra.yml) with MongoDB, Redis, monitoring

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->