# Development Guide

Complete guide for setting up a local development environment and contributing to CodiesVibe.

## 🚀 Quick Development Setup

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for native development)
- Git

### 1. Clone Repository
```bash
git clone https://github.com/foyzulkarim/codiesvibe.git
cd codiesvibe
```

### 2. Start Infrastructure
```bash
# Start MongoDB, Redis, Qdrant, and monitoring
docker-compose -f docker-compose.infra.yml up -d

# Verify services are healthy
docker-compose -f docker-compose.infra.yml ps
```

### 3. Configure Environment
```bash
# Frontend environment
cp .env.example .env.local

# Backend environment
cp backend/.env.example backend/.env

# Edit files as needed
nano .env.local
nano backend/.env
```

### 4. Install Dependencies
```bash
# Frontend dependencies
npm install

# Backend dependencies
cd backend && npm install
```

### 5. Start Development Servers
```bash
# Terminal 1: Start frontend (Vite dev server)
npm run dev

# Terminal 2: Start backend (NestJS with hot reload)
cd backend && npm run dev

# Terminal 3: Start search API (optional)
docker-compose -f docker-compose.search-api.dev.yml up --build
```

### 6. Access Applications
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **Backend Health**: http://localhost:4000/api/health
- **Search API**: http://localhost:4003
- **Monitoring**: http://localhost:3001 (Grafana)

## 🛠️ Development Workflow

### Code Structure
```
codiesvibe/
├── src/                    # Frontend React application
│   ├── components/         # React components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility functions
│   ├── pages/             # Page components
│   └── api/               # API client code
├── backend/               # NestJS backend application
│   ├── src/               # Backend source code
│   │   ├── tools/         # Tools module
│   │   ├── auth/          # Authentication module
│   │   └── database/      # Database configuration
│   └── test/              # Backend tests
├── search-api/            # AI search service
│   ├── src/               # Search API source
│   └── graphs/            # LangGraph search pipeline
├── docs/                  # Documentation
└── scripts/               # Utility scripts
```

### Development Commands

#### Frontend (Root Directory)
```bash
npm run dev              # Start development server with hot reload
npm run build            # Build for production
npm run build:dev        # Build with development optimizations
npm run preview          # Preview production build
npm run lint             # ESLint with auto-fix
npm run lint:warn        # ESLint warnings only
npm run typecheck        # TypeScript type checking
npm test                 # Run tests (placeholder)
```

#### Backend (Backend Directory)
```bash
npm run dev              # Start development server with hot reload
npm run start:debug      # Start with Node.js debugging
npm run build            # Build for production
npm run start:prod       # Start production server
npm test                 # Run unit tests
npm run test:e2e         # Run end-to-end tests
npm run test:cov         # Test coverage report
npm run lint             # ESLint with auto-fix
npm run typecheck        # TypeScript type checking
npm run seed             # Seed database with sample data
npm run format           # Prettier code formatting
```

#### Search API (Search API Directory)
```bash
npm run dev              # Start search API with hot reload
npm run build            # Build TypeScript application
npm start                # Start production server
npm test                 # Run tests
npm run type-check       # TypeScript type checking
npm run create-collections  # Create Qdrant vector collections
npm run seed-vectors     # Seed vector database
```

#### Infrastructure
```bash
npm run infra:start      # Start infrastructure services
npm run infra:stop       # Stop infrastructure services
npm run infra:restart    # Restart infrastructure services
npm run infra:status     # Check infrastructure status
npm run infra:logs       # View infrastructure logs
```

## 🔧 Environment Configuration

### Frontend Environment (.env.local)
```env
VITE_API_URL=http://localhost:4000/api
VITE_DEBUG=true
VITE_DEV_TOOLS=true
VITE_APP_NAME=CodiesVibe
VITE_ENVIRONMENT=development
```

### Backend Environment (backend/.env)
```env
NODE_ENV=development
PORT=4000
MONGODB_URI=mongodb://admin:password123@localhost:27017/codiesvibe?authSource=admin
REDIS_URL=redis://:redis123@localhost:6379
JWT_SECRET=dev-jwt-secret-change-in-production
CORS_ORIGIN=http://localhost:3000

# Optional debugging
DEBUG=*
LOG_LEVEL=debug
```

### Search API Environment
The search API uses environment variables from docker-compose files. See [Installation Guide](./installation.md) for details.

## 🧪 Testing

### Frontend Testing
```bash
# Run tests (currently placeholder)
npm test

# Type checking
npm run typecheck

# Linting
npm run lint
```

### Backend Testing
```bash
# Unit tests
cd backend && npm test

# Integration tests
cd backend && npm run test:integration

# End-to-end tests
cd backend && npm run test:e2e

# Test coverage
cd backend && npm run test:cov

# Watch mode
cd backend && npm run test:watch
```

### Search API Testing
```bash
# Run tests
cd search-api && npm test

# Type checking
cd search-api && npm run type-check

# Enhanced testing
cd search-api && npm run test:enhanced

# Integration tests
cd search-api && npm run test:enhanced:integration
```

## 🐛 Debugging

### Frontend Debugging
- **Browser DevTools**: Use Chrome DevTools for frontend debugging
- **React DevTools**: Install React Developer Tools browser extension
- **Network Tab**: Monitor API calls and responses
- **Console**: Check for JavaScript errors and warnings

### Backend Debugging
```bash
# Start with debugging enabled
cd backend && npm run start:debug

# Connect with Node.js debugger (VS Code)
# Use .vscode/launch.json configuration:
{
  "type": "node",
  "request": "launch",
  "name": "Debug NestJS",
  "program": "${workspaceFolder}/backend/src/main.ts",
  "outFiles": ["${workspaceFolder}/backend/dist/**/*.js"],
  "env": {
    "NODE_ENV": "development"
  }
}
```

### Search API Debugging
```bash
# Start with debug logs
docker-compose -f docker-compose.search-api.dev.yml logs -f search-api-dev

# Enable debug mode
POST http://localhost:4003/search
{
  "query": "test query",
  "debug": true
}
```

### Database Debugging
```bash
# MongoDB connection test
docker exec -it codiesvibe-mongodb mongosh --eval "db.adminCommand('ping')"

# View collections
docker exec -it codiesvibe-mongodb mongosh --eval "use codiesvibe; show collections"

# Query tools
docker exec -it codiesvibe-mongodb mongosh --eval "use codiesvibe; db.tools.find().limit(5)"
```

## 🔄 Hot Reload Development

### Frontend Hot Reload
Vite provides instant hot module replacement (HMR):
- Edit React components → See changes immediately
- Edit styles → Update without page refresh
- Edit TypeScript → Type errors appear in dev tools

### Backend Hot Reload
NestJS with `ts-node-dev` provides automatic restart:
- Edit controllers/services → Server restarts automatically
- Edit DTOs → Validation updates on next request
- Edit configuration → Manual restart may be needed

### Search API Development
For search API development, use the development docker-compose:
```bash
docker-compose -f docker-compose.search-api.dev.yml up --build
```

This provides:
- Volume mounts for source code
- Automatic rebuilds on file changes
- Debug logging and error reporting

## 📊 Monitoring in Development

### Application Metrics
- **Backend**: http://localhost:4000/api/metrics
- **Search API**: http://localhost:4003/health
- **Frontend**: Browser dev tools performance tab

### Infrastructure Monitoring
- **Grafana**: http://localhost:3001 (admin / admin123)
- **Prometheus**: http://localhost:9090
- **MongoDB Express**: http://localhost:8081

### Log Monitoring
```bash
# Follow application logs
docker-compose logs -f backend
docker-compose logs -f search-api-dev

# Follow infrastructure logs
docker-compose -f docker-compose.infra.yml logs -f
```

## 🎯 Development Best Practices

### Code Style
- **TypeScript**: Use strict type checking
- **ESLint**: Follow Airbnb style guide with custom rules
- **Prettier**: Automatic code formatting
- **Husky**: Pre-commit hooks for code quality

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/amazing-feature

# Make changes with frequent commits
git add .
git commit -m "feat: add amazing feature"

# Push and create PR
git push origin feature/amazing-feature
```

### Commit Messages
Follow conventional commit format:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

### Testing Strategy
- **Unit Tests**: Test individual functions and classes
- **Integration Tests**: Test API endpoints and database operations
- **E2E Tests**: Test complete user workflows
- **Type Checking**: Catch type errors before runtime

## 🔧 Common Development Tasks

### Adding a New Tool
```bash
# 1. Add tool to database via API
curl -X POST http://localhost:4000/api/tools \
  -H "Content-Type: application/json" \
  -d @new-tool.json

# 2. Update search vectors
docker exec -it codiesvibe-search-api npm run seed-vectors

# 3. Test search functionality
curl -X POST http://localhost:4003/search \
  -H "Content-Type: application/json" \
  -d '{"query": "your tool name"}'
```

### Adding New API Endpoints
```bash
# 1. Create controller in backend
# 2. Add DTOs for request/response
# 3. Update service layer
# 4. Add tests
# 5. Update API documentation

# Test new endpoint
curl -X GET http://localhost:4000/api/new-endpoint
```

### Database Schema Changes
```bash
# 1. Update Mongoose schema
# 2. Create migration script if needed
# 3. Update related services
# 4. Add/update tests
# 5. Test with sample data
```

### Search Feature Development
```bash
# 1. Modify search pipeline in search-api/src/graphs/
# 2. Update vector types if needed
# 3. Test with debug mode
# 4. Re-index vectors if schema changed
# 5. Update documentation
```

## 🚀 Performance Development

### Frontend Performance
- Use React.memo() for expensive components
- Implement virtual scrolling for long lists
- Optimize bundle size with code splitting
- Use lazy loading for images and routes

### Backend Performance
- Implement database indexing for slow queries
- Use Redis caching for frequently accessed data
- Add pagination for large result sets
- Monitor API response times

### Search Performance
- Optimize vector search parameters
- Cache search results when appropriate
- Monitor vector index health
- Tune RRF parameters for better ranking

## 🆘 Troubleshooting Development Issues

### Common Problems

#### Frontend Won't Start
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

#### Backend Database Connection
```bash
# Check MongoDB container
docker-compose ps mongodb

# Restart infrastructure
npm run infra:restart
npm run infra:logs
```

#### Search API Issues
```bash
# Check vector index health
curl http://localhost:4003/health

# Re-index vectors
docker exec -it codiesvibe-search-api npm run seed-vectors -- --force
```

#### Hot Reload Not Working
```bash
# Restart development servers
npm run dev
cd backend && npm run dev

# Check for file watcher limits
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### Getting Help
1. **Check logs**: Look for error messages in application logs
2. **Search issues**: Check existing GitHub issues
3. **Ask questions**: Use GitHub discussions for help
4. **Debug systematically**: Use browser dev tools and VS Code debugger

---

**📚 Related Documentation**:
- [Installation Guide](./installation.md) - Complete setup instructions
- [Contributing Guide](./contributing.md) - How to contribute
- [API Reference](./api.md) - API documentation
- [AI Search Architecture](./ai-search.md) - Search system details