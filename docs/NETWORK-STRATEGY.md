# Network Strategy for CodiesVibe Docker Implementation

## Overview
This document defines the **clean separation architecture** network strategy and connectivity patterns for all Docker Compose environments in the CodiesVibe project.

## Clean Separation Network Architecture

### Infrastructure Network (Environment-Agnostic)
- **Name**: `codiesvibe-network`
- **Driver**: `bridge`
- **Purpose**: Connects all infrastructure services (MongoDB, Redis, Prometheus, Grafana, Loki)
- **Definition**: `docker-compose/infrastructure/docker-compose.infra.yml`
- **Created by**: Infrastructure compose file
- **Used by**: All application compose files as external network

### Clean Separation Network Pattern

#### Infrastructure Layer (Creates Network)
```yaml
# docker-compose/infrastructure/docker-compose.infra.yml
networks:
  codiesvibe-network:
    driver: bridge
    name: codiesvibe-network
```

#### Application Layer (Uses External Network)
```yaml
# docker-compose.backend.yml, docker-compose.production.yml
networks:
  codiesvibe-network:
    external: true
    name: codiesvibe-network
```

### Environment Network Usage

1. **Development Environment** (`docker-compose.backend.yml`)
   - **Network**: External `codiesvibe-network`
   - **Purpose**: Backend services connect to infrastructure
   - **Access**: Infrastructure services via container names

2. **Production Environment** (`docker-compose.production.yml`)
   - **Network**: External `codiesvibe-network`
   - **Purpose**: Application services connect to infrastructure
   - **Access**: Infrastructure services via container names

3. **Infrastructure Services** (`docker-compose.infra.yml`)
   - **Network**: Creates `codiesvibe-network`
   - **Purpose**: Provides database, caching, monitoring
   - **Access**: Exposes ports to host for development

## Network Configuration Patterns

### Infrastructure Network Creation
Infrastructure compose file creates the network:
```yaml
# docker-compose/infrastructure/docker-compose.infra.yml
networks:
  codiesvibe-network:
    driver: bridge
    name: codiesvibe-network

services:
  mongodb:
    # ... config
    networks:
      - codiesvibe-network
```

### Application Network Usage
Application compose files join external network:
```yaml
# docker-compose.backend.yml, docker-compose.production.yml
networks:
  codiesvibe-network:
    external: true
    name: codiesvibe-network

services:
  nestjs-api:
    # ... config
    networks:
      - codiesvibe-network
    depends_on: []  # No infrastructure deps - managed by external network
```

## Service Connectivity Matrix

### Infrastructure Services (Available to All Environments)
| Service | Container Name | Network Address | Port | Purpose |
|---------|----------------|-----------------|------|---------|
| MongoDB | `codiesvibe-mongodb` | `mongodb:27017` | 27017 | Database |
| Redis | `codiesvibe-redis` | `redis:6379` | 6379 | Caching |
| Prometheus | `codiesvibe-prometheus` | `prometheus:9090` | 9090 | Metrics |
| Grafana | `codiesvibe-grafana` | `grafana:3000` | 3000 | Dashboards |
| Loki | `codiesvibe-loki` | `loki:3100` | 3100 | Logs |
| Mongo Express | `codiesvibe-mongo-express` | `mongo-express:8081` | 8081 | DB Admin |
| MailHog | `codiesvibe-mailhog` | `mailhog:1025` | 1025/8025 | Email Testing |

### Application Services (Clean Separation)
| Environment | Service | Container Name | Network Address | Port | Access Pattern |
|-------------|---------|---------------|-----------------|------|---------------|
| Development | NestJS API | `codiesvibe-nestjs-dev` | `nestjs-api:4001` | 4001 | Container |
| Development | Fastify API | `codiesvibe-fastify-dev` | `fastify-api:4002` | 4002 | Container |
| Development | Gateway | `codiesvibe-gateway-dev` | `gateway:4000` | 4000 | Container |
| Production | NestJS API | `codiesvibe-backend-prod` | `nestjs-api:4001` | 4001 | Container |
| Production | Fastify API | `codiesvibe-fastify-api-prod` | `fastify-api:4002` | 4002 | Container |
| Production | Gateway | `codiesvibe-gateway-prod` | `gateway:4000` | 4000 | Container |
| Production | Nginx | `codiesvibe-nginx` | `nginx:80` | 80 | Host + Container |

## Clean Separation Requirements

### Infrastructure Compose File Requirements
1. **Creates network**: `codiesvibe-network` with bridge driver
2. **Host port exposure**: Exposes infrastructure ports to host for development
3. **Container naming**: `codiesvibe-{service}` for consistency
4. **Health checks**: All services include health checks

### Application Compose File Requirements
1. **Uses external network**: `codiesvibe-network` (external: true)
2. **No infrastructure duplication**: Does not define MongoDB/Redis services
3. **Container naming**: `codiesvibe-{service}-{env}` for consistency
4. **Clean dependencies**: No explicit infrastructure dependencies

### Environment Variable Alignment
Both development and production use container names (clean separation):

**Development (Containerized Apps + Infrastructure):**
- MongoDB: `mongodb://admin:password123@mongodb:27017/codiesvibe?authSource=admin`
- Redis: `redis://:redis123@redis:6379`
- Prometheus: `http://prometheus:9090`
- Grafana: `http://grafana:3000`

**Production (All Containerized):**
- MongoDB: `mongodb://admin:password123@mongodb:27017/codiesvibe?authSource=admin`
- Redis: `redis://:redis123@redis:6379`
- Prometheus: `http://prometheus:9090`
- Grafana: `http://grafana:3000`

**Key Difference**: Only credentials and external URLs change, not service connection patterns

## Usage Scenarios

### Scenario 1: Clean Separation Development
```bash
# Quick start (recommended)
./scripts/dev-backend.sh

# Manual two-step approach
# Step 1: Start infrastructure services
docker-compose -f docker-compose/infrastructure/docker-compose.infra.yml --env-file .env.dev up -d

# Step 2: Start backend applications
docker-compose -f docker-compose.backend.yml --env-file .env.dev up

# Frontend runs natively, infrastructure and backend containerized
```

### Scenario 2: Production Deployment
```bash
# Step 1: Start infrastructure (includes monitoring)
docker-compose -f docker-compose/infrastructure/docker-compose.infra.yml --env-file .env.production up -d

# Step 2: Start production application
docker-compose -f docker-compose.production.yml --env-file .env.production up -d

# All services containerized with clean separation
```

### Scenario 3: Infrastructure Only
```bash
# Start only infrastructure services
docker-compose -f docker-compose/infrastructure/docker-compose.infra.yml --env-file .env.dev up -d

# Infrastructure services available for development or testing
# Applications can connect via external network pattern
```

## Network Security Considerations

1. **Internal Communication**: All services communicate via container names (no external IPs)
2. **Port Exposure**: Only necessary ports exposed to host
3. **Network Isolation**: All services isolated from default Docker bridge
4. **Service Discovery**: Automatic DNS resolution via container names

## Troubleshooting

### Common Network Issues
1. **Service Not Found**: Ensure both services are on `codiesvibe-network`
2. **Connection Refused**: Check if target service is running and healthy
3. **DNS Resolution**: Use container names, not localhost/127.0.0.1
4. **Network Not Found**: Ensure infrastructure is started first

### Network Inspection Commands
```bash
# List networks
docker network ls

# Inspect infrastructure network
docker network inspect codiesvibe-network

# Check infrastructure connectivity from host
ping localhost
curl http://localhost:27017  # MongoDB (will show connection info)
curl http://localhost:3001   # Grafana

# Check application connectivity
curl http://localhost:3000   # Frontend
curl http://localhost:4000/health  # Backend
```

## Clean Separation Benefits

### Architecture Advantages
1. **Perfect Environment Parity**: Development exactly matches production network patterns
2. **Infrastructure Independence**: Same infrastructure definition for all environments
3. **Clear Boundaries**: Infrastructure layer separate from application layer
4. **Scalable Design**: Infrastructure and applications can scale independently

### Operational Benefits
1. **Consistent Configuration**: Same service connection strings in all environments
2. **Simplified Debugging**: Network issues easier to diagnose with clear separation
3. **Flexible Deployment**: Can deploy infrastructure updates independently
4. **Security Isolation**: Clear network boundaries between layers

## Migration from Mixed Architecture

### Clean Separation Changes
- **OLD**: Mixed infrastructure/app services in same compose files
- **NEW**: Infrastructure creates network, applications join external network
- **OLD**: Environment-specific infrastructure definitions
- **NEW**: Environment-agnostic infrastructure, configuration-driven deployment
- **OLD**: Complex dependency management within single files
- **NEW**: Clean dependency management via external network pattern

This clean separation strategy ensures maximum clarity, perfect environment parity, and scalable architecture while maintaining flexible deployment scenarios.