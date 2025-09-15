# CodiesVibe Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-09-15

## Active Technologies
- TypeScript with React frontend, NestJS backend
- MongoDB database with AI tools collection
- Jest for unit tests, React Testing Library for frontend
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

## Code Style
- Use React hooks (useState, useEffect) for state management
- NestJS decorators for validation and API documentation
- MongoDB aggregation pipelines for complex queries
- Follow TDD principles with failing tests first

## Recent Changes
- 004-build-a-search: Added search and sort system with button-triggered filtering, text highlighting, and results counter

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->