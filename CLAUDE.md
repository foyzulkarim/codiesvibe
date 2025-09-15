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

## Recent Changes
- 005-i-am-thinking: Added comprehensive Docker containerization with multiple deployment strategies
- 004-build-a-search: Added search and sort system with button-triggered filtering, text highlighting, and results counter

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->