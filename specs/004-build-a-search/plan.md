# Implementation Plan: AI Tools Directory Search and Sort System

**Branch**: `004-build-a-search` | **Date**: 2025-09-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/Users/foyzul/personal/codiesvibe/specs/004-build-a-search/spec.md`

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
Enhance existing AI tools directory search system by adding: search button trigger (instead of real-time search), text highlighting for search terms in results, "Name A-Z" sorting option, and results counter display. Building on existing comprehensive search/sort infrastructure.

## Technical Context
**Language/Version**: TypeScript with React frontend, NestJS backend (EXISTING)
**Primary Dependencies**: React components, existing API infrastructure, MongoDB text search (EXISTING)
**Storage**: MongoDB with comprehensive tool schema and text indexes (EXISTING)
**Testing**: Existing Jest/React Testing Library setup (EXISTING)
**Target Platform**: Web application (EXISTING)
**Project Type**: web - Enhance existing React frontend + NestJS backend
**Performance Goals**: Maintain existing <500ms search performance
**Constraints**: Work within existing SearchBar and API structure
**Scale/Scope**: Minor UI/UX enhancements to existing comprehensive search system

**Current State**: Full search/sort system exists with real-time search, advanced filtering, multiple sort options
**Changes Needed**: Replace real-time with button trigger, add text highlighting, add "Name A-Z" sort, add results counter

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity**:
- Projects: 0 new (enhancing existing React/NestJS apps) - well within limits
- Using framework directly? Yes - direct React component modifications
- Single data model? Yes - using existing AI Tool schema unchanged
- Avoiding patterns? Yes - simple enhancements to existing components, no new abstractions

**Architecture**:
- EVERY feature as library? Enhancements integrated into existing app components
- Libraries listed: No new libraries - using existing SearchBar, ToolCard, SortSelector components
- CLI per library: N/A - UI enhancements only
- Library docs: Component usage docs for new props/features

**Testing (NON-NEGOTIABLE)**:
- RED-GREEN-Refactor cycle enforced? Yes - write failing tests first
- Git commits show tests before implementation? Yes - commit tests, then implementation
- Order: Contract→Integration→E2E→Unit strictly followed? Yes
- Real dependencies used? Yes - actual MongoDB for integration tests
- Integration tests for: Search API endpoints, sort functionality, UI interactions
- FORBIDDEN: Implementation before test, skipping RED phase - will be avoided

**Observability**:
- Structured logging included? Yes - NestJS logging for search queries and performance
- Frontend logs → backend? Yes - search analytics and error tracking
- Error context sufficient? Yes - search errors, API failures logged

**Versioning**:
- Version number assigned? Will use existing project versioning
- BUILD increments on every change? Yes - follows existing CI/CD
- Breaking changes handled? N/A - new feature, no existing API changes

## Project Structure

### Documentation (this feature)
```
specs/004-build-a-search/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Web application structure (frontend + backend detected)
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
```

**Structure Decision**: Option 2 - Web application (React frontend + NestJS backend)

## Phase 0: Outline & Research
1. **Analyze existing implementation** to understand current capabilities:
   - Review existing SearchBar component for button trigger integration
   - Examine current SortSelector options and how to add "Name A-Z"
   - Study ToolCard/ToolGrid for text highlighting integration points
   - Check existing API response structure for results counter

2. **Research specific enhancement techniques**:
   ```
   Task: "Research React text highlighting libraries and custom implementations"
   Task: "Find best practices for search button vs real-time search UX patterns"
   Task: "Research result counter implementation patterns in search interfaces"
   ```

3. **Consolidate findings** in `research.md` focusing on:
   - Text highlighting approach for existing components
   - Button trigger integration with existing search flow
   - Results counter placement and update patterns

**Output**: research.md with enhancement-specific findings

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Document component modifications** → `data-model.md`:
   - SearchBar component props for button trigger mode
   - ToolCard/ToolGrid props for search term highlighting
   - SortSelector option additions ("Name A-Z")
   - Results counter state and placement

2. **Update existing API contract** (no new endpoints needed):
   - Review existing GET /api/tools endpoint capabilities
   - Confirm "name" sorting already supported or needs addition
   - Document any needed response format changes for counter
   - Update existing OpenAPI schema if needed

3. **Plan component test updates**:
   - SearchBar button trigger functionality
   - Text highlighting in ToolCard components
   - SortSelector new option handling
   - Results counter display and updates

4. **Extract test scenarios** from user stories:
   - Button click search → component test for SearchBar
   - Text highlighting → visual regression test for ToolCard
   - "Name A-Z" sort → integration test with existing API
   - Results counter → state management test

5. **Update agent context** with enhancement details:
   - Document component modification approach
   - Include existing component patterns to follow

**Output**: data-model.md (component changes), contracts/ (updates), quickstart.md, CLAUDE.md

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Generate tasks focused on component enhancements only
- Each enhancement → test task + implementation task
- No new API development - work with existing endpoints
- Component modification tasks can run in parallel

**Ordering Strategy**:
- TDD order: Component tests before implementation
- Dependency order: Independent component changes
- Mark [P] for parallel execution (separate components)

**Estimated Output**: 6-8 direct implementation tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

No constitutional violations identified - enhancements follow simplicity principles with direct component modifications and no new abstractions.

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) - research.md created
- [x] Phase 1: Design complete (/plan command) - data-model.md, contracts/, quickstart.md, CLAUDE.md created
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