# Implementation Plan: Update Tools Schema to Match Frontend AITool Interface

**Branch**: `002-generate-a-mongoose` | **Date**: 2025-09-12 | **Spec**: [/specs/002-generate-a-mongoose/spec.md](/specs/002-generate-a-mongoose/spec.md)
**Input**: Feature specification from `/specs/002-generate-a-mongoose/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
4. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
5. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, or `GEMINI.md` for Gemini CLI).
6. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
7. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
8. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Update the existing NestJS backend tools domain to replace the simple Tool schema (name, description, createdBy) with a comprehensive AITool interface matching the frontend structure. This includes adding rich metadata fields for pricing models, interface types, functionality categories, deployment options, ratings, features, tags, and search keywords. The implementation will enhance filtering, sorting, and search capabilities while maintaining existing user ownership and authentication patterns.

## Technical Context
**Language/Version**: TypeScript 5.0+  
**Primary Dependencies**: NestJS 10, Mongoose 8, class-validator 0.14, @nestjs/swagger 7  
**Storage**: MongoDB with Mongoose ODM  
**Testing**: Jest + Supertest with real MongoDB  
**Target Platform**: Node.js 18+ backend API server  
**Project Type**: Web application (backend only - frontend integration through API)  
**Performance Goals**: <500ms response times, efficient text search with MongoDB indexes  
**Constraints**: Maintain existing authentication patterns, preserve user ownership (createdBy), backward compatibility with existing endpoints  
**Scale/Scope**: Single database collection update, enhancing existing tools module

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity**:
- Projects: [1] (backend/tools module - enhancing existing module)
- Using framework directly? (Mongoose directly, no wrapper classes)
- Single data model? (updating existing Tool model, DTOs for API validation)
- Avoiding patterns? (no Repository/UoW - using Mongoose models directly)

**Architecture**:
- EVERY feature as library? (enhancing existing tools module/library)
- Libraries listed: [tools - AI tools management and API endpoints]
- CLI per library: [not applicable - this is an API endpoint enhancement]
- Library docs: [Swagger/OpenAPI documentation auto-generated]

**Testing (NON-NEGOTIABLE)**:
- RED-GREEN-Refactor cycle enforced? (tests will be written first)
- Git commits show tests before implementation? (follow TDD pattern)
- Order: Contract→Integration→E2E→Unit strictly followed? (prioritizing integration tests with real MongoDB)
- Real dependencies used? (actual MongoDB, not mocks)
- Integration tests for: new schema fields, API endpoint updates, search functionality
- FORBIDDEN: Implementation before test, skipping RED phase

**Observability**:
- Structured logging included? (existing NestJS logging patterns)
- Frontend logs → backend? (not applicable for backend-only feature)
- Error context sufficient? (proper validation error responses)

**Versioning**:
- Version number assigned? (enhancement to existing module, follows project versioning)
- BUILD increments on every change? (follows project build process)
- Breaking changes handled? (maintaining backward compatibility, extending existing endpoints)

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure]
```

**Structure Decision**: Option 2 (Web application) - enhancing existing backend/tools module

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `/scripts/update-agent-context.sh [claude|gemini|copilot]` for your AI assistant
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Each contract endpoint → contract test task [P]
- Schema enhancement → model update task
- Each new validation rule → validation implementation task
- Each user story → integration test task
- API endpoint enhancement → service/controller updates
- Database indexes → migration task
- Documentation updates → documentation task

**Ordering Strategy**:
- TDD order: Tests before implementation 
- Database layer first: Schema → indexes → migration
- Business logic: Services → controllers → DTOs
- Integration: Contract tests → integration tests → validation
- Documentation: API docs → quickstart guide
- Mark [P] for parallel execution (independent files)

**Task Categories**:
1. **Database Layer**: Schema update, indexes, migration
2. **Data Transfer Objects**: Enhanced DTOs with validation
3. **Business Logic**: Service method updates
4. **API Layer**: Controller endpoint enhancements
5. **Testing**: Contract tests, integration tests, validation tests
6. **Documentation**: API docs, quickstart guide

**Estimated Output**: 20-25 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] No complexity deviations documented

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*