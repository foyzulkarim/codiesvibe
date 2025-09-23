# Network Strategy for CodiesVibe Docker Implementation

## Overview
This document defines the network naming strategy and connectivity patterns for all Docker Compose environments in the CodiesVibe project.

## Network Architecture

### Current Infrastructure Network
- **Name**: `codiesvibe-network`
- **Driver**: `bridge`
- **Purpose**: Connects all infrastructure services (MongoDB, Redis, Prometheus, Grafana, etc.)
- **Definition**: `docker-compose.infra.yml`

### Standardized Network Naming Convention

#### Phase 1 Networks (To Be Implemented)
All Phase 1 Docker Compose files must use consistent network naming:

1. **Development Environment** (`docker-compose.dev.yml`)
   - **Network Name**: `codiesvibe-network`
   - **External**: `true` (connects to existing infrastructure)
   - **Purpose**: Allows dev containers to communicate with infrastructure services

2. **Production Environment** (`docker-compose.production.yml`)
   - **Network Name**: `codiesvibe-network`
   - **External**: `true` (connects to existing infrastructure)
   - **Purpose**: Production containers communicate with monitoring/logging infrastructure

3. **Cloudflare Environment** (`docker-compose.cloudflare.yml`)
   - **Network Name**: `codiesvibe-network`
   - **External**: `true` (connects to existing infrastructure)
   - **Purpose**: Cloudflare tunnel integration with infrastructure monitoring

4. **Monitoring Environment** (`docker-compose.monitoring.yml`)
   - **Network Name**: `codiesvibe-network`
   - **External**: `true` (reuses infrastructure network)
   - **Purpose**: Additional monitoring services join existing network

## Network Configuration Patterns

### External Network Declaration
All Phase 1 compose files must include:
```yaml
networks:
  codiesvibe-network:
    external: true
    name: codiesvibe-network
```

### Service Network Assignment
All services must join the network:
```yaml
services:
  frontend:
    # ... other config
    networks:
      - codiesvibe-network
  
  backend:
    # ... other config
    networks:
      - codiesvibe-network
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

### Application Services (Phase 1)
| Environment | Service | Container Name | Network Address | Port |
|-------------|---------|----------------|-----------------|------|
| Development | Frontend | `codiesvibe-frontend-dev` | `frontend:3000` | 3000 |
| Development | Backend | `codiesvibe-backend-dev` | `backend:4000` | 4000 |
| Production | Frontend | `codiesvibe-frontend-prod` | `frontend:80` | 80 |
| Production | Backend | `codiesvibe-backend-prod` | `backend:4000` | 4000 |
| Production | Nginx | `codiesvibe-nginx` | `nginx:80` | 80 |

## Integration Requirements

### Phase 1 Compose File Requirements
1. **Must use external network**: `codiesvibe-network`
2. **Must not create conflicting networks**: Avoid `app-network` or custom names
3. **Must use consistent container naming**: `codiesvibe-{service}-{env}`
4. **Must connect all services to network**: Every service joins `codiesvibe-network`

### Environment Variable Alignment
Services must use network addresses for internal communication:
- MongoDB: `mongodb://mongodb:27017/codiesvibe`
- Redis: `redis://redis:6379`
- Prometheus: `http://prometheus:9090`
- Grafana: `http://grafana:3000`

## Usage Scenarios

### Scenario 1: Full Development Stack
```bash
# Start infrastructure
docker-compose -f docker-compose.infra.yml up -d

# Start development application
docker-compose -f docker-compose.dev.yml up -d

# All services communicate via codiesvibe-network
```

### Scenario 2: Production with Monitoring
```bash
# Start infrastructure (includes monitoring)
docker-compose -f docker-compose.infra.yml up -d

# Start production application
docker-compose -f docker-compose.production.yml up -d

# Monitoring automatically available
```

### Scenario 3: Isolated Infrastructure Testing
```bash
# Start only infrastructure
docker-compose -f docker-compose.infra.yml up -d

# Infrastructure services available for external connections
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

# Inspect network
docker network inspect codiesvibe-network

# Check service connectivity
docker exec -it codiesvibe-backend-dev ping mongodb
```

## Migration Notes

### From Schema Contracts
- **OLD**: `app-network` → **NEW**: `codiesvibe-network`
- **OLD**: Service-specific networks → **NEW**: Single shared network
- **OLD**: Internal network creation → **NEW**: External network reference

This strategy ensures seamless communication between all services while maintaining clear separation of concerns and enabling flexible deployment scenarios.