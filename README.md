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
- **Backend**: NestJS + TypeScript with comprehensive API design and authentication
- **Search API**: Dedicated Node.js service with LangGraph-based intelligent search
- **Database**: MongoDB Atlas with advanced indexing for flexible tool categorization
- **Vector Database**: Qdrant Cloud for semantic search and similarity matching
- **Infrastructure**: Docker-based deployment with Nginx reverse proxy and comprehensive monitoring

### Technical Differentiators

1. **AI-Powered Search**: Semantic understanding using vector embeddings and similarity matching
2. **Scalable Data Layer**: MongoDB aggregation pipelines with optimized indexing strategies
3. **Modern Stack**: Full TypeScript implementation with strict type safety
4. **Production Ready**: Enterprise-grade reliability with comprehensive monitoring

## 📺 Demo

### Check out the demo to see CodiesVibe in action:

[video_codiesvibe-teaser-trailer.webm](https://github.com/user-attachments/assets/c0658d61-65bf-4c1e-9a8d-68e609698fae)


## 💼 Hire the Author: Consultation & Customization

Need help setting up, customizing, or integrating CodiesVibe? I'm available for professional consultation and custom development services.

I can help you and your team:

  * **Get Started Fast:** With a private 1-on-1 consultation and code walkthrough.
  * **Integrate Your Data:** Connect the agentic search pipeline to your specific database (SQL, NoSQL, APIs).
  * **Build Custom Solutions:** Design and build fully custom agentic workflows, new features, or integrate with your existing applications.

If you want to save development time and get an expert solution, you can hire me directly on Upwork.

Click here 👉 [Upwork project: You will get an Agentic AI search engine that understands natural language queries](https://www.upwork.com/services/product/development-it-an-agentic-ai-search-engine-that-understands-natural-language-queries-1984486172450236617?ref=project_share)

## 🚀 Quick Start

### Prerequisites
```bash
# Required
- Docker & Docker Compose
- Git

# Cloud Services Required for Production
- MongoDB Atlas (for production database)
- Qdrant Cloud (for vector database)
- AI Service API Key (Together AI, OpenAI, or similar)

# Optional for Development
- Local MongoDB and Qdrant (using docker-compose.infra.yml)
- vLLM or Ollama for local AI models
```

### 🚀 Production Deployment (Recommended)

```bash
# 1. Clone and setup
git clone https://github.com/foyzulkarim/codiesvibe.git
cd codiesvibe

# 2. Configure production environment variables
# The .env.production file is already created with cloud service credentials
# Review and update any values as needed for your specific deployment:
# - MONGODB_URI (MongoDB Atlas)
# - QDRANT_URL & QDRANT_API_KEY (Qdrant Cloud)
# - TOGETHER_AI_API_KEY (AI service)
# - Security secrets (JWT_SECRET, etc.)
#
# IMPORTANT: Never commit .env.production to git! It contains sensitive data.

# 3. Create external network (one-time setup)
docker network create codiesvibe-network

# 4. (Optional) Seed database manually
# Set up environment variables and run:
# MONGODB_URI="your-mongodb-connection-string" npm run seed:production

# 5. Start production services
docker-compose -f docker-compose.production.yml up --build -d

# 6. Access CodiesVibe
open http://localhost    # Web application (Nginx)
open http://localhost:4000/health   # Backend API health
open http://localhost:4003/health   # Search API health
```

### 🔧 Development Setup

```bash
# 1. Clone and setup
git clone https://github.com/foyzulkarim/codiesvibe.git
cd codiesvibe

# 2. Start local infrastructure (MongoDB, Qdrant, monitoring)
docker-compose -f docker-compose.infra.yml up -d

# 3. Configure development environment
cp backend/.env.example backend/.env
cp .env.example .env.local
# Edit with local development settings

# 4. Install dependencies
npm install
cd backend && npm install && cd ..

# 5. Start development servers
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend
cd backend && npm run dev

# Terminal 3: Search API (optional, for search development)
cd search-api && npm run dev

# 6. Access services
open http://localhost:3000     # Frontend development server
open http://localhost:4000/health   # Backend API health
open http://localhost:4003/health   # Search API health
```

## 🐳 Docker Services Architecture

### Production Services (docker-compose.production.yml)
- **nginx**: Reverse proxy and static file server (ports 80, 443)
- **frontend-init**: One-time container that builds and copies frontend assets
- **backend**: Main NestJS application (port 4000)
- **search-api**: Dedicated AI search service (port 4003)

### Infrastructure Services (docker-compose.infra.yml) - Development Only
- **mongodb**: MongoDB database (port 27017)
- **qdrant**: Vector database for semantic search (port 6333)
- **monitoring stack**: Prometheus, Grafana, Loki for observability

### Service Communication
- **Frontend → Backend**: Via Nginx reverse proxy (/api/* routes)
- **Backend → Search API**: Internal Docker network (http://search-api:4003)
- **Search API → Cloud Services**: Direct connections to MongoDB Atlas, Qdrant Cloud
- **Health Checks**: All services expose `/health` endpoints for monitoring

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
- [x] Dedicated Search API service with LangGraph implementation
- [x] MongoDB Atlas integration with advanced indexing
- [x] Cloud-based deployment infrastructure with Nginx
- [x] Production monitoring and observability

### ✅ **AI Search Engine**
- [x] Dedicated search-api service with LangGraph orchestration
- [x] Qdrant Cloud vector database integration
- [x] Multi-vector similarity matching algorithms
- [x] Intent extraction and query planning
- [x] Semantic search with result ranking
- [x] Docker containerization for production deployment

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

This is a fantastic idea. Adding this to your `README.md` is the best way to convert your open-source traffic into paying clients.

Here is the full markdown section you can copy and paste directly into your `README.md`. It's designed to be professional, clear, and drive clicks to your Upwork project.
## 🔄 Continuous Deployment (CD) Setup

This repository is configured for automated Continuous Deployment to a VPS using GitHub Actions. Any push to the `main` branch will automatically trigger a full build and redeployment of the Docker containers on your server.

### Prerequisites

1.  **VPS Access:** A server running Docker and Docker Compose.
2.  **SSH Key Pair:** An SSH key pair where the public key is authorized on your VPS for the deployment user.
3.  **Repository Cloned:** The `codiesvibe` repository must be cloned on your VPS at the specified project path.

### 1. Configure GitHub Secrets

The deployment workflow requires secure access to your VPS, which is managed via GitHub Secrets. You must add the following four secrets to your repository settings under **Settings** > **Secrets and variables** > **Actions**:

| Secret Name | Description |
| :--- | :--- |
| `VPS_SSH_HOST` | The IP address or hostname of your VPS. |
| `VPS_SSH_USERNAME` | The SSH username (e.g., `ubuntu` or `deploy`). |
| `VPS_SSH_PRIVATE_KEY` | The private SSH key corresponding to the user on the VPS. |
| `VPS_PROJECT_DIR` | The absolute path to the codiesvibe directory on your VPS (e.g., `/home/ubuntu/codiesvibe`). |

### 2. Prepare Your VPS

1.  **Clone the Repository:** Ensure the repository is cloned on your VPS at the path specified in the `VPS_PROJECT_DIR` secret.
    ```bash
    # Replace /home/ubuntu/codiesvibe with your actual project path
    git clone https://github.com/foyzulkarim/codiesvibe.git /home/ubuntu/codiesvibe
    ```
2.  **Set Repository Permissions:** Ensure the `VPS_SSH_USERNAME` has proper ownership and permissions for the project directory.
    ```bash
    # Example: Set ownership for ubuntu user
    sudo chown -R ubuntu:ubuntu /home/ubuntu/codiesvibe
    ```
3.  **Authorize SSH Key:** Ensure the public key corresponding to the `VPS_SSH_PRIVATE_KEY` is added to the `~/.ssh/authorized_keys` file for the `VPS_SSH_USERNAME`.

### 3. Finalize GitHub Actions Workflow

The workflow file is included in this PR at `.github/workflows/cd-production.yml`. No additional file movement is required.

The workflow performs the following steps on your VPS:

1.  Validates the `VPS_PROJECT_DIR` path is set
2.  Navigates to the project directory (clones if it doesn't exist)
3.  Executes `git pull origin main` to fetch the latest code (no authentication required for public repository)
4.  Runs the enhanced `scripts/deploy.sh` which:
    - Stashes any local changes to prevent conflicts
    - Pulls the latest code with error handling
    - Stops containers and removes all volumes and orphaned containers (`docker-compose down --volumes --remove-orphans`)
    - Rebuilds and starts all containers with fresh state (`docker-compose up -d --build --force-recreate`)
    - Verifies deployment success with health checks
    - Provides detailed container status and logs if deployment fails

This ensures a robust deployment process with proper error handling, complete cleanup of Docker volumes, and verification of successful deployment.
