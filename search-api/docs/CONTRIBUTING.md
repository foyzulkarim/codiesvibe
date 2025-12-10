# Contributing Guide

Thank you for considering contributing to the CodiesVibe Search API!

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Code Review](#code-review)

---

## Getting Started

### Prerequisites

- Node.js >= 24.x
- Docker & Docker Compose
- Git

### Fork and Clone

```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/YOUR_USERNAME/codiesvibe.git
cd codiesvibe/search-api
```

### Setup Development Environment

```bash
# Install dependencies
npm install

# Start infrastructure
docker-compose -f docker-compose.infra.yml up -d

# Copy environment variables
cp .env.example .env
# Edit .env with your API keys

# Start development server
npm run dev
```

See [Development Guide](DEVELOPMENT.md) for complete setup.

---

## Development Workflow

### 1. Create Feature Branch

```bash
git checkout -b feature/your-feature-name
```

**Branch naming conventions**:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test additions/changes

### 2. Make Changes

- Write code following [Code Standards](#code-standards)
- Add tests for new functionality
- Update documentation as needed

### 3. Test Your Changes

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Unit tests
npm test

# E2E tests
npm run test:e2e

# Security tests
npx tsx test-security-validation.ts
```

**All tests must pass before submitting a PR.**

### 4. Commit Changes

Follow [Commit Guidelines](#commit-guidelines):

```bash
git add .
git commit -m "feat(search): add multi-language support"
```

### 5. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

---

## Code Standards

### TypeScript

- **Strict Mode**: Enabled in `tsconfig.json`
- **Type Safety**: Avoid `any`, use proper types
- **Null Safety**: Handle null/undefined explicitly

**Example**:
```typescript
// Good
function searchTools(query: string): Promise<Tool[]> {
  if (!query) {
    throw new Error('Query is required');
  }
  return executeSearch(query);
}

// Bad
function searchTools(query: any): any {
  return executeSearch(query);
}
```

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| **Files** | kebab-case | `vector-indexing.service.ts` |
| **Classes** | PascalCase | `VectorIndexingService` |
| **Functions** | camelCase | `generateEmbedding()` |
| **Constants** | SCREAMING_SNAKE_CASE | `MAX_RESULTS` |
| **Interfaces** | PascalCase | `SearchRequest` |
| **Types** | PascalCase | `IntentState` |

### Code Style

**Formatting**:
- Indentation: 2 spaces
- Line length: max 100 characters
- Quotes: Single quotes for strings
- Semicolons: Required

**Comments**:
```typescript
/**
 * Generate embedding for text using Together AI
 * @param text Input text to embed
 * @returns Promise<number[]> Embedding vector
 */
async function generateEmbedding(text: string): Promise<number[]> {
  // Implementation
}
```

### Error Handling

Always use try-catch for async operations:

```typescript
async function searchTools(query: string): Promise<Tool[]> {
  try {
    const results = await executeSearch(query);
    return results;
  } catch (error) {
    searchLogger.error('Search failed', error as Error, {
      query,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}
```

### Logging

Use `searchLogger` from `#config/logger`:

```typescript
import { searchLogger } from '#config/logger';

// Info
searchLogger.info('Processing search request', {
  service: 'search-api',
  query: 'AI tools'
});

// Error
searchLogger.error('Search failed', error as Error, {
  service: 'search-api',
  query: 'AI tools'
});
```

---

## Commit Guidelines

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `style` | Code style changes (formatting, etc.) |
| `refactor` | Code refactoring |
| `test` | Test additions/changes |
| `chore` | Build/tooling changes |
| `perf` | Performance improvements |

### Scope

Optional, specifies the component:
- `search` - Search pipeline
- `api` - API endpoints
- `db` - Database operations
- `cache` - Caching logic
- `security` - Security features

### Examples

```
feat(search): add multi-language support

- Add language detection in intent extractor
- Update schema with language field
- Add tests for language filtering

Closes #123
```

```
fix(cache): resolve cache invalidation bug

The cache was not properly invalidating when TTL expired.
This fix ensures expired entries are removed.

Fixes #456
```

```
docs(api): update API endpoint documentation

Add missing request/response examples for search endpoint.
```

### Rules

- Use imperative mood ("add" not "added")
- Don't capitalize first letter
- No period at the end
- Keep subject line under 50 characters
- Body lines under 72 characters

---

## Pull Request Process

### Before Submitting

Ensure your PR:
- [ ] Passes all tests (`npm test`)
- [ ] Passes type checking (`npm run typecheck`)
- [ ] Passes linting (`npm run lint`)
- [ ] Includes tests for new features
- [ ] Updates documentation
- [ ] Follows commit message format
- [ ] Has a clear, descriptive title

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing performed

## Checklist
- [ ] Tests pass
- [ ] Type checking passes
- [ ] Linting passes
- [ ] Documentation updated
- [ ] Changelog updated (if applicable)
```

### PR Title Format

Same as commit message format:

```
feat(search): add multi-language support
fix(cache): resolve cache invalidation bug
docs(api): update API endpoint documentation
```

---

## Code Review

### Review Process

1. **Automated Checks**: CI runs tests, linting, type checking
2. **Manual Review**: Maintainer reviews code
3. **Feedback**: Address review comments
4. **Approval**: At least one approval required
5. **Merge**: Squash and merge to main

### Review Criteria

- **Functionality**: Does it work as intended?
- **Tests**: Are there adequate tests?
- **Code Quality**: Is it readable and maintainable?
- **Performance**: Does it introduce performance issues?
- **Security**: Does it introduce security vulnerabilities?
- **Documentation**: Is it properly documented?

### Responding to Feedback

- Be respectful and professional
- Ask questions if feedback is unclear
- Make requested changes promptly
- Mark conversations as resolved when addressed

---

## Additional Resources

- [Development Guide](DEVELOPMENT.md)
- [Testing Guide](TESTING.md)
- [Architecture Guide](ARCHITECTURE.md)
- [Code of Conduct](../CODE_OF_CONDUCT.md)

---

## Questions?

- **GitHub Discussions**: [Ask a question](https://github.com/yourusername/codiesvibe/discussions)
- **GitHub Issues**: [Report a bug](https://github.com/yourusername/codiesvibe/issues)

---

Thank you for contributing! 🎉

[← Back to README](../README.md)
