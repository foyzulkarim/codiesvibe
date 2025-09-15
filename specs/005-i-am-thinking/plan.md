# Implementation Plan: Production-Grade Docker Containerization Setup

**Branch**: `005-i-am-thinking` | **Date**: 2025-09-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/Users/foyzul/personal/codiesvibe/specs/005-i-am-thinking/spec.md`

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
Implement comprehensive Docker containerization setup for CodiesVibe project supporting multiple deployment scenarios: development with hot reload, production with Traefik reverse proxy, Cloudflare tunnel integration, pre-built images for CI/CD, and monitoring stack. External MongoDB connection required with fail-fast behavior on connection failures.

## Technical Context
**Language/Version**: TypeScript with Node.js, React + Vite frontend
**Primary Dependencies**: NestJS backend, React + Vite frontend, Docker, Docker Compose, Nginx
**Storage**: External MongoDB (not containerized, connection string provided)
**Testing**: Jest for unit tests, React Testing Library for frontend, automated CI/CD testing
**Target Platform**: Linux server (self-hosted VPS), development workstations
**Project Type**: web - frontend (port 3000/80) + backend (port 4000) with Nginx reverse proxy
**Performance Goals**: Development hot reload, production Nginx optimization with compression and caching
**Constraints**: External MongoDB mandatory, fail-fast on connection issues, GitHub Container Registry for images
**Scale/Scope**: Self-hosted VPS deployment, GitHub Actions CI/CD, Cloudflare tunnel integration

**Actual Implementation**: Based on provided files showing Vite frontend, NestJS backend on port 4000, Nginx for static serving, GitHub Actions for CI/CD, and Cloudflare tunnels instead of Traefik for production access.

**User-Provided Context**: "there will be existing mongodb (not part of this setup) and we'll pass the url. client and backend is already running on different ports, so the containers would be different ports. and the setup should cater about local easy development, production with traefik and cloudflare based deployment"

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity**:
- Projects: 1 (Docker configuration files - infrastructure setup)
- Using framework directly? (yes - Docker Compose, Traefik directly)
- Single data model? (N/A - infrastructure configuration)
- Avoiding patterns? (yes - direct Docker configurations, no complex abstractions)

**Architecture**:
- EVERY feature as library? (N/A - infrastructure configuration, not application code)
- Libraries listed: N/A (Docker configuration files)
- CLI per library: (Docker Compose commands: up, down, logs, build)
- Library docs: README.md with deployment instructions planned

**Testing (NON-NEGOTIABLE)**:
- RED-GREEN-Refactor cycle enforced? (yes - test container startup before full implementation)
- Git commits show tests before implementation? (yes - validation scripts first)
- Order: Contract→Integration→E2E→Unit strictly followed? (modified for infrastructure: validation→startup→connectivity→health)
- Real dependencies used? (yes - actual external MongoDB, real services)
- Integration tests for: container networking, external MongoDB connectivity, service health checks
- FORBIDDEN: Implementation before test, skipping RED phase

**Observability**:
- Structured logging included? (yes - container logs, Traefik access logs)
- Frontend logs → backend? (via container networking)
- Error context sufficient? (yes - startup failures, connection errors)

**Versioning**:
- Version number assigned? (005.1.0 - feature branch number)
- BUILD increments on every change? (yes - Docker image tags)
- Breaking changes handled? (yes - backward compatible environment variables, migration docs)

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

**Structure Decision**: Option 2 (Web application) - frontend + backend detected with different ports

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
- Each contract → contract test task [P]
- Each entity → model creation task [P] 
- Each user story → integration test task
- Implementation tasks to make tests pass

**Ordering Strategy**:
- TDD order: Tests before implementation 
- Dependency order: Models before services before UI
- Mark [P] for parallel execution (independent files)

**Estimated Output**: 25-30 numbered, ordered tasks in tasks.md

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
- [x] Complexity deviations documented

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*