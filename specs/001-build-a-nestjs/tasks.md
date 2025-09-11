# Tasks: NestJS REST API Backend with MongoDB

**Input**: Design documents from `/specs/001-build-a-nestjs/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/api-spec.yaml, quickstart.md

## 📋 Design Document Quick Reference
**Essential reading before starting tasks - each task references specific lines:**

| Document | Purpose | Key Sections |
|----------|---------|--------------|
| **spec.md** | Feature requirements | FR-001 to FR-017 (functional requirements) |
| **plan.md** | Technical architecture | Technical Context (lines 34-43), Dependencies |
| **research.md** | Technology decisions | Authentication (lines 30-40), Framework choice |
| **data-model.md** | Database schemas | User Entity (lines 5-36), Tool Entity (lines 38-70) |
| **contracts/api-spec.yaml** | API endpoints | All endpoints with request/response schemas |
| **quickstart.md** | Test scenarios | 6 scenarios for integration test validation |

## Execution Flow (main)
```
1. Load plan.md from feature directory ✅
   → Extract: NestJS, MongoDB, GitHub OAuth, TypeScript
2. Load design documents: ✅
   → data-model.md: User, Tool entities → model tasks
   → contracts/: OpenAPI spec → contract test tasks
   → quickstart.md: 6 scenarios → integration tests
3. Generate tasks by category: ✅
   → Setup: NestJS project, dependencies, MongoDB
   → Tests: contract tests, integration tests
   → Core: schemas, services, controllers, guards
   → Integration: auth, middleware, error handling
   → Polish: unit tests, documentation, health checks
4. Apply task rules: ✅
   → Different modules/files = [P] parallel
   → TDD: tests before implementation
5. Number tasks sequentially (T001-T031)
6. SUCCESS: 31 tasks ready for execution
```

## Format: `[ID] Description`
- All tasks run sequentially for clear progress tracking
- File paths use `/backend` directory structure per implementation plan

## Phase 3.1: Project Setup
- [ ] T001 Create `/backend` directory structure with NestJS CLI
- [ ] T002 Install core dependencies (NestJS, Mongoose, Passport, class-validator, Swagger)
- [ ] T003 Configure TypeScript, ESLint, and Prettier in `/backend`
- [ ] T004 Set up environment configuration with @nestjs/config in `/backend/src/config`
- [ ] T005 Configure MongoDB connection with Mongoose in `/backend/src/database`

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
- [ ] T006 Contract test POST /auth/github in `/backend/test/auth/github-oauth.e2e-spec.ts`
  - **Reference**: contracts/api-spec.yaml lines 34-42 for GitHub OAuth redirect
  - **Test**: Verify 302 redirect to GitHub with proper OAuth parameters
- [ ] T007 Contract test GET /auth/profile in `/backend/test/auth/profile.e2e-spec.ts`  
  - **Reference**: contracts/api-spec.yaml lines 66-80 for profile endpoint
  - **Test**: 401 without token, 200 with valid JWT, proper UserProfile response
- [ ] T008 Contract test POST /tools in `/backend/test/tools/create-tool.e2e-spec.ts`
  - **Reference**: contracts/api-spec.yaml lines 73-115 for tool creation
  - **Test**: 401 without auth, 400 with invalid data, 201 with valid tool data
- [ ] T009 Contract test GET /tools in `/backend/test/tools/list-tools.e2e-spec.ts`
- [ ] T010 Contract test GET /tools/:id in `/backend/test/tools/get-tool.e2e-spec.ts`
- [ ] T011 Contract test PUT /tools/:id in `/backend/test/tools/update-tool.e2e-spec.ts`
- [ ] T012 Contract test DELETE /tools/:id in `/backend/test/tools/delete-tool.e2e-spec.ts`
- [ ] T013 Contract test GET /health in `/backend/test/health/health.e2e-spec.ts`
- [ ] T014 Integration test GitHub OAuth flow in `/backend/test/integration/oauth-flow.spec.ts`
  - **Reference**: quickstart.md Scenario 2 (lines 34-58) for complete OAuth flow
  - **Test**: Full OAuth flow from initiation to JWT token receipt
- [ ] T015 Integration test JWT authentication in `/backend/test/integration/jwt-auth.spec.ts`
  - **Reference**: quickstart.md Scenario 3 (lines 60-85) for protected route access
  - **Test**: Valid/invalid JWT token scenarios, token expiration
- [ ] T016 Integration test Tool CRUD operations in `/backend/test/integration/tool-crud.spec.ts`
  - **Reference**: quickstart.md Scenario 4 (lines 87-135) for all CRUD operations
  - **Test**: Create, read, update, delete tools with proper authorization
- [ ] T017 Integration test Tool search functionality in `/backend/test/integration/tool-search.spec.ts`
- [ ] T018 Integration test Rate limiting in `/backend/test/integration/rate-limiting.spec.ts`

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Data Layer
- [ ] T019 User schema with Mongoose in `/backend/src/users/schemas/user.schema.ts`
  - **Reference**: data-model.md User Entity (lines 5-36) for exact schema structure
  - **Required fields**: githubId, username, displayName, avatarUrl, accessToken, timestamps
  - **Validation**: Implement rules from data-model.md (lines 25-31)
  - **Indexes**: Add unique index on githubId, performance index on username (lines 33-36)
- [ ] T020 Tool schema with Mongoose in `/backend/src/tools/schemas/tool.schema.ts`
  - **Reference**: data-model.md Tool Entity (lines 38-70) for schema structure
  - **Required fields**: name, description, createdBy (ObjectId ref to User), timestamps
  - **Validation**: name 1-100 chars, description 1-500 chars (lines 58-62)
  - **Indexes**: createdBy index, text index on name+description for search (lines 70-78)

### Authentication Module
- [ ] T021 GitHub OAuth strategy in `/backend/src/auth/strategies/github.strategy.ts`
  - **Reference**: research.md Authentication section (lines 30-40) for GitHub OAuth approach
  - **Implementation**: Use passport-github2, validate GitHub profile, create/update User
  - **Environment**: Requires GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET from .env
- [ ] T022 JWT strategy in `/backend/src/auth/strategies/jwt.strategy.ts`
  - **Reference**: research.md Authentication section for JWT approach
  - **Implementation**: Extract JWT from Authorization header, validate signature, return user payload
  - **Environment**: Requires JWT_SECRET from .env
- [ ] T023 Auth guard in `/backend/src/auth/guards/jwt-auth.guard.ts`
  - **Purpose**: Protect routes requiring authentication
  - **Implementation**: Extend @nestjs/passport AuthGuard('jwt')
- [ ] T024 Auth controller with GitHub OAuth endpoints in `/backend/src/auth/auth.controller.ts`
  - **Reference**: contracts/api-spec.yaml lines 34-65 for exact endpoints
  - **Endpoints**: GET /auth/github, GET /auth/github/callback, GET /auth/profile
  - **Swagger**: Add @ApiTags('Authentication') and response decorators
- [ ] T025 Auth service with JWT token management in `/backend/src/auth/auth.service.ts`
  - **Methods**: generateToken(user), validateUser(githubProfile), updateLastLogin(userId)
  - **JWT payload**: Include user id, username for token claims

### Users Module  
- [ ] T026 User DTOs (profile response) in `/backend/src/users/dto/`
  - **Reference**: contracts/api-spec.yaml UserProfile schema (lines 250-260)
  - **Files**: user-profile.dto.ts with id, username, email, displayName, avatarUrl
  - **Validation**: Use class-validator decorators (@IsString, @IsEmail, @IsUrl)
- [ ] T027 Users service with profile operations in `/backend/src/users/users.service.ts`
  - **Methods**: findByGithubId(githubId), findById(id), updateProfile(id, data)
  - **Dependencies**: Inject User model from Mongoose
- [ ] T028 Users controller with profile endpoint in `/backend/src/users/users.controller.ts`
  - **Reference**: contracts/api-spec.yaml /auth/profile endpoint
  - **Endpoint**: GET /auth/profile with JWT guard protection
  - **Swagger**: @ApiResponse with UserProfile schema

### Tools Module
- [ ] T029 Tool DTOs (create, update, response) in `/backend/src/tools/dto/`
  - **Reference**: contracts/api-spec.yaml CreateToolRequest, UpdateToolRequest, Tool schemas
  - **Files**: create-tool.dto.ts, update-tool.dto.ts, tool-response.dto.ts
  - **Validation**: @IsString, @Length for name (1-100), description (1-500)
- [ ] T030 Tools service with CRUD and search in `/backend/src/tools/tools.service.ts`
  - **Reference**: data-model.md Tool search requirements (lines 99-110)
  - **Methods**: create, findAll, findOne, update, remove, search(query, userId)
  - **Search**: Use MongoDB $text search on name+description, filter by createdBy
  - **Pagination**: Support limit/offset for listing
- [ ] T031 Tools controller with all CRUD endpoints in `/backend/src/tools/tools.controller.ts`
  - **Reference**: contracts/api-spec.yaml /tools endpoints (lines 73-235)
  - **Endpoints**: GET, POST, PUT, DELETE /tools with JWT guard
  - **Search**: GET /tools?search=query parameter support
  - **Swagger**: Complete @ApiOperation, @ApiResponse decorators

## Phase 3.4: Integration & Middleware
- [ ] T032 Rate limiting configuration with @nestjs/throttler in `/backend/src/common/throttling.config.ts`
  - **Reference**: spec.md FR-018 for exact limits (100 req/min per user, 1000 req/min per IP)
  - **Implementation**: Configure ThrottlerModule with guards for different limits
- [ ] T033 Global exception filter in `/backend/src/common/filters/http-exception.filter.ts`
  - **Reference**: contracts/api-spec.yaml ErrorResponse schema (lines 320-330)
  - **Response format**: statusCode, message, timestamp, path structure
  - **Implementation**: Catch HttpException, format response consistently
- [ ] T034 Request logging interceptor in `/backend/src/common/interceptors/logging.interceptor.ts`
  - **Purpose**: Log all incoming requests for debugging/audit
  - **Log format**: method, url, user-agent, response time, status code
- [ ] T035 Response transform interceptor in `/backend/src/common/interceptors/response.interceptor.ts`
  - **Purpose**: Ensure consistent response format across all endpoints
  - **Implementation**: Wrap data in standard envelope if needed
- [ ] T036 Health check controller in `/backend/src/health/health.controller.ts`
  - **Reference**: contracts/api-spec.yaml /health endpoint (lines 20-32)
  - **Response**: status, timestamp, database connection status
  - **Dependencies**: @nestjs/terminus for MongoDB health check
- [ ] T037 Swagger configuration in `/backend/src/main.ts`
  - **Reference**: contracts/api-spec.yaml for complete API documentation
  - **Setup**: DocumentBuilder with title, description, version, security schemes
  - **Path**: Serve documentation at /docs endpoint

## Phase 3.5: Module Assembly & Bootstrap
- [ ] T038 Auth module assembly in `/backend/src/auth/auth.module.ts`
  - **Imports**: PassportModule, JwtModule, MongooseModule.forFeature([User])
  - **Providers**: AuthService, GithubStrategy, JwtStrategy
  - **Controllers**: AuthController
  - **Exports**: AuthService, JwtStrategy for use in other modules
- [ ] T039 Users module assembly in `/backend/src/users/users.module.ts`
  - **Imports**: MongooseModule.forFeature([User])
  - **Providers**: UsersService
  - **Controllers**: UsersController
  - **Exports**: UsersService
- [ ] T040 Tools module assembly in `/backend/src/tools/tools.module.ts`
  - **Imports**: MongooseModule.forFeature([Tool])
  - **Providers**: ToolsService
  - **Controllers**: ToolsController
- [ ] T041 App module with all imports in `/backend/src/app.module.ts`
  - **Reference**: plan.md Technical Context for all required modules
  - **Imports**: MongooseModule, ConfigModule, ThrottlerModule, AuthModule, UsersModule, ToolsModule
  - **Global**: Exception filters, logging interceptors, throttler guard
- [ ] T042 Main application bootstrap in `/backend/src/main.ts`
  - **Reference**: plan.md for port 3000, CORS, security configuration
  - **Setup**: CORS, global pipes (ValidationPipe), global filters, Swagger docs
  - **Environment**: Use ConfigService for port and other settings

## Phase 3.6: Polish & Documentation
- [ ] T043 Unit tests for User schema validation in `/backend/test/unit/users/user.schema.spec.ts`
- [ ] T044 Unit tests for Tool schema validation in `/backend/test/unit/tools/tool.schema.spec.ts`
- [ ] T045 Unit tests for Auth service in `/backend/test/unit/auth/auth.service.spec.ts`
- [ ] T046 Unit tests for Tools service in `/backend/test/unit/tools/tools.service.spec.ts`
- [ ] T047 Environment configuration example in `/backend/.env.example`
- [ ] T048 Package.json scripts (start:dev, test, build) in `/backend/package.json`
- [ ] T049 README with setup instructions in `/backend/README.md`
- [ ] T050 Performance validation using quickstart scenarios
- [ ] T051 Final integration test run and cleanup

## Dependencies
**Setup Phase (T001-T005)**:
- T001 blocks T002 (need directory first)
- T002 blocks T003-T005 (need dependencies installed)

**Test Phase (T006-T018)**:
- All test tasks run sequentially
- Must complete BEFORE any implementation tasks

**Implementation Phase (T019-T042)**:
- T019-T020 (schemas) before T025, T027, T030 (services)
- T021-T023 (strategies/guards) before T024-T025 (auth controller/service)
- T025 (auth service) before T027 (users service)
- T027-T028 (users) and T030-T031 (tools) before T038-T041 (modules)
- T038-T041 (modules) before T042 (main bootstrap)

**Polish Phase (T043-T051)**:
- All tasks run sequentially
- T050-T051 require completed implementation

## Sequential Execution
All tasks execute one after another in order T001 → T002 → T003 → ... → T051 for clear progress tracking and dependency management.

## Validation Checklist
*GATE: Must be complete before task execution*

- [x] All OpenAPI endpoints have corresponding contract tests (T006-T013)
- [x] All entities (User, Tool) have schema tasks (T019-T020)
- [x] All quickstart scenarios have integration tests (T014-T018)
- [x] All tests come before implementation (T006-T018 before T019+)
- [x] Sequential execution order maintains dependencies
- [x] Each task specifies exact file path
- [x] TDD cycle enforced: failing tests required before implementation

## Task Execution Notes
- **Directory**: All paths relative to `/backend` directory
- **Testing**: Use Jest with Supertest for E2E tests, real MongoDB for integration
- **TDD**: Tests must fail before implementation begins
- **Sequential**: All tasks execute in order T001 → T002 → ... → T051
- **Dependencies**: Respect blocking relationships - complete prerequisite tasks first
- **Commits**: Create git commit after each completed task
- **Validation**: Run `npm test` after each phase to ensure nothing breaks

## Success Criteria
When all 51 tasks are complete:
- ✅ NestJS application running on port 3000
- ✅ MongoDB connection established  
- ✅ GitHub OAuth flow working
- ✅ All CRUD operations functional
- ✅ Rate limiting enforced
- ✅ Comprehensive test coverage
- ✅ API documentation available at /docs
- ✅ Health check endpoint responding
- ✅ All quickstart scenarios pass