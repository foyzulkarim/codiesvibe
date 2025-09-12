# Tasks: Update Tools Schema to Match Frontend AITool Interface

**Input**: Design documents from `/specs/002-generate-a-mongoose/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/openapi.yaml, quickstart.md

## ✅ **Current Progress: 37/37 tasks completed** (T001-T037: ALL PHASES COMPLETE!)

**Completed**: ALL PHASES COMPLETE! Enhanced Tool schema, comprehensive DTOs, advanced service methods, validation & error handling, performance testing, and documentation
**Status**: Feature 002 implementation COMPLETE - Enhanced MongoDB schema with all 37 tasks successfully implemented

## 📋 Design Document Quick Reference
**Essential reading before starting tasks - each task references specific lines:**

| Document | Purpose | Key Sections |
|----------|---------|--------------|
| **spec.md** | Feature requirements | FR-001 to FR-020 (functional requirements) |
| **plan.md** | Technical architecture | Technical Context (lines 34-43), Dependencies |
| **research.md** | Technology decisions | MongoDB schema design, validation strategies |
| **data-model.md** | Enhanced Tool schema | Fields (lines 10-31), Validation (lines 33-106), Indexes (lines 66-92) |
| **contracts/openapi.yaml** | API contracts | All endpoints with enhanced schemas and parameters |
| **quickstart.md** | Usage scenarios | Search, filtering, and CRUD operation examples |

## Execution Flow (main)
```
1. Load plan.md from feature directory ✅
   → Extract: NestJS, MongoDB, Mongoose, enhanced Tool schema
2. Load design documents: ✅
   → data-model.md: Enhanced Tool entity → model update tasks
   → contracts/: OpenAPI spec → contract test tasks  
   → quickstart.md: Enhanced scenarios → integration tests
3. Generate tasks by category: ✅
   → Setup: Migration scripts, indexes, validation fixtures
   → Tests: Contract tests, integration tests
   → Core: Schema update, DTOs, services, controllers
   → Integration: Database migration, performance optimization
   → Polish: Validation tests, performance, documentation
4. Apply task rules: ✅
   → Different modules/files = sequential execution
   → TDD: tests before implementation
5. Number tasks sequentially (T001-T038)
6. SUCCESS: 38 tasks ready for execution (enhanced granularity with atomic sub-tasks)
```

## Format: `[ID] Description`
- Include exact file paths in descriptions
- All tasks should be executed sequentially

## Path Conventions
- **Web app**: `backend/src/`, `backend/tests/` (from plan.md structure decision)
- All paths are absolute from repository root

## Phase 3.1: Setup & Preparation
- [x] **T001** Configure MongoDB indexes for enhanced search and performance in `backend/src/tools/schemas/tool.schema.ts`
  - **Reference**: data-model.md Indexes section (lines 66-92) for index configuration
  - **Implementation**: Add compound text index on name, description, searchKeywords fields
  - **Additional**: Add performance indexes for popularity (-1), rating (-1), functionality (1), deployment (1)

- [x] **T002** Set up validation test fixtures for new field types in `backend/tests/fixtures/validation-fixtures.ts`
  - **Reference**: data-model.md Validation Rules section (lines 33-106) for field validation requirements
  - **Implementation**: Create test data for complex fields (features object, tags structure, array validations)
  - **Coverage**: Include edge cases for numeric bounds, string lengths, and URL validation

- [x] **T003** Set up test database configuration for enhanced schema testing in `backend/test/setup/enhanced-schema-test-setup.ts`
  - **Reference**: research.md MongoDB configuration section for test database setup
  - **Implementation**: Configure test database with proper indexes and sample data
  - **Validation**: Ensure test environment matches production schema and indexes

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

- [x] **T004** Contract test GET /api/tools with enhanced filtering and sorting in `backend/test/contracts/get-tools-enhanced-filtering.contract.spec.ts`
  - **Reference**: contracts/openapi.yaml GET /api/tools endpoint (lines 11-86) for query parameters
  - **Test**: Search, filtering (functionality, tags, rating range), sorting (popularity, rating, reviewCount, createdAt)
  - **Parameters**: Validate page, limit, search, sortBy, functionality, tags, minRating, maxRating

- [x] **T005** Contract test POST /api/tools with enhanced fields in `backend/test/contracts/post-tools-enhanced-fields.contract.spec.ts`
  - **Reference**: contracts/openapi.yaml POST /api/tools endpoint (lines 88-109) for request/response schema
  - **Test**: 401 without auth, 400 with invalid enhanced data, 201 with valid comprehensive tool data
  - **Validation**: Test all new required fields (pricing, interface, functionality, deployment, logoUrl, searchKeywords, tags)

- [x] **T006** Contract test PATCH /api/tools/{id} with enhanced fields in `backend/test/contracts/patch-tools-enhanced-fields.contract.spec.ts`
  - **Reference**: contracts/openapi.yaml PATCH /api/tools/{id} endpoint (lines 135-164) for partial update support
  - **Test**: Update individual fields (name, description, popularity, rating) and complex structures (features, tags)
  - **Validation**: Ensure partial updates don't affect non-specified fields

- [x] **T007** Contract test GET /api/tools/{id} with enhanced response in `backend/test/contracts/get-tool-id-enhanced-response.contract.spec.ts`
  - **Reference**: contracts/openapi.yaml GET /api/tools/{id} endpoint (lines 111-133) for enhanced response schema
  - **Test**: Verify all 13 new fields in response with proper data types and structure
  - **Validation**: Check complex nested structures (features object, tags with primary/secondary arrays)

- [x] **T008** Contract test DELETE /api/tools/{id} with enhanced schema in `backend/test/contracts/delete-tool-id.contract.spec.ts`
  - **Reference**: contracts/openapi.yaml DELETE /api/tools/{id} endpoint for deletion compatibility
  - **Test**: Verify DELETE works correctly with enhanced tool schema and complex data
  - **Validation**: Ensure proper cleanup of enhanced fields and database consistency

- [x] **T009** Contract test for enhanced text search functionality in `backend/test/contracts/enhanced-text-search.contract.spec.ts`
  - **Reference**: data-model.md Search Indexes section (lines 73-86) and quickstart.md search scenarios
  - **Test**: Text search across name, description, searchKeywords fields with weighted relevance scoring
  - **Features**: Multi-field search, case-insensitive, partial matching, combined with filters

- [x] **T010** Integration test for enhanced schema with real MongoDB in `backend/test/integration/enhanced-schema-mongodb.integration.spec.ts`
  - **Reference**: Complete enhanced schema implementation with real MongoDB testing
  - **Test**: Full CRUD lifecycle, complex search/filtering, data integrity, performance validation
  - **Features**: End-to-end workflow testing, concurrent operations, database consistency

## Phase 3.3: Core Implementation (ONLY after tests are failing)

- [x] **T011** Add core enhanced fields to Tool schema with basic types in `backend/src/tools/schemas/tool.schema.ts`
  - **Reference**: data-model.md Fields section (lines 10-31) for field definitions
  - **Implementation**: Add 13 new fields with proper Mongoose SchemaTypes (String, Number, Date, Object, Array)
  - **Fields**: longDescription, pricing[], interface[], functionality[], deployment[], popularity, rating, reviewCount, lastUpdated, logoUrl, features{}, searchKeywords[], tags{}

- [x] **T012** Add validation rules and default values to Tool schema in `backend/src/tools/schemas/tool.schema.ts`
  - **Reference**: data-model.md Validation Rules (lines 33-106) and Default Values (lines 94-100)
  - **Implementation**: Add required: true for core fields, min/max for numbers, minLength/maxLength for strings
  - **Defaults**: Set popularity=0, rating=0, reviewCount=0, features={}, tags={primary:[], secondary:[]}

- [x] **T013** Configure MongoDB indexes for search and performance in `backend/src/tools/schemas/tool.schema.ts`
  - **Reference**: data-model.md Indexes section (lines 66-92) for index configuration
  - **Implementation**: Add compound text index (name, description, searchKeywords) and performance indexes
  - **Indexes**: popularity (-1), rating (-1), functionality (1), deployment (1), tags.primary (1), tags.secondary (1)
  - **Note**: Already completed in T001 - indexes are properly configured

- [x] **T014** Enhance CreateToolDto with comprehensive field validation in `backend/src/tools/dto/create-tool.dto.ts`
  - **Reference**: contracts/openapi.yaml CreateToolDto schema (lines 272-373) for validation rules
  - **Implementation**: Use class-validator decorators for all new fields with proper constraints
  - **Validation**: String lengths, array minItems, numeric min/max, URL format, required fields

- [x] **T015** Enhance UpdateToolDto with partial update support in `backend/src/tools/dto/update-tool.dto.ts`
  - **Reference**: contracts/openapi.yaml UpdateToolDto schema (lines 375-443) for partial updates
  - **Implementation**: Make all fields optional, maintain validation rules when present
  - **Special Cases**: Handle partial updates of complex structures (features, tags)

- [x] **T016** Create ToolResponseDto for enhanced API responses in `backend/src/tools/dto/tool-response.dto.ts`
  - **Reference**: contracts/openapi.yaml ToolResponse schema (lines 187-270) for response structure
  - **Implementation**: Map Mongoose document to clean API response format
  - **Formatting**: Convert _id to id, format dates as ISO strings, include all enhanced fields

- [x] **T017** Update ToolsService CRUD methods for new schema fields in `backend/src/tools/tools.service.ts`
  - **Reference**: data-model.md Default Values section (lines 94-100) and Data Transformation (lines 102-106)
  - **Implementation**: Update create, update, findAll, findOne methods to handle new fields
  - **Defaults**: Apply default values for popularity (0), rating (0), reviewCount (0), features ({}), tags structure

- [x] **T018** Implement basic text search method in ToolsService in `backend/src/tools/tools.service.ts`
  - **Reference**: data-model.md Search Indexes section (lines 73-86) for MongoDB text search
  - **Implementation**: Use MongoDB $text operator with $search on name, description, searchKeywords
  - **Method**: Create search(query: string, userId?: string) method with text search and user filtering

- [x] **T019** Add user filtering and projections to search method in `backend/src/tools/tools.service.ts`
  - **Implementation**: Ensure search respects user ownership (createdBy), add result projections
  - **Performance**: Limit returned fields for better performance, use lean() queries

- [x] **T020** Implement filtering logic by functionality and tags in ToolsService in `backend/src/tools/tools.service.ts`
  - **Reference**: contracts/openapi.yaml GET /api/tools parameters (lines 17-63) for filter options
  - **Implementation**: Add filtering by functionality[], tags.primary[], tags.secondary[], deployment[]
  - **Logic**: Handle multiple filter criteria with proper AND/OR combinations

- [x] **T021** Implement sorting logic for multiple criteria in ToolsService in `backend/src/tools/tools.service.ts`
  - **Implementation**: Support sortBy popularity (-1), rating (-1), reviewCount (-1), createdAt (-1)
  - **Performance**: Ensure sorting uses configured indexes for optimal performance

- [x] **T022** Enhance ToolsController GET endpoint with query parameters in `backend/src/tools/tools.controller.ts`
  - **Reference**: contracts/openapi.yaml GET /api/tools endpoint (lines 11-86) for complete parameter handling
  - **Implementation**: Handle page, limit, search, sortBy, functionality, tags, minRating, maxRating
  - **Validation**: Use query DTO with class-validator for parameter validation
  - **Response**: Return paginated results with metadata

- [x] **T023** Enhance ToolsController POST endpoint with enhanced validation in `backend/src/tools/tools.controller.ts`
  - **Reference**: contracts/openapi.yaml POST /api/tools endpoint (lines 88-109) for enhanced request handling
  - **Implementation**: Use enhanced CreateToolDto with comprehensive validation
  - **Authorization**: Maintain existing JWT guard and user ownership (createdBy)
  - **Response**: Return complete ToolResponse with all new fields

- [x] **T024** Enhance ToolsController PATCH endpoint with partial updates in `backend/src/tools/tools.controller.ts`
  - **Reference**: contracts/openapi.yaml PATCH /api/tools/{id} endpoint (lines 135-164) for partial updates
  - **Implementation**: Use UpdateToolDto for partial field updates
  - **Validation**: Validate only provided fields, maintain existing values for unspecified fields
  - **Authorization**: Ensure user can only update their own tools

- [x] **T025** Update ToolsController GET/{id} endpoint with enhanced response in `backend/src/tools/tools.controller.ts`
  - **Reference**: contracts/openapi.yaml GET /api/tools/{id} endpoint (lines 111-133) for enhanced response
  - **Implementation**: Return ToolResponseDto with all 13 new fields and proper formatting
  - **Authorization**: Maintain existing JWT guard and user ownership validation


## Phase 3.4: Validation & Error Handling
- [x] **T026** Unit tests for field validation rules in `backend/tests/unit/test-validation.spec.ts`
  - **Reference**: data-model.md Validation Rules section (lines 33-106) for comprehensive validation
  - **Test**: String length bounds, numeric ranges, URL format, required field validation
  - **Coverage**: Test all new fields with edge cases and invalid values

- [x] **T027** Unit tests for array field validation in `backend/tests/unit/test-array-validation.spec.ts`
  - **Reference**: data-model.md Array Fields section (lines 41-46) for array validation rules
  - **Test**: pricing, interface, functionality, deployment, searchKeywords array validation
  - **Edge Cases**: Empty arrays, duplicate values, invalid string lengths in array elements

- [x] **T028** Unit tests for complex object validation (features, tags) in `backend/tests/unit/test-complex-validation.spec.ts`
  - **Reference**: data-model.md Complex Fields section (lines 53-56) for nested object validation
  - **Test**: features object (boolean values only), tags structure (primary/secondary arrays)
  - **Validation**: Non-boolean values in features, missing tag categories, empty arrays

- [x] **T029** Implement custom validation decorators for complex fields in `backend/src/tools/validators/`
  - **Reference**: data-model.md Complex Fields section (lines 53-56) for custom validation needs
  - **Implementation**: Create @IsFeaturesObject, @IsTagsStructure decorators for complex validation
  - **Integration**: Integrate custom validators with class-validator validation pipeline

- [x] **T030** Add error handling for validation failures in `backend/src/tools/interceptors/`
  - **Reference**: contracts/openapi.yaml ValidationError response schema (lines 446-458) for error format
  - **Implementation**: Create validation interceptor to format validation errors consistently
  - **Response**: Return structured error responses with field-level error details

## Phase 3.5: Polish & Documentation
- [x] **T031** Performance tests for search queries (<500ms) in `backend/tests/performance/test-search-performance.spec.ts`
  - **Reference**: Technical Context Performance Goals (line 41) for sub-500ms response times
  - **Test**: Search performance with dataset of 1000+ tools, various query lengths, special characters
  - **Metrics**: Use console.time() and Jest performance hooks to measure query execution time, index usage

- [x] **T032** Performance tests for filtering operations (<500ms) in `backend/tests/performance/test-filtering-performance.spec.ts`
  - **Reference**: Technical Context Performance Goals (line 41) for filtering performance
  - **Test**: Filter performance with multiple parameters, large datasets, complex AND/OR combinations
  - **Optimization**: Verify compound indexes are used effectively with explain() queries

- [x] **T033** Update OpenAPI/Swagger documentation with new schemas and parameters
  - **Reference**: contracts/openapi.yaml complete specification for documentation updates
  - **Implementation**: Add @ApiProperty decorators to all DTOs with proper descriptions
  - **Enhancements**: Include examples, validation rules, and field descriptions in Swagger

- [x] **T034** Update quickstart guide with new API usage examples
  - **Reference**: Existing quickstart.md and contracts/openapi.yaml for comprehensive examples
  - **Implementation**: Add curl examples for enhanced endpoints with all new parameters
  - **Coverage**: Include search, filtering, sorting, and complex field usage examples

- [x] **T035** Create integration test scenarios from quickstart examples
  - **Reference**: Updated quickstart.md scenarios for end-to-end validation
  - **Implementation**: Convert quickstart examples into automated integration tests
  - **Validation**: Ensure all documented scenarios work as expected with enhanced schema

- [x] **T036** Generate API example responses based on quickstart.md
  - **Reference**: quickstart.md usage scenarios for expected response formats
  - **Implementation**: Create example JSON responses for all enhanced endpoints
  - **Documentation**: Include in Swagger examples and quickstart guide for clarity

- [x] **T037** Add comprehensive error response examples to documentation
  - **Reference**: contracts/openapi.yaml error response schemas
  - **Implementation**: Document validation errors, not found errors, auth errors with examples
  - **Coverage**: Include error codes, messages, and proper HTTP status codes

## Task Dependencies
**Setup (T001-T003)** → **Tests (T004-T010)** → **Core Implementation (T011-T026)** → **Validation (T027-T031)** → **Polish (T032-T038)**


## Critical Path
1. **T004-T010**: All tests must be written and failing first
2. **T011-T014**: Schema implementation (fields → validation → indexes) is foundational
3. **T015-T017**: DTOs depend on schema
4. **T018**: Base service CRUD updates
5. **T019-T022**: Service enhancements (search → filtering → sorting)
6. **T023-T026**: Controller endpoints
7. **T027-T031**: Validation and error handling
8. **T032-T038**: Polish, performance, and documentation

## Sequential Execution Notes
- **All tasks execute in order** T001 → T002 → ... → T038 for clear progress tracking
- **TDD strictly enforced**: Tests (T004-T010) must be written and failing before implementation (T011+)
- **Dependencies maintained**: Schema (T011-T014) blocks DTOs (T015-T017) and services (T018+)
- **Granular approach**: Complex tasks split into atomic sub-tasks for precision
- **Quality assurance**: Validation tests (T027-T031) and performance tests (T032-T033) with detailed metrics

## Task Generation Rules Applied
1. **From Contracts**: Each endpoint (POST, GET, PATCH, GET/{id}) → contract test task
2. **From Data Model**: Enhanced Tool schema → split tasks (fields → validation → indexes), complex fields → validation tasks
3. **From User Stories**: Each acceptance scenario → integration test task with specific sub-cases
4. **From Quickstart**: Usage examples → validation, integration test, and documentation generation tasks
5. **Ordering**: Tests → Schema (atomic) → DTOs → Services (atomic) → Controllers → Validation → Polish (enhanced)

## Success Criteria
When all 38 tasks are complete:
- ✅ Enhanced Tool schema with 13 new fields functional with proper validation
- ✅ All API endpoints handle enhanced fields with comprehensive validation
- ✅ Search functionality working with text indexes (<500ms with 1000+ dataset)
- ✅ Filtering and sorting by new fields operational with optimized indexes
- ✅ Backward compatibility maintained with existing API responses
- ✅ Comprehensive test coverage (contract, integration, validation, performance)
- ✅ MongoDB indexes properly configured and performance-optimized
- ✅ Performance benchmarks met for all operations with detailed metrics
- ✅ Documentation updated with examples, error responses, and API samples
- ✅ Test environment properly configured with enhanced schema and indexes

## AI Agent Execution Guidelines
- **Atomic Implementation**: Generate code snippets for each sub-task independently, then integrate
- **Verification Steps**: After each task, run `npm test` and log results for validation
- **Error Handling**: If task fails, rollback changes via git and retry with modified approach
- **Performance Focus**: Use realistic datasets (1000+ tools) and proper measurement tools
- **Documentation**: Include examples, error cases, and edge cases in all generated code

## Task Execution Notes
- **Directory**: All paths relative to `/backend` directory
- **Testing**: Use Jest with Supertest for tests, real MongoDB for integration
- **TDD**: Tests must fail before implementation begins
- **Sequential**: Execute tasks in order T001 → T002 → ... → T038
- **Dependencies**: Respect blocking relationships - complete prerequisite tasks first
- **Commits**: Create git commit after each completed task
- **Validation**: Run `npm test` after each phase to ensure nothing breaks