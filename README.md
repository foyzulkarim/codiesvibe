# CodiesVibe - AI Tools Directory

A production-grade AI tools directory built with TypeScript, React, and NestJS, featuring comprehensive Docker containerization, automated CI/CD pipelines, and multi-environment deployment strategies.

## 🌟 Features

- **🚀 Modern Stack**: React + Vite frontend, NestJS backend, MongoDB database
- **🐳 Complete Containerization**: Development, production, and infrastructure environments
- **☁️ Multi-Deployment**: Local, staging, production, and Cloudflare tunnel options
- **📊 Full Observability**: Prometheus, Grafana, Loki monitoring stack
- **🔄 Advanced CI/CD**: Separate workflows for frontend/backend with comprehensive testing
- **🔒 Security First**: Vulnerability scanning, security headers, non-root containers
- **⚡ Performance Optimized**: Multi-stage builds, caching, CDN integration

## 🏗️ Architecture Overview

```mermaid
graph TB
    subgraph "Frontend Layer"
        FE[React + Vite App]
        NGINX[Nginx Reverse Proxy]
        FE --> NGINX
    end
    
    subgraph "Backend Layer"
        API[NestJS API Server]
        REDIS[(Redis Cache)]
        API --> REDIS
    end
    
    subgraph "Data Layer"
        DB[(External MongoDB)]
        API --> DB
    end
    
    subgraph "Infrastructure"
        PROM[Prometheus]
        GRAF[Grafana]
        LOKI[Loki]
        MAIL[MailHog]
    end
    
    subgraph "External Services"
        GHCR[GitHub Container Registry]
        CF[Cloudflare Tunnels]
    end
    
    NGINX --> API
    PROM --> API
    PROM --> FE
    GRAF --> PROM
    LOKI --> API
    CF --> NGINX
```

## 🚀 Quick Start Guide

### 1. Prerequisites

```bash
# Required software
- Docker (v20.10+) & Docker Compose (v2.0+)
- Git
- External MongoDB instance (local infra or cloud)

# Optional for advanced features
- Cloudflare account (for tunnel deployment)
- GitHub account (for CI/CD)
```

### 2. Clone and Setup

```bash
# Clone repository
git clone https://github.com/your-username/codiesvibe.git
cd codiesvibe

# Start infrastructure services
docker-compose -f docker-compose.infra.yml up -d

# Verify infrastructure health
docker-compose -f docker-compose.infra.yml ps
```

### 3. Choose Your Environment

| Environment | Command | Use Case |
|-------------|---------|----------|
| **Development** | `npm run infra:start` + local dev servers | Local development with native hot reload |
| **Production** | `docker-compose -f docker-compose.production.yml up -d` | Production deployment with Nginx |
| **Cloudflare** | See `TUNNEL-SETUP.md` | Secure public access via local tunnel |
| **Monitoring** | `docker-compose -f docker-compose.monitoring.yml up -d` | Extended observability stack |

---

## 🐳 Container Environments

### 📁 Available Docker Compose Files

| File | Purpose | Target | Ports |
|------|---------|---------|-------|
| `docker-compose.infra.yml` | Infrastructure services | All environments | 27017, 6379, 9090, 3001 |
| `docker-compose.production.yml` | Production deployment | Production servers | 80, 443 |
| Local cloudflared tunnel | Simple tunnel setup | Public deployment | None (tunneled) |
| `docker-compose.monitoring.yml` | Extended monitoring | Ops teams | 3002, 9091, 9093 |

### 🎯 Infrastructure First Approach

Always start with infrastructure services:

```bash
# Start supporting services first
npm run infra:start

# Then start local development
npm run dev                    # Frontend
cd backend && npm run dev      # Backend (in separate terminal)
```

---

## 🔧 Development Environment

Fast local development with native hot reload, instant debugging, and maximum visibility into your code changes.

### Development Setup

```bash
# 1. Start infrastructure services
npm run infra:start

# 2. Configure backend environment
cp backend/.env.example backend/.env
# Edit backend/.env with your settings

# 3. Install dependencies
npm install                    # Frontend dependencies
cd backend && npm install     # Backend dependencies

# 4. Start development servers (separate terminals)
npm run dev                   # Frontend (Vite dev server)
cd backend && npm run dev     # Backend (NestJS with hot reload)

# 5. Access your application
open http://localhost:3000    # Frontend
open http://localhost:4000/api/health  # Backend health check
```

### Development Environment Variables

```env
# backend/.env
NODE_ENV=development
PORT=4000
MONGODB_URI=mongodb://admin:password123@mongodb:27017/codiesvibe?authSource=admin
REDIS_URL=redis://:redis123@redis:6379
JWT_SECRET=dev-jwt-secret-change-in-production
CORS_ORIGIN=http://localhost:3000

# Optional debugging
DEBUG=*
LOG_LEVEL=debug
```

### Development Features

- ✅ **Lightning Fast Hot Reload**: Native Vite HMR and NestJS watch mode
- ✅ **Direct Debugging**: Full access to Node.js debugger and browser dev tools
- ✅ **Instant Feedback**: See changes immediately without container rebuilds
- ✅ **Full Visibility**: Direct access to processes, logs, and error messages
- ✅ **Native Performance**: No Docker overhead during development

### Development Commands

```bash
# Infrastructure management
npm run infra:start           # Start MongoDB, Redis, monitoring
npm run infra:stop            # Stop infrastructure services
npm run infra:status          # Check infrastructure status
npm run infra:logs            # View infrastructure logs

# Development workflow
npm run dev                   # Start frontend (root directory)
cd backend && npm run dev     # Start backend with hot reload
cd backend && npm run start:debug  # Start backend with debugging

# Code quality
npm run lint                  # Frontend linting
npm run typecheck            # Frontend type checking
cd backend && npm run lint    # Backend linting
cd backend && npm run test    # Backend tests

# Database management
cd backend && npm run seed    # Seed database with sample data
```

---

## 🚀 Production Environment

Production-ready deployment with Nginx reverse proxy, SSL/TLS, and optimized performance.

### Production Prerequisites

```bash
# External MongoDB connection required
# Example connections:
# - MongoDB Atlas: mongodb+srv://user:pass@cluster.mongodb.net/db
# - Self-hosted: mongodb://user:pass@host:27017/db
# - Docker: mongodb://user:pass@mongodb-host:27017/db

# Test MongoDB connectivity
docker run --rm mongo:7 mongosh "your-mongodb-uri" --eval "db.adminCommand('ping')"
```

### Production Setup

```bash
# 1. Start infrastructure
docker-compose -f docker-compose.infra.yml up -d

# 2. Configure production environment
cp backend/.env.example backend/.env.production
# Edit with production settings (see below)

# 3. Deploy production environment
docker-compose -f docker-compose.production.yml up -d

# 4. Verify deployment
curl -f http://localhost/health
curl -f http://localhost/api/health
```

### Production Environment Variables

```env
# backend/.env.production
NODE_ENV=production
PORT=4000

# REQUIRED: External MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/codiesvibe?retryWrites=true&w=majority

# REQUIRED: Security secrets (32+ characters each)
JWT_SECRET=your-super-secure-jwt-secret-minimum-32-characters-long
COOKIE_SECRET=your-super-secure-cookie-secret-minimum-32-characters
CSRF_SECRET=your-super-secure-csrf-secret-minimum-32-characters

# REQUIRED: Production domain
CORS_ORIGIN=https://your-domain.com
TRUST_PROXY=true

# Security and rate limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
HELMET_CSP=true

# Optional: External Redis
REDIS_URL=redis://username:password@redis-host:6379

# Optional: Monitoring
PROMETHEUS_ENABLED=true
HEALTH_CHECK_ENABLED=true
```

### Production Features

- ✅ **Nginx Reverse Proxy**: High-performance static file serving and load balancing
- ✅ **SSL/TLS Ready**: HTTPS configuration with security headers
- ✅ **Health Monitoring**: Automatic container health checks and recovery
- ✅ **Resource Limits**: Memory and CPU constraints for stability
- ✅ **Security Hardening**: Non-root users, read-only filesystems, minimal attack surface
- ✅ **Optimized Images**: Multi-stage builds for minimal production footprint
- ✅ **Graceful Shutdown**: Proper signal handling and connection draining

### Production Monitoring

```bash
# Check deployment status
docker-compose -f docker-compose.production.yml ps

# Monitor logs
docker-compose -f docker-compose.production.yml logs -f

# Resource usage
docker stats

# Health endpoints
curl http://localhost/health        # Frontend health
curl http://localhost/api/health    # Backend health
curl http://localhost/api/metrics   # Prometheus metrics

# Database connectivity
docker exec codiesvibe-backend npm run db:ping
```

---

## ☁️ Cloudflare Environment

Secure public deployment using Cloudflare Tunnels with zero port exposure and global edge network.

### Cloudflare Prerequisites

1. **Cloudflare Account** with domain configured
2. **Cloudflare Tunnel** created
3. **Tunnel Token** obtained

### Create Cloudflare Tunnel

#### Option 1: Cloudflare Dashboard
```bash
1. Login to Cloudflare Dashboard
2. Go to Zero Trust > Networks > Tunnels
3. Click "Create a tunnel"
4. Name: "codiesvibe"
5. Copy the tunnel token
```

#### Option 2: CLI Method
```bash
# Install cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared
sudo mv cloudflared /usr/local/bin/

# Authenticate with Cloudflare
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create codiesvibe

# Get tunnel token
cloudflared tunnel token <tunnel-id>
```

### Cloudflare Configuration

```bash
# 1. Create Cloudflare environment file
cp backend/.env.example .env.cloudflare

# 2. Configure Cloudflare settings
nano .env.cloudflare
```

### Cloudflare Environment Variables

```env
# .env.cloudflare

# REQUIRED: Cloudflare tunnel token
CLOUDFLARE_TUNNEL_TOKEN=your-cloudflare-tunnel-token-here

# REQUIRED: Production domain configuration
CORS_ORIGIN=https://your-domain.com
NODE_ENV=production
PORT=4000

# REQUIRED: External MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/codiesvibe?retryWrites=true&w=majority

# REQUIRED: Security secrets
JWT_SECRET=your-super-secure-jwt-secret-minimum-32-characters
COOKIE_SECRET=your-super-secure-cookie-secret-minimum-32-characters
CSRF_SECRET=your-super-secure-csrf-secret-minimum-32-characters

# REQUIRED: GitHub OAuth (configure with your domain)
GITHUB_CLIENT_ID=your-github-oauth-client-id
GITHUB_CLIENT_SECRET=your-github-oauth-client-secret
GITHUB_CALLBACK_URL=https://your-domain.com/api/auth/github/callback

# Optional: Enhanced Cloudflare features
CLOUDFLARE_ZONE_ID=your-cloudflare-zone-id
CLOUDFLARE_API_TOKEN=your-cloudflare-api-token

# Security enhancements
TRUST_PROXY=true
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=200
```

### Deploy with Cloudflare

```bash
# 1. Start infrastructure
docker-compose -f docker-compose.infra.yml up -d

# 2. Start production stack
docker-compose -f docker-compose.production.yml up -d

# 3. Start Cloudflare tunnel (see TUNNEL-SETUP.md for details)
cloudflared tunnel run

# 4. Verify deployment
curl https://your-domain.com/health
curl https://api.your-domain.com/api/tools
```

### Configure Cloudflare DNS

```bash
1. Go to Cloudflare Dashboard > DNS > Records
2. Add CNAME record:
   - Name: @ (or subdomain)
   - Target: <tunnel-id>.cfargotunnel.com
   - Proxy status: Proxied (orange cloud)
3. Save record
```

### Cloudflare Features

- ✅ **Zero Port Exposure**: All traffic routed through secure tunnels
- ✅ **Global Edge Network**: Automatic performance optimization and caching
- ✅ **DDoS Protection**: Enterprise-grade security included
- ✅ **SSL/TLS Management**: Automatic certificate provisioning and renewal
- ✅ **Enhanced Security**: WAF, bot protection, and threat intelligence
- ✅ **Analytics**: Detailed traffic and performance insights

📖 **For complete tunnel setup instructions, see [`TUNNEL-SETUP.md`](TUNNEL-SETUP.md)**

---

## 📊 Monitoring Environment

Comprehensive observability stack with Prometheus, Grafana, Loki, and AlertManager.

### Start Monitoring Stack

```bash
# 1. Start infrastructure
docker-compose -f docker-compose.infra.yml up -d

# 2. Start extended monitoring
docker-compose -f docker-compose.monitoring.yml up -d

# 3. Verify monitoring services
docker-compose -f docker-compose.monitoring.yml ps
```

### Monitoring Services

| Service | URL | Credentials | Purpose |
|---------|-----|-------------|---------|
| **Grafana Extended** | http://localhost:3002 | admin / codiesvibe-admin-123 | Application dashboards |
| **Prometheus Extended** | http://localhost:9091 | - | Advanced metrics collection |
| **AlertManager** | http://localhost:9093 | - | Alert management and routing |
| **Basic Grafana** | http://localhost:3001 | admin / codiesvibe-admin-123 | Infrastructure monitoring |
| **Basic Prometheus** | http://localhost:9090 | - | Basic metrics collection |

### Pre-configured Dashboards

- **Application Overview**: Request rates, response times, error rates
- **Infrastructure Metrics**: CPU, memory, disk, network usage
- **Database Performance**: MongoDB operations, connection pools
- **Container Health**: Docker container metrics and logs
- **Security Monitoring**: Failed authentication attempts, suspicious activities

### Custom Metrics

The application exposes custom metrics for monitoring:

```bash
# View available metrics
curl http://localhost:4000/api/metrics

# Key metrics include:
# - http_requests_total: Total HTTP requests
# - http_request_duration_seconds: Request duration histogram
# - database_operations_total: Database operation counters
# - active_users_total: Current active user count
# - search_queries_total: Search operation metrics
```

### Alerting Configuration

Configure alerts in AlertManager for:

- High error rates (>5% for 5 minutes)
- Slow response times (>2s average for 10 minutes)
- Database connection failures
- Container health check failures
- High memory/CPU usage (>80% for 15 minutes)

---

## 🔄 CI/CD Pipeline

Advanced GitHub Actions workflows with separate frontend/backend pipelines and comprehensive testing.

### Workflow Architecture

```mermaid
graph TB
    subgraph "Frontend Pipeline"
        FE_TEST[Frontend Tests]
        FE_BUILD[Build Frontend Image]
        FE_PERF[Performance Tests]
        FE_TEST --> FE_BUILD
        FE_BUILD --> FE_PERF
    end
    
    subgraph "Backend Pipeline"
        BE_TEST[Backend Tests]
        BE_BUILD[Build Backend Image]
        BE_API[API Tests]
        BE_TEST --> BE_BUILD
        BE_BUILD --> BE_API
    end
    
    subgraph "Deployment Pipeline"
        DEPLOY[Deployment Workflow]
        STAGING[Staging Deployment]
        PROD[Production Deployment]
        FE_PERF --> DEPLOY
        BE_API --> DEPLOY
        DEPLOY --> STAGING
        STAGING --> PROD
    end
    
    subgraph "Monitoring Pipeline"
        MONITOR[Health Monitoring]
        DEPS[Dependency Updates]
        SECURITY[Security Scans]
    end
```

### GitHub Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `frontend-ci-cd.yml` | Frontend file changes | Frontend testing, building, performance analysis |
| `backend-ci-cd.yml` | Backend file changes | Backend testing, API testing, security scanning |
| `deployment.yml` | Manual dispatch | Environment-specific deployments |
| `monitoring.yml` | Schedule (15min) | Continuous health monitoring |
| `dependency-updates.yml` | Schedule (weekly) | Automated dependency updates |

### Required GitHub Secrets

Configure these in your GitHub repository settings:

```bash
# SSH Access for Deployments
SSH_PRIVATE_KEY_STAGING=your-staging-server-ssh-private-key
SSH_USER_STAGING=deployment-user
SSH_HOST_STAGING=staging.yourserver.com

SSH_PRIVATE_KEY_PRODUCTION=your-production-server-ssh-private-key  
SSH_USER_PRODUCTION=deployment-user
SSH_HOST_PRODUCTION=prod.yourserver.com

# Notifications (optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/your-webhook-url

# Container Registry (automatic with GITHUB_TOKEN)
GITHUB_TOKEN=automatically-provided
```

### CI/CD Features

#### Frontend Pipeline
- ✅ ESLint and TypeScript checking
- ✅ Unit tests with Jest and React Testing Library
- ✅ Lighthouse performance audits
- ✅ Bundle size analysis
- ✅ Security vulnerability scanning
- ✅ Multi-platform Docker builds (AMD64/ARM64)

#### Backend Pipeline
- ✅ ESLint and TypeScript checking
- ✅ Unit and integration tests with MongoDB/Redis
- ✅ API load testing with Artillery
- ✅ Database performance testing
- ✅ Security scanning with Trivy
- ✅ SBOM generation for compliance

#### Deployment Features
- ✅ Blue-green deployment strategy
- ✅ Automatic rollback on failure
- ✅ Health check validation
- ✅ Zero-downtime deployments
- ✅ Environment-specific configurations

### Manual Deployment

```bash
# 1. Go to GitHub repository
# 2. Click "Actions" tab
# 3. Select "Deployment" workflow
# 4. Click "Run workflow"
# 5. Choose:
#    - Service: frontend, backend, or both
#    - Environment: staging or production
#    - Image(s): specific image tags (if needed)
```

### Using Pre-built Images

```bash
# Pull latest images from GHCR
docker pull ghcr.io/your-username/codiesvibe-frontend:latest
docker pull ghcr.io/your-username/codiesvibe-backend:latest

# Use specific versions
docker pull ghcr.io/your-username/codiesvibe-frontend:v1.0.0
docker pull ghcr.io/your-username/codiesvibe-backend:main-abc1234
```

---

## ⚙️ Configuration Management

### Environment Variable Reference

| Variable | Development | Production | Cloudflare | Required | Description |
|----------|-------------|------------|------------|----------|-------------|
| `NODE_ENV` | development | production | production | ✅ | Runtime environment |
| `PORT` | 4000 | 4000 | 4000 | ✅ | Backend server port |
| `MONGODB_URI` | infra mongodb | external | external | ✅ | Database connection string |
| `CORS_ORIGIN` | localhost:3000 | https://domain.com | https://domain.com | ✅ | Frontend origin URL |
| `JWT_SECRET` | dev-secret | 32+ chars | 32+ chars | ✅ | JWT signing secret |
| `COOKIE_SECRET` | dev-secret | 32+ chars | 32+ chars | ✅ | Cookie encryption secret |
| `CSRF_SECRET` | dev-secret | 32+ chars | 32+ chars | ✅ | CSRF token secret |
| `REDIS_URL` | infra redis | external | external | ⚪ | Redis cache connection |
| `CLOUDFLARE_TUNNEL_TOKEN` | - | - | tunnel-token | ⚪ | Cloudflare tunnel authentication |
| `GITHUB_CLIENT_ID` | dev-app | prod-app | prod-app | ⚪ | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | dev-secret | prod-secret | prod-secret | ⚪ | GitHub OAuth client secret |

### MongoDB Connection Examples

```bash
# Infrastructure MongoDB (development)
MONGODB_URI=mongodb://admin:password123@mongodb:27017/codiesvibe?authSource=admin

# MongoDB Atlas (production)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/codiesvibe?retryWrites=true&w=majority

# Self-hosted MongoDB (production)
MONGODB_URI=mongodb://username:password@mongodb.yourhost.com:27017/codiesvibe?authSource=admin

# MongoDB with SSL
MONGODB_URI=mongodb://username:password@mongodb.yourhost.com:27017/codiesvibe?authSource=admin&ssl=true
```

### Security Best Practices

```bash
# Generate secure secrets (32+ characters)
openssl rand -base64 32

# Example secure environment variables
JWT_SECRET=aB3dE5fG7hI9jK1lM3nO5pQ7rS9tU1vW3xY5zA7bC9dE
COOKIE_SECRET=1xY3zA5bC7dE9fG1hI3jK5lM7nO9pQ1rS3tU5vW7xY9z
CSRF_SECRET=9pQ1rS3tU5vW7xY9zA1bC3dE5fG7hI9jK1lM3nO5pQ7r

# Never commit secrets to version control
echo "*.env*" >> .gitignore
echo ".env" >> .gitignore
```

### Environment File Templates

```bash
# Copy and customize environment templates
cp backend/.env.example backend/.env                # Development
cp backend/.env.example backend/.env.production     # Production
# For Cloudflare tunnel setup, see TUNNEL-SETUP.md

### Cloudflare Tunnel Credentials

**Security Note**: Cloudflare tunnel credentials should be stored securely in the cloudflared configuration directory (`~/.cloudflared/`) rather than in your project files. Never commit tunnel credentials to version control.

For detailed tunnel setup instructions, refer to [TUNNEL-SETUP.md](TUNNEL-SETUP.md).
```

---

## 🚨 Troubleshooting Guide

### Common Issues and Solutions

#### 1. MongoDB Connection Issues

```bash
# Test MongoDB connectivity
docker run --rm --network codiesvibe-network mongo:7 \
  mongosh "your-mongodb-uri" --eval "db.adminCommand('ping')"

# Check network connectivity from container
docker exec -it codiesvibe-backend-dev ping mongodb

# Verify environment variables
docker exec -it codiesvibe-backend-dev env | grep MONGODB

# Common fixes:
# - Ensure MongoDB URI includes authentication database (?authSource=admin)
# - Check firewall rules for external MongoDB
# - Verify MongoDB user permissions
# - Check network connectivity and DNS resolution
```

#### 2. Port Conflicts

```bash
# Find what's using conflicting ports
sudo lsof -i :3000  # Frontend port
sudo lsof -i :4000  # Backend port
sudo lsof -i :27017 # MongoDB port

# Stop conflicting services
sudo systemctl stop nginx     # If nginx is running on port 80
sudo service postgresql stop  # If PostgreSQL conflicts with ports

# Use alternative ports (modify docker-compose files)
# Development override example:
cat > docker-compose.override.yml << EOF
version: '3.8'
services:
  frontend:
    ports:
      - "3010:80"
  backend:
    ports:
      - "4010:4000"
EOF
```

#### 3. Container Health Check Failures

```bash
# Check container status
docker-compose ps

# View container logs
docker-compose logs backend
docker-compose logs frontend

# Test health endpoints manually
docker exec -it codiesvibe-backend-dev curl http://localhost:4000/health
docker exec -it codiesvibe-frontend-dev curl http://localhost:80/health

# Check resource usage
docker stats

# Common fixes:
# - Increase container memory limits
# - Check database connectivity
# - Verify environment variables
# - Review application logs for errors
```

#### 4. Frontend Build Failures

```bash
# Clear Docker build cache
docker builder prune -a

# Rebuild without cache
docker-compose build --no-cache frontend

# Check build context
docker-compose config

# Debug build process
docker build --progress=plain -f Dockerfile.frontend .

# Common fixes:
# - Clear npm cache in Dockerfile
# - Update Node.js version
# - Check for sufficient disk space
# - Verify package.json and package-lock.json
```

#### 5. Performance Issues

```bash
# Monitor resource usage
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"

# Check application metrics
curl http://localhost:4000/api/metrics

# Database performance
docker exec -it codiesvibe-backend-dev npm run db:stats

# Network latency
docker exec -it codiesvibe-backend-dev ping mongodb
docker exec -it codiesvibe-frontend-dev ping backend

# Common fixes:
# - Increase container resource limits
# - Optimize database queries
# - Enable Redis caching
# - Configure CDN for static assets
```

### Health Check Commands

```bash
# Comprehensive health check script
cat > health-check.sh << 'EOF'
#!/bin/bash
echo "=== CodiesVibe Health Check ==="

# Infrastructure services
echo "Checking infrastructure..."
docker-compose -f docker-compose.infra.yml ps

# Application services
echo "Checking application..."
docker-compose ps

# Health endpoints
echo "Testing health endpoints..."
curl -f http://localhost:3000/health && echo "✅ Frontend OK" || echo "❌ Frontend Failed"
curl -f http://localhost:4000/health && echo "✅ Backend OK" || echo "❌ Backend Failed"

# Database connectivity
echo "Testing database..."
docker exec codiesvibe-backend npm run db:ping && echo "✅ Database OK" || echo "❌ Database Failed"

# Memory usage
echo "Resource usage:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

echo "=== Health Check Complete ==="
EOF

chmod +x health-check.sh
./health-check.sh
```

### Log Analysis

```bash
# View all logs with timestamps
docker-compose logs -t

# Follow specific service logs
docker-compose logs -f backend | grep ERROR
docker-compose logs -f frontend | grep WARN

# Export logs for analysis
docker-compose logs --since 1h > app-logs-$(date +%Y%m%d_%H%M%S).log

# Search logs for specific patterns
docker-compose logs | grep -i "error\|exception\|failed"

# Monitor logs in real-time with filters
docker-compose logs -f | grep -v "GET /health"
```

---

## 📚 Additional Resources

### Documentation Structure

```
docs/
├── CLOUDFLARE-SETUP.md     # Detailed Cloudflare configuration
├── NETWORK-STRATEGY.md     # Docker networking details  
├── PORT-ALLOCATION.md      # Port management strategy
├── SECURITY.md            # Security best practices
├── PERFORMANCE.md         # Performance optimization
├── MONITORING.md          # Observability setup
└── DEPLOYMENT.md          # Advanced deployment strategies
```

### Quick Reference Commands

```bash
# Infrastructure management
npm run infra:start                                   # Start infrastructure
npm run infra:stop                                    # Stop infrastructure

# Development workflow
npm run dev                                          # Start frontend
cd backend && npm run dev                           # Start backend
npm run infra:logs                                  # Follow infrastructure logs

# Production deployment
docker-compose -f docker-compose.production.yml up -d   # Deploy production
docker-compose -f docker-compose.production.yml ps      # Check status

# Monitoring
docker-compose -f docker-compose.monitoring.yml up -d   # Start monitoring
open http://localhost:3002                              # Grafana dashboard

# Cleanup
docker system prune -a          # Clean unused Docker resources
docker volume prune             # Remove unused volumes
```

### Performance Optimization

```bash
# Docker performance tuning
echo 'vm.max_map_count=262144' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Container resource limits (add to docker-compose.yml)
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
```

---

## 🤝 Contributing

### Development Workflow

1. **Fork the repository**
2. **Clone your fork** and set up development environment
3. **Create feature branch**: `git checkout -b feature/amazing-feature`
4. **Start local development**: `npm run infra:start` + `npm run dev` + `cd backend && npm run dev`
5. **Make your changes** with hot reload feedback
6. **Run tests**: Ensure all tests pass in development environment
7. **Commit changes**: Follow conventional commit messages
8. **Push to your fork**: `git push origin feature/amazing-feature`
9. **Create Pull Request** with detailed description

### Code Standards

- **TypeScript**: Strict type checking enabled
- **ESLint**: Airbnb configuration with custom rules
- **Prettier**: Automatic code formatting
- **Testing**: Jest for unit tests, Supertest for API tests
- **Docker**: Multi-stage builds with security scanning

### Testing in Development

```bash
# Run frontend tests
npm test

# Run backend tests
cd backend && npm test

# Run integration tests
cd backend && npm run test:integration

# Run e2e tests
npm run test:e2e
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙋‍♂️ Support & Community

- **🐛 Bug Reports**: [GitHub Issues](https://github.com/your-username/codiesvibe/issues)
- **💬 Discussions**: [GitHub Discussions](https://github.com/your-username/codiesvibe/discussions)  
- **📖 Documentation**: Comprehensive guides in `/docs` directory
- **💡 Feature Requests**: Use GitHub Issues with feature template
- **🔧 Technical Support**: Check troubleshooting guide first

### Getting Help

1. **Check the troubleshooting section** above
2. **Search existing issues** for similar problems
3. **Run health checks** and gather logs
4. **Create detailed issue** with logs and environment info

---

**🚀 Built with modern DevOps practices for the AI tools community**

*Last updated: $(date) - Phase 2 Complete with Advanced Containerization*