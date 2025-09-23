# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CodiesVibe is a full-stack AI tools directory application with TypeScript + React frontend and NestJS backend, using MongoDB for data persistence.

## Architecture

**Frontend (root directory):**
- React 18 + TypeScript with Vite build system
- shadcn/ui components with Radix UI primitives
- TanStack Query for API state management
- React Router for navigation
- Tailwind CSS for styling

**Backend (./backend):**
- NestJS framework with TypeScript
- MongoDB with Mongoose ODM
- JWT authentication with GitHub OAuth
- Comprehensive API documentation with Swagger
- Rate limiting and caching with Redis-like interface

## Essential Commands

### Backend Development
```bash
cd backend
npm run dev              # Start development server with hot reload
npm run build           # Build for production
npm run start:prod      # Start production server
npm run test            # Run unit tests
npm run test:e2e        # Run end-to-end tests
npm run test:cov        # Run tests with coverage
npm run lint            # Run ESLint
npm run typecheck       # TypeScript type checking
npm run seed            # Seed database with sample data
```

### Frontend Development
```bash
npm run dev             # Start Vite development server
npm run build           # Build for production
npm run build:dev       # Build in development mode
npm run preview         # Preview production build
npm run lint            # Run ESLint
npm run typecheck       # TypeScript type checking
```

## Database & Environment

**MongoDB Setup:**
- Default connection: `mongodb://localhost:27017/nestjs-api`
- Tools collection with comprehensive schema validation
- Text search indexes for search functionality
- Seeding system with versioned data migrations

**Environment Variables (.env in backend):**
- `PORT`: Server port (default: 3000)
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: JWT signing secret
- `GITHUB_CLIENT_ID/SECRET`: OAuth configuration
- `NODE_ENV`: Environment mode

## Key Architecture Patterns

**Backend Patterns:**
- Module-based architecture (AppModule, ToolsModule, DatabaseModule, HealthModule)
- DTOs with class-validator for request validation
- Custom validators for business logic
- Exception filters for consistent error responses
- Mongoose schemas with comprehensive validation

**Frontend Patterns:**
- Component composition with shadcn/ui
- Custom hooks for API interactions
- Type-safe API client with axios
- Route-based code splitting

## API Structure

**Core Endpoints:**
- `GET /api/tools` - List tools with filtering/search/pagination
- `GET /api/tools/search` - Advanced search with text indexing
- `POST /api/tools` - Create new tool (authenticated)
- `GET /api/tools/:id` - Get tool details
- `PATCH /api/tools/:id` - Update tool (authenticated)
- `DELETE /api/tools/:id` - Delete tool (authenticated)
- `GET /health` - Health check endpoint

**Query Parameters:**
- Search: `q`, `search`, `sortBy`, `sortOrder`
- Filters: `functionality[]`, `pricing[]`, `interface[]`, `deployment[]`, `tags[]`
- Pagination: `page`, `limit`
- Ranges: `minRating`, `maxRating`, `minPopularity`, `maxPopularity`

## Testing Strategy

**Backend Testing:**
- Jest with ts-jest for TypeScript support
- MongoDB Memory Server for isolated database testing
- Supertest for HTTP endpoint testing
- E2E tests in `/test` directory with separate Jest config

**Test Commands:**
- Unit tests: Automatically discovered `*.spec.ts` files
- E2E tests: `*.e2e-spec.ts` files in test directory
- Coverage reports generated in `/coverage`

## Key Dependencies

**Backend Core:**
- `@nestjs/common`, `@nestjs/core` - NestJS framework
- `@nestjs/mongoose` - MongoDB integration
- `@nestjs/swagger` - API documentation
- `@nestjs/jwt`, `@nestjs/passport` - Authentication
- `class-validator`, `class-transformer` - Validation
- `mongodb-memory-server` - Testing

**Frontend Core:**
- `react`, `react-dom` - React framework
- `@tanstack/react-query` - Server state management
- `react-router-dom` - Routing
- `axios` - HTTP client
- `@radix-ui/*` - UI primitives
- `tailwindcss` - Styling

## Development Workflow

1. **Backend Changes:** Modify in `./backend/src`, run tests, check types
2. **Frontend Changes:** Modify in `./src`, ensure components follow shadcn patterns
3. **API Changes:** Update DTOs, run backend tests, verify frontend integration
4. **Database Changes:** Update schemas, create new seed versions if needed

## Important Notes

- Always run `npm run typecheck` before committing
- Backend uses MongoDB with strict schema validation
- Frontend components should follow existing shadcn/ui patterns
- Authentication is required for POST/PATCH/DELETE operations
- Search functionality uses MongoDB text indexes for performance
- Seed data is versioned - create new version files for schema changes