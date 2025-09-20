# CodiesVibe Agent Guidelines

## Commands
**Frontend:** `npm run dev`, `npm run build`, `npm run lint`, `npm run typecheck`
**Backend:** `cd backend && npm run dev`, `npm run test`, `npm run test:e2e`, `npm run lint`, `npm run typecheck`
**Single test:** `cd backend && npm test -- <test-file>`

## Code Style
- Use TypeScript with strict mode enabled
- ESLint + Prettier formatting (single quotes, trailing commas)
- React hooks for state management, NestJS decorators for backend
- Import paths: `@/*` for frontend, `@shared/*` for shared types
- Error handling: Try-catch blocks, proper HTTP status codes
- Naming: camelCase for variables, PascalCase for components/classes