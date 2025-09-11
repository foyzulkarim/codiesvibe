# Research: NestJS REST API Backend with MongoDB

## Technology Decisions

### Framework Choice: NestJS
**Decision**: Use NestJS as the primary backend framework
**Rationale**: 
- Enterprise-grade TypeScript framework with built-in dependency injection
- Excellent ecosystem for common needs (authentication, validation, documentation)
- Strong architectural patterns (modules, decorators, guards)
- Built-in testing support with Jest
**Alternatives considered**: Express.js (too minimal), Fastify (less ecosystem)

### Database & ORM: MongoDB with Mongoose
**Decision**: MongoDB with Mongoose ODM
**Rationale**:
- Document-based storage fits flexible Tool schema requirements
- Mongoose provides schema validation and TypeScript integration
- NestJS has excellent Mongoose integration (@nestjs/mongoose)
- Supports indexing for performance requirements
**Alternatives considered**: PostgreSQL with TypeORM (overkill for simple entities)

### Authentication: GitHub OAuth + JWT
**Decision**: Passport.js GitHub strategy with JWT tokens
**Rationale**:
- GitHub OAuth leverages existing developer accounts
- JWT tokens are stateless and scalable
- Passport.js provides proven GitHub integration
- NestJS guards integrate seamlessly with Passport strategies
**Alternatives considered**: Auth0 (external dependency), Firebase Auth (Google lock-in)

### Validation & Documentation
**Decision**: class-validator for DTOs, @nestjs/swagger for API docs
**Rationale**:
- class-validator integrates natively with NestJS
- Decorator-based validation keeps code clean
- @nestjs/swagger auto-generates OpenAPI documentation
- Both libraries are NestJS ecosystem standards
**Alternatives considered**: Joi validation (separate from DTOs), manual API docs

### Performance & Security
**Decision**: @nestjs/throttler for rate limiting, @nestjs/cache-manager for caching
**Rationale**:
- Both are official NestJS packages with proven patterns
- Throttler supports per-user and per-IP limits as required
- Cache manager provides Redis/memory caching flexibility
- Built-in integration with NestJS interceptors and guards
**Alternatives considered**: Custom middleware (reinventing wheel), third-party solutions

### Project Structure
**Decision**: `/backend` directory with modular NestJS architecture
**Rationale**:
- Separates backend from potential frontend code in repository root
- NestJS modules (auth, users, tools) provide clear separation of concerns
- Each domain module contains controllers, services, DTOs, and schemas
- Follows NestJS best practices for scalable applications
**Alternatives considered**: Monolithic structure (harder to maintain), microservices (overkill)

### Testing Strategy
**Decision**: Jest with Supertest for integration tests, real MongoDB for testing
**Rationale**:
- Jest is NestJS default with excellent TypeScript support
- Supertest provides clean HTTP endpoint testing
- Real MongoDB instances ensure integration test accuracy
- Follows constitutional requirement for real dependencies
**Alternatives considered**: Mocked databases (violates constitution), Postman tests (not integrated)

## Implementation Approach

### Development Order
1. **Project setup**: NestJS CLI initialization in `/backend`
2. **Database connection**: MongoDB connection with Mongoose configuration
3. **Authentication module**: GitHub OAuth + JWT implementation
4. **User module**: User schema and profile management
5. **Tools module**: Full CRUD operations with search
6. **Cross-cutting concerns**: Rate limiting, error handling, health checks
7. **Documentation**: Swagger/OpenAPI integration
8. **Testing**: Contract, integration, and unit test implementation

### Key Dependencies
```json
{
  "@nestjs/common": "^10.0.0",
  "@nestjs/core": "^10.0.0", 
  "@nestjs/mongoose": "^10.0.0",
  "@nestjs/passport": "^10.0.0",
  "@nestjs/jwt": "^10.0.0",
  "@nestjs/swagger": "^7.0.0",
  "@nestjs/throttler": "^5.0.0",
  "@nestjs/cache-manager": "^2.0.0",
  "@nestjs/config": "^3.0.0",
  "mongoose": "^7.5.0",
  "passport-github2": "^0.1.12",
  "class-validator": "^0.14.0"
}
```

### Performance Considerations
- MongoDB indexing on user ID and tool search fields
- Caching for frequently accessed user profiles
- Rate limiting to prevent abuse (100 req/min per user)
- Response time targets: <500ms for all endpoints
- Pagination for tool listing endpoints

### Security Measures
- GitHub OAuth with proper scope validation
- JWT token expiration and refresh handling
- Request validation on all endpoints via DTOs
- CORS configuration for frontend integration
- Structured error responses without sensitive data exposure

## Research Complete
All technical decisions have been made based on:
- Feature specification requirements
- Constitutional principles (simplicity, testing-first)
- NestJS ecosystem best practices
- Performance and security constraints

Ready to proceed to Phase 1: Design & Contracts.