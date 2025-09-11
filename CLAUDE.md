# Claude Code Context

## Current Project: NestJS REST API Backend (Feature 001)

### Technical Stack
- **Framework**: NestJS with TypeScript
- **Database**: MongoDB with Mongoose ODM  
- **Authentication**: GitHub OAuth + JWT tokens via Passport.js
- **Validation**: class-validator for DTOs
- **Documentation**: @nestjs/swagger for OpenAPI
- **Security**: @nestjs/throttler for rate limiting
- **Architecture**: Modular with auth, users, tools modules in `/backend` directory

### Project Structure
```
/backend                    # Main backend application directory
├── src/
│   ├── auth/              # GitHub OAuth + JWT authentication
│   ├── users/             # User profile management  
│   ├── tools/             # Tool CRUD with search
│   ├── common/            # Shared utilities, filters, guards
│   └── main.ts           # Application entry point
├── test/                  # Test files (Jest + Supertest)
└── package.json          # Dependencies and scripts
```

### Key Dependencies
- @nestjs/core, @nestjs/common, @nestjs/mongoose
- @nestjs/passport, @nestjs/jwt, passport-github2  
- @nestjs/swagger, @nestjs/throttler, @nestjs/cache-manager
- class-validator, class-transformer, mongoose

### Entities & API Endpoints
**User**: GitHub profile with authentication
**Tool**: Simple CRUD entity (id, name, description, createdBy)

**Endpoints**:
- GET /health - Health check
- GET /auth/github, /auth/github/callback - OAuth flow
- GET /auth/profile - Current user profile
- GET/POST/PUT/DELETE /tools - Full CRUD + search

### Development Principles
- **Testing**: TDD with RED-GREEN-Refactor cycle (Jest + real MongoDB)
- **Architecture**: Direct NestJS modules, no Repository pattern
- **Security**: JWT guards, rate limiting (100 req/min/user)
- **Performance**: <500ms response times, MongoDB indexing
- **Documentation**: Auto-generated Swagger from decorators

### Recent Changes
- Feature 001: NestJS backend specification and planning complete
- Research phase: Technology decisions documented
- Design phase: Data models and API contracts defined
- Next: Task generation and implementation

### Implementation Notes
- Use `/backend` directory to separate from frontend
- Real MongoDB for integration tests (no mocking)
- GitHub OAuth with proper scope validation
- Search functionality via MongoDB text indexes
- Comprehensive error handling with structured responses

---
*Auto-updated by Feature 001 planning phase*