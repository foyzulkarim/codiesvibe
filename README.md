# CodiesVibe - AI Tools Directory

A comprehensive directory of AI tools built with TypeScript, React, and NestJS, featuring production-grade Docker containerization for streamlined development and deployment.

## 🚀 Quick Start

Choose your preferred environment setup:

- **🔧 [Development Setup](#development-environment)** - Local development with hot reload
- **🚀 [Production Deployment](#production-environment)** - Production-ready with Nginx reverse proxy  
- **☁️ [Cloudflare Tunnel](#cloudflare-environment)** - Secure public access via Cloudflare
- **📊 [Monitoring Stack](#monitoring-environment)** - Comprehensive observability

## 📋 Prerequisites

- **Docker** (v20.10+) and **Docker Compose** (v2.0+)
- **Git** for repository management
- **External MongoDB** instance (connection string required)
- **Optional**: Cloudflare account for tunnel deployment

## 🏗️ Architecture Overview

```mermaid
graph TB
    subgraph "Frontend (React + Vite)"
        FE[React App]
        FE --> |"Port 3000"| NGINX[Nginx Reverse Proxy]
    end
    
    subgraph "Backend (NestJS)"
        BE[NestJS API]
        BE --> |"Port 4000"| DB[(External MongoDB)]
        BE --> REDIS[(Redis Cache)]
    end
    
    subgraph "Infrastructure"
        PROM[Prometheus]
        GRAF[Grafana]
        LOKI[Loki]
        MONGO[Mongo Express]
    end
    
    NGINX --> BE
    PROM --> BE
    PROM --> FE
    GRAF --> PROM
    LOKI --> BE
```

## 🐳 Available Docker Environments

| Environment | Purpose | Ports | Features |
|-------------|---------|-------|----------|
| **Development** | Local development | 3000, 4000, 9229 | Hot reload, debugging, bind mounts |
| **Production** | Production deployment | 80, 443 | Nginx proxy, SSL, optimized builds |
| **Cloudflare** | Public tunnel access | None (tunnel) | Secure access, no port exposure |
| **Monitoring** | Observability stack | 3002, 9091, 9093 | Prometheus, Grafana, AlertManager |
| **Infrastructure** | Supporting services | 27017, 6379, 3001 | MongoDB, Redis, basic monitoring |

---

## 🔧 Development Environment

Perfect for local development with hot reload and debugging capabilities.

### Prerequisites for Development

```bash
# Clone the repository
git clone <your-repo-url>
cd codiesvibe

# Ensure you have your MongoDB connection string ready
# Example: mongodb://username:password@your-mongodb-host:27017/codiesvibe
```

### Start Infrastructure Services

```bash
# Start supporting services (MongoDB, Redis, monitoring)
docker-compose -f docker-compose.infra.yml up -d

# Verify infrastructure is running
docker-compose -f docker-compose.infra.yml ps
```

### Environment Configuration

Create your development environment file:

```bash
# Copy example environment file
cp backend/.env.example backend/.env

# Edit with your specific settings
nano backend/.env
```

Required environment variables:
```env
# Database
MONGODB_URI=mongodb://admin:password123@mongodb:27017/codiesvibe?authSource=admin

# Application
PORT=4000
NODE_ENV=development
JWT_SECRET=your-dev-jwt-secret
CORS_ORIGIN=http://localhost:3000

# Optional: Redis cache
REDIS_URL=redis://:redis123@redis:6379
```

### Start Development Environment

```bash
# Start development environment with hot reload
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Access your application
open http://localhost:3000
```

### Development Features

- ✅ **Hot Reload**: Frontend and backend auto-reload on file changes
- ✅ **Debugging**: Backend debugging available on port 9229
- ✅ **Live Logs**: Real-time application logs via `docker-compose logs -f`
- ✅ **Volume Mounts**: Direct file editing without rebuilding containers

### Development Commands

```bash
# View running services
docker-compose -f docker-compose.dev.yml ps

# Stop development environment
docker-compose -f docker-compose.dev.yml down

# Rebuild containers after dependency changes
docker-compose -f docker-compose.dev.yml up -d --build

# Access container shell for debugging
docker exec -it codiesvibe-backend-dev sh
```

---

## 🚀 Production Environment

Production-ready deployment with Nginx reverse proxy, SSL termination, and optimized performance.

### Prerequisites for Production

```bash
# Ensure infrastructure is running
docker-compose -f docker-compose.infra.yml up -d

# Verify external MongoDB connectivity
docker run --rm --network codiesvibe-network mongo:7 mongosh "your-mongodb-connection-string" --eval "db.adminCommand('ping')"
```

### Production Environment Configuration

Create production environment file:

```bash
# Create production environment
cp backend/.env.example backend/.env.production

# Edit with production settings
nano backend/.env.production
```

Production environment variables:
```env
# Database (your external MongoDB)
MONGODB_URI=mongodb://username:password@your-mongodb-host:27017/codiesvibe?authSource=admin

# Production configuration
PORT=4000
NODE_ENV=production
JWT_SECRET=your-super-secure-jwt-secret-minimum-32-characters
COOKIE_SECRET=your-super-secure-cookie-secret-minimum-32-characters
CSRF_SECRET=your-super-secure-csrf-secret-minimum-32-characters

# Security
CORS_ORIGIN=https://your-domain.com
TRUST_PROXY=true
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# Optional: External services
REDIS_URL=redis://username:password@your-redis-host:6379
```

### Deploy to Production

```bash
# Pull latest images (if using pre-built)
docker-compose -f docker-compose.production.yml pull

# Start production deployment
docker-compose -f docker-compose.production.yml up -d

# Check deployment health
docker-compose -f docker-compose.production.yml ps
curl -f http://localhost/health
curl -f http://localhost/api/health
```

### Production Features

- ✅ **Nginx Reverse Proxy**: High-performance static file serving
- ✅ **SSL Ready**: HTTPS configuration with security headers
- ✅ **Health Checks**: Automatic container health monitoring
- ✅ **Resource Limits**: Memory and CPU constraints for stability
- ✅ **Security Hardening**: Non-root users, read-only filesystems
- ✅ **Optimized Images**: Multi-stage builds for minimal image size

### Production Monitoring

```bash
# View production logs
docker-compose -f docker-compose.production.yml logs -f

# Monitor resource usage
docker stats

# Check health status
docker-compose -f docker-compose.production.yml ps
```

---

## ☁️ Cloudflare Environment

Secure public deployment using Cloudflare Tunnels with no exposed ports.

### Prerequisites for Cloudflare

1. **Cloudflare Account** with domain configured
2. **Cloudflare Tunnel** created and configured
3. **Tunnel Token** from Cloudflare dashboard

### Create Cloudflare Tunnel

#### Option 1: Cloudflare Dashboard
1. Go to **Cloudflare Dashboard** → **Zero Trust** → **Networks** → **Tunnels**
2. Click **Create a tunnel**
3. Name it `codiesvibe`
4. Copy the **tunnel token**

#### Option 2: Cloudflare CLI
```bash
# Install cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb

# Authenticate
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create codiesvibe

# Get tunnel token
cloudflared tunnel token <tunnel-id>
```

### Cloudflare Environment Configuration

Create Cloudflare-specific environment:

```bash
# Create Cloudflare environment file
cp backend/.env.example .env.cloudflare

# Edit with your settings
nano .env.cloudflare
```

Required Cloudflare variables:
```env
# REQUIRED: Cloudflare Tunnel Token
CLOUDFLARE_TUNNEL_TOKEN=your-tunnel-token-here

# REQUIRED: Domain Configuration
CORS_ORIGIN=https://your-domain.com
GITHUB_CALLBACK_URL=https://your-domain.com/api/auth/github/callback

# REQUIRED: GitHub OAuth (configure with your domain)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# REQUIRED: Production Secrets
JWT_SECRET=your-secure-jwt-secret-32-chars-minimum
COOKIE_SECRET=your-secure-cookie-secret-32-chars-minimum
CSRF_SECRET=your-secure-csrf-secret-32-chars-minimum

# Database (your external MongoDB)
MONGODB_URI=mongodb://username:password@your-mongodb-host:27017/codiesvibe?authSource=admin

# Optional: Cloudflare API
CLOUDFLARE_ZONE_ID=your-zone-id
CLOUDFLARE_API_TOKEN=your-api-token
```

### Deploy with Cloudflare

```bash
# Start infrastructure
docker-compose -f docker-compose.infra.yml up -d

# Deploy with Cloudflare tunnel
docker-compose -f docker-compose.cloudflare.yml --env-file .env.cloudflare up -d

# Check deployment status
docker-compose -f docker-compose.cloudflare.yml ps
```

### Configure Cloudflare DNS

1. Go to **Cloudflare Dashboard** → **DNS** → **Records**
2. Add CNAME record:
   - **Name**: `@` (or your subdomain)
   - **Target**: `<tunnel-id>.cfargotunnel.com`
   - **Proxy status**: ✅ Proxied

### Cloudflare Features

- ✅ **Zero Port Exposure**: All traffic through secure tunnels
- ✅ **Global Edge Network**: Automatic performance optimization
- ✅ **DDoS Protection**: Built-in security features
- ✅ **SSL/TLS**: Automatic certificate management
- ✅ **Enhanced Security**: Reduced attack surface

For detailed Cloudflare setup instructions, see: [docs/CLOUDFLARE-SETUP.md](docs/CLOUDFLARE-SETUP.md)

---

## 📊 Monitoring Environment

Comprehensive observability with Prometheus, Grafana, and log aggregation.

### Start Monitoring Stack

```bash
# Start infrastructure (required)
docker-compose -f docker-compose.infra.yml up -d

# Start extended monitoring
docker-compose -f docker-compose.monitoring.yml up -d

# Check monitoring services
docker-compose -f docker-compose.monitoring.yml ps
```

### Access Monitoring Services

| Service | URL | Purpose |
|---------|-----|---------|
| **Grafana Extended** | http://localhost:3002 | Application dashboards |
| **Prometheus Extended** | http://localhost:9091 | Extended metrics collection |
| **AlertManager** | http://localhost:9093 | Alert management |
| **Basic Grafana** | http://localhost:3001 | Infrastructure dashboards |

### Default Credentials

- **Grafana**: `admin` / `codiesvibe-admin-123`
- **AlertManager**: No authentication by default

### Monitoring Features

- ✅ **Application Metrics**: Custom business metrics and performance data
- ✅ **Infrastructure Metrics**: System resources, container stats
- ✅ **Log Aggregation**: Centralized logging with Loki
- ✅ **Alerting**: Automated notifications via email/Slack
- ✅ **Custom Dashboards**: Pre-configured application dashboards

---

## 🏗️ Infrastructure Stack

Supporting services for all environments.

### Start Infrastructure

```bash
# Start all infrastructure services
docker-compose -f docker-compose.infra.yml up -d

# Check service health
docker-compose -f docker-compose.infra.yml ps
```

### Infrastructure Services

| Service | Port | Purpose | Admin UI |
|---------|------|---------|----------|
| **MongoDB** | 27017 | Primary database | http://localhost:8081 |
| **Redis** | 6379 | Caching layer | - |
| **Prometheus** | 9090 | Metrics collection | http://localhost:9090 |
| **Grafana** | 3001 | Basic dashboards | http://localhost:3001 |
| **Loki** | 3100 | Log aggregation | - |
| **MailHog** | 1025/8025 | Email testing | http://localhost:8025 |

### Infrastructure Features

- ✅ **Single Command Setup**: All services with one command
- ✅ **Data Persistence**: Volumes for databases and configurations
- ✅ **Health Checks**: Automatic service health monitoring
- ✅ **Network Isolation**: Dedicated network for service communication

For detailed infrastructure setup: [README-infra.md](README-infra.md)

---

## 🔄 CI/CD Pipeline

Automated build, test, and deployment pipeline using GitHub Actions.

### GitHub Actions Workflow

The pipeline includes:

1. **Test Stage**: Lint, type-check, unit tests, security scanning
2. **Build Stage**: Multi-platform Docker images pushed to GHCR
3. **Deploy Stage**: Automated deployment to staging and production

### Required Secrets

Configure these secrets in your GitHub repository:

```bash
# SSH Access
SSH_PRIVATE_KEY_STAGING=your-staging-ssh-key
SSH_USER_STAGING=your-staging-username
SSH_HOST_STAGING=your-staging-host

SSH_PRIVATE_KEY_PRODUCTION=your-production-ssh-key
SSH_USER_PRODUCTION=your-production-username
SSH_HOST_PRODUCTION=your-production-host

# Notifications (optional)
SLACK_WEBHOOK_URL=your-slack-webhook-url
```

### Manual Deployment

Trigger deployment manually:

```bash
# Go to GitHub Actions tab
# Select "Deploy CodiesVibe" workflow
# Click "Run workflow"
# Choose environment: staging or production
```

### Using Pre-built Images

Use GitHub Container Registry images:

```bash
# Pull latest images
docker pull ghcr.io/your-username/codiesvibe-frontend:latest
docker pull ghcr.io/your-username/codiesvibe-backend:latest

# Update docker-compose to use images instead of build
```

---

## 🔧 Configuration Management

### Environment Variables

Each environment requires specific configuration:

| Variable | Development | Production | Cloudflare | Description |
|----------|-------------|------------|------------|-------------|
| `NODE_ENV` | development | production | production | Runtime environment |
| `PORT` | 4000 | 4000 | 4000 | Backend port |
| `MONGODB_URI` | infra mongodb | external | external | Database connection |
| `CORS_ORIGIN` | localhost:3000 | your-domain | cf-domain | Frontend origin |
| `JWT_SECRET` | dev-secret | secure-32+ | secure-32+ | Authentication secret |

### MongoDB Connection Examples

```bash
# Local infrastructure MongoDB
MONGODB_URI=mongodb://admin:password123@mongodb:27017/codiesvibe?authSource=admin

# External MongoDB Atlas
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/codiesvibe?retryWrites=true&w=majority

# Self-hosted MongoDB
MONGODB_URI=mongodb://username:password@your-host:27017/codiesvibe?authSource=admin
```

### Secrets Management

- **Development**: Use `.env` files (not committed)
- **Production**: Use environment variables or Docker secrets
- **CI/CD**: Use GitHub repository secrets

---

## 🚨 Troubleshooting

### Common Issues

#### 1. MongoDB Connection Failed
```bash
# Check if MongoDB is accessible
docker run --rm --network codiesvibe-network mongo:7 mongosh "your-connection-string" --eval "db.adminCommand('ping')"

# Verify network connectivity
docker exec -it codiesvibe-backend-dev ping mongodb
```

#### 2. Port Conflicts
```bash
# Check what's using the port
sudo lsof -i :3000
sudo lsof -i :4000

# Stop conflicting services or use different ports
```

#### 3. Container Health Check Failures
```bash
# Check container logs
docker-compose logs backend

# Test health endpoint manually
docker exec -it codiesvibe-backend-dev curl http://localhost:4000/health
```

#### 4. Frontend Build Issues
```bash
# Clear Docker build cache
docker builder prune

# Rebuild without cache
docker-compose build --no-cache frontend
```

### Health Check Commands

```bash
# Check all services
docker-compose ps

# Test specific endpoints
curl -f http://localhost:3000/health  # Frontend
curl -f http://localhost:4000/health  # Backend

# Check database connectivity
docker exec -it codiesvibe-backend-dev npm run db:ping
```

### Log Analysis

```bash
# View all logs
docker-compose logs

# Follow specific service logs
docker-compose logs -f backend

# View last 50 lines
docker-compose logs --tail=50
```

---

## 📚 Additional Documentation

- **[Infrastructure Setup](README-infra.md)** - Detailed infrastructure guide
- **[Cloudflare Setup](docs/CLOUDFLARE-SETUP.md)** - Complete Cloudflare configuration
- **[Network Strategy](docs/NETWORK-STRATEGY.md)** - Docker networking details
- **[Port Allocation](docs/PORT-ALLOCATION.md)** - Port management strategy
- **[Security Guide](docs/SECURITY.md)** - Security best practices

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Use development environment for testing
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

- **Issues**: [GitHub Issues](https://github.com/your-username/codiesvibe/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/codiesvibe/discussions)
- **Documentation**: Check the `docs/` directory for detailed guides

---

**Made with ❤️ for the AI tools community**