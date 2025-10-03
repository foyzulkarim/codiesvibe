# Infrastructure Setup for CodiesVibe

This document explains the clean separation architecture for CodiesVibe, where infrastructure services are completely separated from application services.

## Architecture Overview

CodiesVibe follows a **clean separation architecture**:

- **Infrastructure Layer**: Database, caching, monitoring (environment-agnostic)
- **Application Layer**: Backend APIs, frontend, gateway (environment-specific)

This approach ensures:
✅ **Consistent environments** - Development mirrors production exactly  
✅ **Clear separation** - Infrastructure vs application concerns  
✅ **Better testing** - Development environment matches production  
✅ **Scalable mindset** - Forces thinking in production-ready patterns  

## Quick Start

### Development Environment

**Option 1: Use the convenience script (Recommended)**
```bash
# Start full development environment
./scripts/dev-backend.sh

# Start infrastructure only
./scripts/dev-backend.sh infra-only

# Stop all services
./scripts/dev-backend.sh stop
```

**Option 2: Manual two-step approach**
```bash
# Step 1: Start infrastructure services
docker-compose -f docker-compose/infrastructure/docker-compose.infra.yml --env-file .env.dev up -d

# Step 2: Start backend services
docker-compose -f docker-compose.backend.yml --env-file .env.dev up
```

### Production Environment

```bash
# Step 1: Start infrastructure services
docker-compose -f docker-compose/infrastructure/docker-compose.infra.yml --env-file .env.production up -d

# Step 2: Start application services
docker-compose -f docker-compose.production.yml --env-file .env.production up -d
```

### Stop Services

```bash
# Stop infrastructure
docker-compose -f docker-compose/infrastructure/docker-compose.infra.yml down

# Stop backend development
docker-compose -f docker-compose.backend.yml down

# Stop production
docker-compose -f docker-compose.production.yml down
```

## Services Included

### Core Services

1. **MongoDB** (Port 27017)
   - Database for the application
   - Admin user: `admin` / `password123`
   - App user: `codiesvibe_user` / `codiesvibe_password`
   - Database: `codiesvibe`

2. **Redis** (Port 6379)
   - Caching and session storage
   - Password: `redis123`

### Monitoring Stack

3. **Prometheus** (Port 9090)
   - Metrics collection and storage
   - Web UI: http://localhost:9090

4. **Grafana** (Port 3001)
   - Metrics visualization and dashboards
   - Login: `admin` / `admin123`
   - Web UI: http://localhost:3001

5. **Loki** (Port 3100)
   - Log aggregation
   - API endpoint: http://localhost:3100

### Development Tools

6. **Mongo Express** (Port 8081)
   - MongoDB web admin interface
   - Login: `admin` / `admin123`
   - Web UI: http://localhost:8081

7. **MailHog** (Ports 1025, 8025)
   - Email testing service
   - SMTP: localhost:1025
   - Web UI: http://localhost:8025

## Environment Configuration

### Development Configuration

Copy the development template:
```bash
cp .env.dev.example .env.dev
```

Update `.env.dev` with your development credentials, especially:
- `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`
- Any other development-specific settings

### Production Configuration

Copy the production template:
```bash
cp .env.production.example .env.production
```

**Important**: Update all secrets and credentials in production:
- Strong `JWT_SECRET`, `COOKIE_SECRET`, `CSRF_SECRET`
- Production `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`
- Update `VITE_API_URL` with your production domain
- Change all default passwords

### Infrastructure Connection Strings

The infrastructure services use consistent connection patterns:

```env
# Infrastructure Service Credentials (same for dev/prod, only secrets change)
MONGODB_URI=mongodb://admin:password123@mongodb:27017/codiesvibe?authSource=admin
REDIS_URL=redis://:redis123@redis:6379

# Monitoring Endpoints
PROMETHEUS_URL=http://prometheus:9090
GRAFANA_URL=http://grafana:3000
LOKI_URL=http://loki:3100
```

**Note**: When connecting from application containers, use service names (`mongodb`, `redis`) as hostnames, not `localhost`.

## Health Checks

All services include health checks. You can monitor the status with:

```bash
docker-compose -f docker-compose/infrastructure/docker-compose.infra.yml ps
```

## Data Persistence

The following data is persisted in Docker volumes:
- MongoDB data (`mongodb_data`)
- Prometheus metrics (`prometheus_data`)
- Grafana dashboards and settings (`grafana_data`)
- Loki logs (`loki_data`)
- Redis data (`redis_data`)

## Networking

All services are connected via the `codiesvibe-network` bridge network, allowing them to communicate with each other using service names as hostnames.

## Troubleshooting

### Service Won't Start
Check logs for a specific service:
```bash
docker-compose -f docker-compose/infrastructure/docker-compose.infra.yml logs [service-name]
```

### Port Conflicts
If you have port conflicts, you can modify the ports in `docker-compose/infrastructure/docker-compose.infra.yml` or stop conflicting services.

### Reset Everything
To completely reset all data and start fresh:
```bash
docker-compose -f docker-compose/infrastructure/docker-compose.infra.yml down -v
docker-compose -f docker-compose/infrastructure/docker-compose.infra.yml up -d
```

## Clean Separation Architecture

### File Structure

```
docker-compose/
├── infrastructure/
│   └── docker-compose.infra.yml    # Infrastructure services only
├── services/
│   ├── docker-compose.nestjs.yml   # NestJS base definition
│   ├── docker-compose.fastify.yml  # Fastify base definition
│   └── docker-compose.gateway.yml  # Gateway base definition
├── environments/
│   ├── docker-compose.development.yml
│   └── docker-compose.production.yml

# Root-level compose files
docker-compose.backend.yml          # Development backend services
docker-compose.production.yml       # Production application services
```

### Service Dependencies

**Development Flow:**
1. `docker-compose.infra.yml` creates `codiesvibe-network` and starts infrastructure
2. `docker-compose.backend.yml` joins external `codiesvibe-network` and starts applications

**Production Flow:**
1. `docker-compose.infra.yml` creates `codiesvibe-network` and starts infrastructure  
2. `docker-compose.production.yml` joins external `codiesvibe-network` and starts applications

### Key Benefits

1. **Environment Parity**: Development and production use identical infrastructure
2. **Independent Scaling**: Infrastructure can be scaled separately from applications
3. **Clean Dependencies**: Application services explicitly depend on infrastructure network
4. **Security**: Infrastructure credentials managed separately from application code
5. **Testing**: Can test infrastructure changes independently

## Integration Patterns

### Application Service Connection

When application services connect to infrastructure:

```yaml
# In docker-compose.backend.yml or docker-compose.production.yml
services:
  nestjs-api:
    # ... other config
    networks:
      - codiesvibe-network  # External network created by infrastructure
    environment:
      - MONGODB_URI=mongodb://admin:password123@mongodb:27017/codiesvibe?authSource=admin
      - REDIS_URL=redis://:redis123@redis:6379
```

### Network Configuration

```yaml
# Infrastructure creates the network
networks:
  codiesvibe-network:
    driver: bridge
    name: codiesvibe-network

# Applications join the external network
networks:
  codiesvibe-network:
    external: true
    name: codiesvibe-network
```

## Production Deployment

### Two-Step Deployment Process

1. **Deploy Infrastructure:**
   ```bash
   docker-compose -f docker-compose/infrastructure/docker-compose.infra.yml --env-file .env.production up -d
   ```

2. **Deploy Applications:**
   ```bash
   docker-compose -f docker-compose.production.yml --env-file .env.production up -d
   ```

### Production Considerations

- **Secrets Management**: Use Docker secrets or external secret management
- **Resource Limits**: Configure appropriate memory/CPU limits
- **Backup Strategy**: Regular backups of MongoDB and other persistent data
- **Monitoring**: Set up alerts and proper monitoring
- **Security**: Change all default passwords, use SSL/TLS
- **Scaling**: Consider external managed services for high-traffic scenarios