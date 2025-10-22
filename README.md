# CodiesVibe

> **The intelligent AI tools directory that helps developers find the perfect tools for their needs**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescript.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

## 🌟 What is CodiesVibe?

CodiesVibe is a modern, intelligent directory of AI-powered development tools designed to help developers discover, compare, and choose the right tools for their specific needs. In a world where new AI tools emerge daily, CodiesVibe cuts through the noise with smart search capabilities, detailed categorization, and community-driven insights.

### 🎯 Our Mission

We believe that the right tools can dramatically accelerate development and unlock new possibilities. But with hundreds of AI tools launching every month, finding the perfect match for your specific use case becomes overwhelming.

CodiesVibe solves this by:

- **🔍 Intelligent Discovery**: Advanced AI-powered search that understands your intent and context
- **📊 Smart Categorization**: Tools organized by functionality, industry, pricing, and technical requirements
- **⚡ Real Insights**: Community reviews, usage statistics, and detailed feature comparisons
- **🎯 Personalized Recommendations**: Find tools tailored to your specific stack and requirements

### 🚀 Why CodiesVibe?

#### For Developers
- **Save Time**: Quickly find relevant tools without hours of research
- **Make Better Decisions**: Compare features, pricing, and integration capabilities
- **Stay Current**: Discover new tools as they emerge in the rapidly evolving AI landscape

#### For Tool Creators
- **Get Discovered**: Reach developers actively looking for solutions like yours
- **Build Credibility**: Showcase your tool with comprehensive listings and reviews
- **Grow Your User Base**: Connect with your ideal users through smart targeting

#### For the Community
- **Share Knowledge**: Contribute reviews, insights, and real-world experiences
- **Learn Together**: Discover what tools others are using and why
- **Shape the Future**: Help define the next generation of development tools

## 🏗️ Technology & Vision

CodiesVibe is built as a **production-grade platform** using modern web technologies, but our focus is on creating the best possible experience for our users - not just showcasing tech stack.

### Core Architecture
- **Frontend**: React 18 + TypeScript + Vite for a fast, responsive user experience
- **Backend**: NestJS + TypeScript with comprehensive API design
- **Database**: MongoDB with advanced indexing for flexible tool categorization
- **Search**: LangGraph-based intelligent search with multi-vector similarity matching
- **Infrastructure**: Docker-based deployment with comprehensive monitoring

### What Makes Us Different

1. **AI-Powered Search**: Not just keyword matching, but true understanding of developer intent
2. **Comprehensive Data**: Detailed categorization including pricing models, integrations, and use cases
3. **Developer-First**: Built by developers, for developers, with real workflows in mind
4. **Production Ready**: Enterprise-grade reliability and performance from day one

## 🚀 Quick Start

### Prerequisites
```bash
# Required
- Docker & Docker Compose
- Git

# Recommended for full features
- External MongoDB (MongoDB Atlas recommended)
- vLLM or Ollama for AI search (optional, falls back to API-based search)
```

### Get Running in 2 Minutes

```bash
# 1. Clone and setup
git clone https://github.com/foyzulkarim/codiesvibe.git
cd codiesvibe

# 2. Start infrastructure (MongoDB, Qdrant, monitoring)
docker-compose -f docker-compose.infra.yml up -d

# 3. Start the application
docker-compose -f docker-compose.production.yml up --build

# 4. Access CodiesVibe
open http://localhost    # Web application
open http://localhost:4003/health  # Search API health
```

### What You Get
- **🌐 Modern Web App**: Clean, responsive interface for browsing and discovering tools
- **🔍 Intelligent Search**: AI-powered search that understands what you're looking for
- **📊 Rich Tool Data**: Comprehensive information about each tool including pricing, features, and integrations
- **⚡ Fast Performance**: Optimized for speed with caching and smart data loading

## 📚 Documentation & Technical Details

We've separated our comprehensive technical documentation from this high-level overview:

### 📖 **[Technical Documentation →](./docs)**

- **[Installation Guide](./docs/installation.md)** - Detailed setup for all environments
- **[API Reference](./docs/api.md)** - Complete API documentation with examples
- **[Deployment Guide](./docs/deployment.md)** - Production deployment strategies
- **[Development Guide](./docs/development.md)** - Local development setup
- **[AI Search Architecture](./docs/ai-search.md)** - How our intelligent search works
- **[Contributing Guide](./docs/contributing.md)** - How to contribute to the project

### Key Technical Features
- **🐳 Complete Containerization**: Development, production, and infrastructure environments
- **📊 Full Observability**: Prometheus, Grafana, Loki monitoring stack
- **🔄 Advanced CI/CD**: Automated testing, building, and deployment
- **🔒 Security First**: Vulnerability scanning, security headers, best practices
- **⚡ Performance Optimized**: Multi-stage builds, caching, CDN integration

## 🎯 Current Features

### 🔍 Intelligent Search
- **Natural Language Queries**: "AI tools for React developers with free tier"
- **Semantic Understanding**: Finds tools based on functionality, not just keywords
- **Multi-Vector Search**: Combines semantic, categorical, and usage pattern matching
- **AI Reasoning**: Shows you *why* certain tools are recommended

### 📊 Comprehensive Tool Database
- **Rich Metadata**: Pricing models, integrations, deployment options, supported languages
- **Categorization**: By functionality, industry, company size, technical requirements
- **Community Insights**: Reviews, ratings, and real-world usage examples
- **Real-time Updates**: Regular updates with new tools and features

### 🎨 Modern User Experience
- **Responsive Design**: Works beautifully on desktop, tablet, and mobile
- **Fast Loading**: Optimized performance with lazy loading and caching
- **Intuitive Navigation**: Easy filtering, sorting, and comparison tools
- **Accessibility**: WCAG compliant with keyboard navigation and screen reader support

## 🗺️ Roadmap

### 🚀 **Phase 1: Foundation** ✅
- [x] Core web application with tool browsing
- [x] Basic search and filtering
- [x] Tool submission and management system
- [x] Production-ready deployment infrastructure

### 🧠 **Phase 2: Intelligence** ✅
- [x] AI-powered search with LangGraph
- [x] Multi-vector similarity matching
- [x] Intelligent categorization and tagging
- [x] Search reasoning and explanations

### 🌟 **Phase 3: Community** (In Progress)
- [ ] User accounts and authentication
- [ ] Tool reviews and ratings
- [ ] User collections and favorites
- [ ] Community-driven insights

### 🚀 **Phase 4: Platform** (Planned)
- [ ] Tool comparison tools
- [ ] Integration recommendations
- [ ] Usage analytics and insights
- [ ] API for third-party integrations

### 🌍 **Phase 5: Ecosystem** (Future)
- [ ] Plugin system for custom integrations
- [ ] Team features and collaboration
- [ ] Enterprise features and SSO
- [ ] Global expansion and localization

## 🤝 Contributing

We welcome contributions from the community! Whether you're:

- **🐛 Reporting bugs** and issues
- **💡 Suggesting features** and improvements
- **📝 Improving documentation**
- **🔧 Contributing code** and fixes
- **🔍 Adding new tools** to our database

**📖 See our [Contributing Guide](./docs/contributing.md)** for detailed information on how to get started.

### Quick Contribution Stats
- **TypeScript** for type safety and better developer experience
- **Comprehensive tests** for reliability
- **CI/CD pipeline** for automated quality checks
- **Docker-based** development for consistent environments

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Connect & Support

- **🐛 [Bug Reports](https://github.com/foyzulkarim/codiesvibe/issues)** - Found something broken? Let us know!
- **💡 [Feature Requests](https://github.com/foyzulkarim/codiesvibe/discussions)** - Have an idea? We'd love to hear it!
- **📖 [Documentation](./docs)** - Comprehensive guides and API reference
- **🌟 [Give us a star](https://github.com/foyzulkarim/codiesvibe)** - Show your support!

---

**Built with ❤️ by developers, for developers**

*Helping build the future of AI-powered development, one tool at a time.*