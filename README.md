# CodiesVibe

> **An intelligent AI tools directory with advanced search capabilities**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescript.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

## 🔧 Technical Overview

CodiesVibe is a full-stack application that demonstrates modern web development practices with AI-powered search capabilities. Built as a comprehensive tool directory with intelligent search functionality using vector embeddings and semantic matching.

### Key Technical Features

- **🧠 AI-Powered Search**: LangGraph-based semantic search with multi-vector similarity matching
- **📊 Vector Database**: Qdrant integration for efficient similarity search and tool recommendations  
- **🔍 Advanced Filtering**: MongoDB aggregation pipelines for complex tool categorization
- **⚡ Performance**: Optimized React frontend with lazy loading and intelligent caching

## 🏗️ Architecture & Implementation

CodiesVibe is built as a **production-grade platform** using modern web technologies, focusing on technical excellence and performance optimization.

### Core Architecture
- **Frontend**: React 18 + TypeScript + Vite for a fast, responsive user experience
- **Backend**: NestJS + TypeScript with comprehensive API design
- **Database**: MongoDB with advanced indexing for flexible tool categorization
- **Search**: LangGraph-based intelligent search with multi-vector similarity matching
- **Infrastructure**: Docker-based deployment with comprehensive monitoring

### Technical Differentiators

1. **AI-Powered Search**: Semantic understanding using vector embeddings and similarity matching
2. **Scalable Data Layer**: MongoDB aggregation pipelines with optimized indexing strategies
3. **Modern Stack**: Full TypeScript implementation with strict type safety
4. **Production Ready**: Enterprise-grade reliability with comprehensive monitoring

## 📺 Demo

### Check out the demo to see CodiesVibe in action:

[video_codiesvibe-teaser-trailer.webm](https://github.com/user-attachments/assets/c0658d61-65bf-4c1e-9a8d-68e609698fae)


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

## 📚 Technical Documentation

Comprehensive technical documentation covering implementation details:

### 📖 **[Technical Documentation →](./docs)**

- **[Installation Guide](./docs/installation.md)** - Detailed setup for all environments
- **[API Reference](./docs/api.md)** - Complete API documentation with examples
- **[Deployment Guide](./docs/deployment.md)** - Production deployment strategies
- **[Development Guide](./docs/development.md)** - Local development setup
- **[AI Search Architecture](./docs/ai-search.md)** - How the intelligent search works

### Key Technical Features
- **🐳 Complete Containerization**: Development, production, and infrastructure environments
- **📊 Full Observability**: Prometheus, Grafana, Loki monitoring stack
- **🔄 Advanced CI/CD**: Automated testing, building, and deployment
- **🔒 Security First**: Vulnerability scanning, security headers, best practices
- **⚡ Performance Optimized**: Multi-stage builds, caching, CDN integration

## 🎯 Technical Features

### 🔍 AI-Powered Search Engine
- **Semantic Search**: LangGraph implementation with vector embeddings for contextual understanding
- **Multi-Vector Matching**: Combines semantic, categorical, and usage pattern similarity algorithms
- **Query Processing**: Natural language processing with intent recognition and entity extraction
- **Result Ranking**: Custom scoring algorithms based on relevance, popularity, and user context

### 📊 Data Architecture
- **MongoDB Integration**: Advanced aggregation pipelines for complex filtering and categorization
- **Qdrant Vector DB**: High-performance similarity search with HNSW indexing
- **Schema Design**: Flexible document structure supporting rich metadata and relationships
- **Indexing Strategy**: Compound indexes optimized for search patterns and query performance

### 🎨 Frontend Implementation
- **React 18**: Modern component architecture with concurrent features and suspense
- **TypeScript**: Strict type safety with advanced type inference and generic constraints
- **Performance**: Code splitting, lazy loading, and intelligent caching strategies
- **Responsive Design**: Mobile-first approach with CSS Grid and Flexbox layouts
- **Accessibility**: WCAG compliant with keyboard navigation and screen reader support

## 🎯 Implementation Status

### ✅ **Core Platform**
- [x] Full-stack web application with React + NestJS
- [x] MongoDB integration with advanced indexing
- [x] Docker-based deployment infrastructure
- [x] Production monitoring and observability

### ✅ **AI Search Engine**
- [x] LangGraph-based semantic search implementation
- [x] Qdrant vector database integration
- [x] Multi-vector similarity matching algorithms
- [x] Search reasoning and result explanations

### 🔄 **Advanced Features** (In Development)
- [ ] User authentication and personalization
- [ ] Tool comparison and analytics
- [ ] API integrations and webhooks
- [ ] Performance optimization and caching layers

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Project Links

- **🐛 [Issues](https://github.com/foyzulkarim/codiesvibe/issues)** - Bug reports and feature requests
- **📖 [Documentation](./docs)** - Technical guides and API reference
- **🌟 [GitHub Repository](https://github.com/foyzulkarim/codiesvibe)** - Source code and releases

---

**Built with modern web technologies and AI-powered search capabilities**

*A technical showcase of full-stack development with intelligent search implementation.*
