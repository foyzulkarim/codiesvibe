# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CodiesVibe is a production-grade AI tools directory application built with TypeScript, featuring a React + Vite frontend, NestJS backend, and comprehensive Docker containerization with multi-environment deployment strategies.

**Core Technologies:**
- **Frontend**: React 18 + TypeScript + Vite, shadcn/ui components, TanStack Query
- **Backend**: NestJS + TypeScript, MongoDB with Mongoose ODM, JWT authentication
- **Infrastructure**: Docker Compose, Nginx/Alpine, Cloudflare Tunnels, monitoring stack
- **CI/CD**: GitHub Actions with comprehensive testing and deployment pipelines
- **Database**: MongoDB with advanced indexing and search capabilities

## Architecture Overview

### High-Level Structure
```
CodiesVibe/
├── src/                    # Frontend React application
├── backend/                # NestJS backend API
├── shared/                 # Shared TypeScript types
├── scripts/                # Infrastructure and deployment scripts
├── docs/                   # Project documentation
└── Docker files           # Containerization configurations
```

### Frontend Architecture
- **State Management**: TanStack Query for server state, React hooks for local state
- **UI Framework**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens
- **Routing**: React Router with code splitting
- **API Client**: Axios with TypeScript interfaces and centralized error handling

### Backend Architecture
- **Framework**: NestJS with modular architecture (ToolsModule, DatabaseModule, HealthModule)
- **Database**: MongoDB with Mongoose ODM, comprehensive indexing strategy
- **Authentication**: JWT with GitHub OAuth integration
- **Validation**: class-validator decorators with custom business logic validators
- **API Documentation**: Swagger/OpenAPI with comprehensive endpoint documentation
- **Security**: Multi-tier rate limiting, CORS configuration, input sanitization

## Essential Commands

### Development Workflow
```bash
# 1. Start infrastructure services (required first step)
npm run infra:start                    # Start MongoDB, Redis, monitoring stack
npm run infra:status                   # Check infrastructure health
npm run infra:logs                     # View infrastructure logs

# 2. Environment setup (one-time)
cp .env.example .env.local             # Frontend environment variables
cp backend/.env.example backend/.env   # Backend environment variables

# 3. Install dependencies
npm install                            # Frontend dependencies
cd backend && npm install              # Backend dependencies

# 4. Start development servers (separate terminals)
npm run dev                            # Frontend: http://localhost:3000
cd backend && npm run dev              # Backend: http://localhost:4000

# 5. Access monitoring and tools
open http://localhost:3001             # Grafana dashboards
open http://localhost:9090             # Prometheus metrics
open http://localhost:8081             # Mongo Express (DB admin)
```

### Frontend Commands (root directory)
```bash
npm run dev                            # Start Vite dev server with HMR
npm run build                          # Production build
npm run build:dev                      # Development build
npm run preview                        # Preview production build locally
npm run lint                           # ESLint with auto-fix
npm run lint:warn                      # ESLint warnings only
npm run typecheck                      # TypeScript type checking
npm run test                           # Run tests (currently placeholder)
```

### Backend Commands (backend directory)
```bash
npm run dev                            # Development server with hot reload
npm run start:debug                    # Debug mode with inspector
npm run build                          # Build for production
npm run start:prod                     # Start production server
npm run test                           # Run unit tests with Jest
npm run test:e2e                       # End-to-end tests
npm run test:cov                       # Test coverage report
npm run test:watch                     # Watch mode for tests
npm run lint                           # ESLint with auto-fix
npm run typecheck                      # TypeScript type checking
npm run seed                           # Seed database with sample data
npm run format                         # Prettier code formatting
```

### Testing Commands
```bash
# Backend testing
cd backend && npm run test             # Unit tests
cd backend && npm run test:e2e         # End-to-end tests
cd backend && npm run test:cov         # Coverage reports
cd backend && npm run test:watch       # Watch mode

# CI/CD pipeline commands
cd backend && npm run ci:all           # Full CI pipeline
cd backend && npm run ci:test-stage    # Testing stage only
cd backend && npm run ci:security-stage # Security and license checks
```

### Production Deployment
```bash
# Production deployment with Docker
docker-compose -f docker-compose.production.yml up -d
docker-compose -f docker-compose.production.yml ps
docker-compose -f docker-compose.production.yml logs -f

# Cloudflare tunnel deployment
docker-compose -f docker-compose.cloudflare.yml up -d

# Monitoring and extended observability
docker-compose -f docker-compose.monitoring.yml up -d
```

## Database Architecture

### MongoDB Schema (Tools Collection v2.0)
The core data structure uses enhanced categorization and comprehensive indexing:

```typescript
interface Tool {
  // Identity and metadata
  id: string;                    // Unique slug-based identifier
  name: string;                  // Display name
  slug: string;                  // URL-friendly identifier
  description: string;           // Brief description
  longDescription?: string;
  tagline?: string;

  // Enhanced v2.0 categorization system
  categories: {
    primary: string[];           // 1-5 primary categories
    secondary: string[];         // 0-5 secondary categories
    industries: string[];        // 1-10 industry verticals
    userTypes: string[];         // 1-10 target user types
  };

  // Comprehensive pricing system
  pricingSummary: {
    lowestMonthlyPrice: number;
    highestMonthlyPrice: number;
    currency: string;
    hasFreeTier: boolean;
    hasCustomPricing: boolean;
    billingPeriods: string[];
    pricingModel: PricingModelEnum[]; // 'free' | 'freemium' | 'paid'
  };
  pricingDetails: PricingTier[];       // Detailed pricing tiers

  // Advanced capabilities system
  capabilities: {
    core: string[];              // Core capabilities
    aiFeatures: {                // AI-specific features
      codeGeneration: boolean;
      imageGeneration: boolean;
      dataAnalysis: boolean;
      voiceInteraction: boolean;
      multimodal: boolean;
      thinkingMode: boolean;
    };
    technical: {                 // Technical features
      apiAccess: boolean;
      webHooks: boolean;
      sdkAvailable: boolean;
      offlineMode: boolean;
    };
    integrations: {              // Integration capabilities
      platforms: string[];
      thirdParty: string[];
      protocols: string[];
    };
  };

  // Use cases with complexity levels
  useCases: UseCase[];           // Industry-specific use cases

  // Search optimization
  searchKeywords: string[];      // 5-20 keywords for search
  semanticTags: string[];        // 5-20 semantic tags
  aliases: string[];             // 0-10 alternative names

  // Legacy compatibility fields
  interface: string[];
  functionality: string[];
  deployment: string[];
  popularity: number;            // 0-1,000,000
  rating: number;               // 0-5 stars
  reviewCount: number;          // 0-1,000,000

  // Metadata
  logoUrl?: string;
  website?: string;
  documentation?: string;
  status: 'active' | 'beta' | 'deprecated' | 'discontinued';
  contributor: string;
  dateAdded: Date;
  lastUpdated?: Date;
}
```

### Database Indexing Strategy
- **Primary Indexes**: `id`, `slug`, `status`, `createdBy`
- **Search Indexes**: Full-text search with weighted fields (name, description, tags)
- **Filter Indexes**: Category filters, pricing filters, capability flags
- **Performance Indexes**: Popularity, rating, dateAdded
- **Compound Indexes**: Common query patterns (status+popularity, category+rating)

## API Architecture

### Core Endpoints
- `GET /api/tools` - List tools with advanced filtering, sorting, and pagination
- `GET /api/tools/search` - Full-text search with relevance scoring
- `GET /api/tools/:id` - Get specific tool details by ID or slug
- `POST /api/tools` - Create new tool (JWT authentication required)
- `PATCH /api/tools/:id` - Update tool (JWT authentication required)
- `DELETE /api/tools/:id` - Delete tool (JWT authentication required)
- `GET /health` - Application health check
- `GET /api/health` - Detailed backend health check
- `GET /api/docs` - Swagger API documentation

### Advanced Query Parameters
```typescript
interface ToolsQueryParams {
  // Search functionality
  search?: string;                    // Text search across multiple fields

  // Legacy filters (backward compatibility)
  functionality?: string;            // Functionality filter
  deployment?: string;                // Deployment filter
  pricing?: string;                   // Pricing filter
  interface?: string;                 // Interface filter

  // v2.0 enhanced categories
  primaryCategory?: string;          // Primary category filter
  secondaryCategory?: string;        // Secondary category filter
  industry?: string;                 // Industry filter
  userType?: string;                 // User type filter

  // v2.0 advanced pricing filters
  hasFreeTier?: boolean;             // Free tier availability
  hasCustomPricing?: boolean;         // Custom pricing support
  minPrice?: number;                 // Minimum price filter
  maxPrice?: number;                 // Maximum price filter
  pricingModel?: string;             // Pricing model filter

  // v2.0 capability filters
  codeGeneration?: boolean;          // AI code generation capability
  imageGeneration?: boolean;         // AI image generation capability
  dataAnalysis?: boolean;            // AI data analysis capability
  voiceInteraction?: boolean;         // AI voice interaction
  multimodal?: boolean;              // Multi-modal capabilities
  thinkingMode?: boolean;            // AI thinking/reasoning mode
  apiAccess?: boolean;               // API availability
  offlineMode?: boolean;             // Offline functionality

  // Sorting and pagination
  sortBy?: 'popularity' | 'rating' | 'reviewCount' | 'createdAt' | 'dateAdded' | 'relevance';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
```

## Environment Configuration

### Frontend Environment (.env.local)
```env
VITE_API_URL=http://localhost:4000/api
VITE_DEBUG=true
VITE_DEV_TOOLS=true
VITE_APP_NAME=CodiesVibe
VITE_ENVIRONMENT=development
```

### Backend Environment (backend/.env)
```env
NODE_ENV=development
PORT=4000
MONGODB_URI=mongodb://admin:password123@localhost:27017/codiesvibe?authSource=admin
REDIS_URL=redis://:redis123@localhost:6379
JWT_SECRET=dev-jwt-secret-change-in-production
CORS_ORIGIN=http://localhost:3000
```

### Production Environment (backend/.env.production)
```env
NODE_ENV=production
PORT=4000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/codiesvibe?retryWrites=true&w=majority
JWT_SECRET=your-super-secure-jwt-secret-minimum-32-characters-long
COOKIE_SECRET=your-super-secure-cookie-secret-minimum-32-characters
CSRF_SECRET=your-super-secure-csrf-secret-minimum-32-characters
CORS_ORIGIN=https://your-domain.com
TRUST_PROXY=true
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
```

## Key Development Patterns

### Frontend Patterns
- **Component Composition**: Use shadcn/ui patterns with Radix UI primitives
- **Custom Hooks**: Create reusable hooks for API interactions and state management
- **Type Safety**: Use TypeScript interfaces for all API responses and component props
- **Error Handling**: Implement boundary components and centralized error handling
- **Performance**: Implement code splitting and lazy loading for optimal bundle size

### Backend Patterns
- **Modular Architecture**: Separate concerns into distinct NestJS modules
- **DTOs**: Use Data Transfer Objects with class-validator for request validation
- **Exception Filters**: Implement global exception filters for consistent error responses
- **Custom Validators**: Create business-specific validation logic
- **Database Patterns**: Use Mongoose schemas with comprehensive validation rules

### Testing Patterns
- **Unit Testing**: Jest with ts-jest for TypeScript support
- **Integration Testing**: MongoDB Memory Server for isolated database testing
- **E2E Testing**: Separate Jest configuration for end-to-end tests
- **API Testing**: Supertest for HTTP endpoint testing
- **Coverage**: Maintain comprehensive test coverage with detailed reports

## Infrastructure and Deployment

### Infrastructure Services
```bash
# Available services via npm run infra:start
- MongoDB (port 27017) - Primary database
- Redis (port 6379) - Caching and sessions
- Prometheus (port 9090) - Metrics collection
- Grafana (port 3001) - Dashboards and monitoring
- Loki (port 3100) - Log aggregation
- MailHog (ports 1025/8025) - Email testing
- Mongo Express (port 8081) - Database admin UI
```

### Deployment Strategies
1. **Development**: Native applications + Docker infrastructure
2. **Production**: Full containerization with Nginx reverse proxy
3. **Cloudflare**: Secure tunnel deployment with external MongoDB
4. **Monitoring**: Extended observability stack with comprehensive metrics

### Docker Multi-Stage Builds
- **Frontend**: Vite build → Nginx/Alpine serving (95% memory reduction)
- **Backend**: TypeScript compilation → Node.js Alpine runtime
- **Security**: Non-root users, read-only filesystems, minimal attack surface

## Security Best Practices

### Application Security
- **Input Validation**: Comprehensive request validation with class-validator
- **NoSQL Injection Protection**: Input sanitization utilities
- **Rate Limiting**: Multi-tier throttling (10 req/s, 100 req/min, 1000 req/hour)
- **CORS Configuration**: Environment-specific origin validation
- **Authentication**: JWT with secure cookie handling and CSRF protection

### Container Security
- **Non-root Users**: All containers run as non-privileged users
- **Read-only Filesystems**: Minimize attack surface
- **Multi-stage Builds**: Reduce image size and vulnerabilities
- **Health Checks**: Automatic container monitoring and recovery
- **Resource Limits**: Memory and CPU constraints for stability

## Performance Optimization

### Frontend Optimization
- **Code Splitting**: Route-based and component-based splitting
- **Lazy Loading**: On-demand component and route loading
- **Bundle Analysis**: Regular monitoring of bundle size
- **Caching**: Static asset caching strategies
- **Image Optimization**: Responsive images with modern formats

### Backend Optimization
- **Database Indexing**: Comprehensive MongoDB indexing strategy
- **Connection Pooling**: Efficient database connection management
- **Query Optimization**: Efficient MongoDB queries and aggregation pipelines
- **Caching**: Redis integration for frequently accessed data
- **Rate Limiting**: Protection against abuse and resource exhaustion

## Monitoring and Observability

### Application Metrics
- **HTTP Metrics**: Request counts, response times, error rates
- **Database Metrics**: Connection pools, query performance, operation counts
- **Business Metrics**: Search queries, tool views, user interactions
- **Infrastructure Metrics**: CPU, memory, disk, network usage

### Monitoring Stack
- **Prometheus**: Metrics collection and alerting
- **Grafana**: Dashboards and visualization with pre-configured panels
- **Loki**: Log aggregation and search capabilities
- **Health Checks**: Application and infrastructure health monitoring

### Alerting Configuration
- High error rates (>5% for 5 minutes)
- Slow response times (>2s average for 10 minutes)
- Database connection failures
- Container health check failures
- High resource usage (>80% for 15 minutes)

## Troubleshooting Common Issues

### Database Connectivity
```bash
# Test MongoDB connection
docker run --rm --network codiesvibe-network mongo:7 \
  mongosh "your-mongodb-uri" --eval "db.adminCommand('ping')"

# Check network connectivity
docker exec -it codiesvibe-backend ping mongodb
```

### Port Conflicts
```bash
# Find conflicting processes
sudo lsof -i :3000  # Frontend
sudo lsof -i :4000  # Backend
sudo lsof -i :27017 # MongoDB

# Use docker-compose.override.yml for alternative ports
```

### Container Health
```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Test health endpoints
curl http://localhost:3000/health
curl http://localhost:4000/health
```

## Important Development Notes

- **Always run type checking**: `npm run typecheck` before committing changes
- **Database first**: Start infrastructure with `npm run infra:start` before development
- **Environment separation**: Use different environment files for development and production
- **Security**: Never commit secrets or environment files with sensitive data
- **Testing**: Maintain comprehensive test coverage for all new features
- **Documentation**: Update API documentation when modifying endpoints
- **Performance**: Monitor bundle sizes and database query performance regularly