# CodiesVibe Technical Documentation

Welcome to the comprehensive technical documentation for CodiesVibe. This section contains all the detailed implementation guides, API references, and technical architecture information.

## 📚 Documentation Structure

### 🚀 **Getting Started**
- **[Installation Guide](./installation.md)** - Complete setup instructions for all environments
- **Quick Start** - 2-minute setup for local development
- **Prerequisites** - Required software and dependencies

### 🛠️ **Development**
- **[Development Guide](./development.md)** - Local development setup and workflows
- **[Contributing Guide](./contributing.md)** - How to contribute to the project
- **Code Standards** - TypeScript, ESLint, testing conventions
- **Architecture Overview** - Detailed system architecture

### 🤖 **AI Search System**
- **[AI Search Architecture](./ai-search.md)** - How our intelligent search works
- **[Search API Reference](./search-api.md)** - Complete search API documentation
- **LangGraph Integration** - Understanding the 3-node search pipeline
- **Vector Database Setup** - Qdrant configuration and optimization

### 🌐 **API Documentation**
- **[API Reference](./api.md)** - Complete REST API documentation
- **Authentication** - JWT and OAuth implementation
- **Database Schema** - MongoDB data models and relationships
- **Error Handling** - Error codes and troubleshooting

### 🐳 **Deployment**
- **[Deployment Guide](./deployment.md)** - Production deployment strategies
- **Docker Configuration** - Container setup and optimization
- **Environment Configuration** - Environment variables and secrets
- **Monitoring Setup** - Prometheus, Grafana, and observability

### 🔧 **Infrastructure**
- **[Infrastructure Guide](./infrastructure.md)** - Docker Compose configurations
- **Database Setup** - MongoDB configuration and indexing
- **Monitoring Stack** - Prometheus, Grafana, Loki setup
- **Security Configuration** - Hardening and best practices

### 🔍 **Search API Specific**
- **[Search API Setup](./search-api-setup.md)** - Dedicated search API configuration
- **vLLM Integration** - Host-based AI model setup
- **Vector Indexing** - Creating and managing vector collections
- **Performance Optimization** - Search performance tuning

## 🎯 Quick Navigation

### For New Contributors
1. Start with [Installation Guide](./installation.md)
2. Read the [Development Guide](./development.md)
3. Check the [Contributing Guide](./contributing.md)

### For System Administrators
1. Review [Deployment Guide](./deployment.md)
2. Check [Infrastructure Guide](./infrastructure.md)
3. Read [Security Configuration](./security.md)

### For API Users
1. Start with [API Reference](./api.md)
2. Check [Authentication](./authentication.md)
3. Review [Error Handling](./error-handling.md)

### For Search Features
1. Read [AI Search Architecture](./ai-search.md)
2. Check [Search API Reference](./search-api.md)
3. Review [Search API Setup](./search-api-setup.md)

## 🔗 External Links

- **Main Project README** - [← Back to Overview](../README.md)
- **GitHub Repository** - [Source Code](https://github.com/foyzulkarim/codiesvibe)
- **Live Demo** - [CodiesVibe App](https://codiesvibe.com) (when available)
- **API Playground** - [Interactive API](https://api.codiesvibe.com/docs) (when available)

## 📝 Documentation Conventions

### Code Blocks
```bash
# Shell commands are shown like this
docker-compose up -d
```

```typescript
// TypeScript code like this
const example = "Hello, CodiesVibe!";
```

### Environment Variables
```env
# Environment variables are shown like this
NODE_ENV=production
MONGODB_URI=mongodb://localhost:27017/codiesvibe
```

### File Structure
```
docs/
├── installation.md
├── development.md
└── api.md
```

### Tables
| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend | React + TypeScript | User interface |
| Backend | NestJS + TypeScript | API server |
| Database | MongoDB | Tool data storage |

## 🤝 Contributing to Documentation

We welcome improvements to our documentation! Please:

1. **Check existing issues** for documentation-related requests
2. **Follow the same style** and formatting as existing docs
3. **Include examples** where possible
4. **Test your instructions** to ensure they work
5. **Update multiple files** if changes affect different sections

### Documentation Style Guide
- Use clear, concise language
- Include practical examples
- Add code snippets for all technical instructions
- Use consistent formatting (see conventions above)
- Include troubleshooting sections where helpful

---

**📖 Need help?** Check our [main README](../README.md) for project overview or [open an issue](https://github.com/foyzulkarim/codiesvibe/issues) for specific questions.