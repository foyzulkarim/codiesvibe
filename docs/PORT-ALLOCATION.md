# Port Allocation Strategy for CodiesVibe Docker Implementation

## Overview
This document defines port allocation across all Docker environments to prevent conflicts and ensure consistent deployment patterns.

## Port Allocation Matrix

### Infrastructure Services (docker-compose.infra.yml)
| Service | Container Port | Host Port | Protocol | Purpose | Status |
|---------|----------------|-----------|----------|---------|---------|
| MongoDB | 27017 | 27017 | TCP | Database | ✅ Reserved |
| Prometheus | 9090 | 9090 | HTTP | Metrics Collection | ✅ Reserved |
| Grafana | 3000 | 3001 | HTTP | Dashboards | ✅ Reserved |
| Loki | 3100 | 3100 | HTTP | Log Aggregation | ✅ Reserved |
| Redis | 6379 | 6379 | TCP | Caching | ✅ Reserved |
| Mongo Express | 8081 | 8081 | HTTP | DB Admin UI | ✅ Reserved |
| MailHog SMTP | 1025 | 1025 | SMTP | Email Testing | ✅ Reserved |
| MailHog Web | 8025 | 8025 | HTTP | Email UI | ✅ Reserved |

### Application Services (Phase 1)

#### Development Environment (Local Native)
| Service | Port | Protocol | Purpose | Conflicts |
|---------|------|----------|---------|-----------|
| Frontend | 3000 | HTTP | Vite Dev Server (native) | ⚠️ Grafana uses 3001 |
| Backend | 4000 | HTTP | NestJS API (native) | ✅ Available |

#### Production Environment (docker-compose.production.yml)
| Service | Container Port | Host Port | Protocol | Purpose | Conflicts |
|---------|----------------|-----------|----------|---------|-----------|
| Nginx | 80 | 80 | HTTP | Web Server | ✅ Available |
| Nginx | 443 | 443 | HTTPS | SSL Termination | ✅ Available |
| Gateway | 4000 | 4000 | HTTP | API Gateway (exposed for testing) | ✅ Available |
| Frontend | 80 | - | HTTP | Internal (via Nginx) | N/A |
| Backend | 4001 | - | HTTP | Internal (via Gateway) | N/A |

#### Cloudflare Environment (docker-compose.cloudflare.yml)
| Service | Container Port | Host Port | Protocol | Purpose | Conflicts |
|---------|----------------|-----------|----------|---------|-----------|
| Cloudflare Tunnel | 8080 | - | HTTP | Tunnel Endpoint | ✅ Internal Only |
| Gateway | 4000 | - | HTTP | Internal (via Tunnel) | N/A |
| Frontend | 80 | - | HTTP | Internal (via Tunnel) | N/A |
| Backend | 4001 | - | HTTP | Internal (via Gateway) | N/A |

#### Monitoring Environment (docker-compose.monitoring.yml)
| Service | Container Port | Host Port | Protocol | Purpose | Conflicts |
|---------|----------------|-----------|----------|---------|-----------|
| Additional Grafana | 3000 | 3002 | HTTP | Extended Dashboards | ✅ Offset from infra |
| AlertManager | 9093 | 9093 | HTTP | Alert Management | ✅ Available |
| Node Exporter | 9100 | 9100 | HTTP | System Metrics | ✅ Available |

## Port Range Allocation

### Reserved Ranges
- **1000-1999**: Infrastructure SMTP/Email services
- **3000-3099**: Web interfaces (Frontend, Grafana variants)
- **4000-4099**: Backend API services (Gateway: 4000, Backend: 4001)
- **6000-6999**: Data services (Redis, databases)
- **8000-8999**: Admin/Management interfaces
- **9000-9999**: Monitoring and debugging services

### Available Ranges
- **5000-5999**: Future application services
- **7000-7999**: Future data services
- **10000+**: Development/testing services

## Conflict Resolution Strategy

### Current Conflicts Identified
1. **Grafana Port Conflict**: Infrastructure Grafana uses 3001 (not 3000) to avoid frontend conflict
2. **Local Development**: Native applications run on standard ports, infrastructure offset where needed

### Resolution Patterns
1. **Infrastructure Services**: Use standard ports when possible, offset if conflicts with local development
2. **Local Development**: Native applications use standard ports (3000, 4000)
3. **Monitoring Services**: Use +1 offset for additional instances
4. **Production**: Containerized with internal networking

## Environment-Specific Port Strategies

### Local Development (Native Applications)
```bash
# Local development runs natively, no Docker containers
npm run dev                   # Frontend on port 3000
cd backend && npm run dev     # Backend on port 4000 (direct access)

# Infrastructure services run in Docker
npm run infra:start          # MongoDB, Redis, Grafana, etc.

# Production uses gateway architecture:
# Gateway (4000) → Backend (4001)
```

### Port Conflict Resolution for Local Development
| Service | Default Port | Alternative | Reason |
|---------|-------------|-------------|---------|
| Frontend (Vite) | 3000 | 3010 | Avoid Grafana conflict |
| Backend (NestJS) | 4000 | 4010 | Multiple backend instances |
| Infrastructure | Standard | Use infra override | Complex Docker setup |

## Port Testing and Validation

### Pre-deployment Checks
```bash
# Check if ports are available
netstat -tuln | grep :3000
netstat -tuln | grep :4000
netstat -tuln | grep :9090

# Docker port inspection
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

### Conflict Detection Script
```bash
#!/bin/bash
# Check for port conflicts before deployment

INFRASTRUCTURE_PORTS=(27017 9090 3001 3100 6379 8081 1025 8025)
APPLICATION_PORTS=(3000 4000)

for port in "${INFRASTRUCTURE_PORTS[@]}" "${APPLICATION_PORTS[@]}"; do
    if netstat -tuln | grep -q ":$port "; then
        echo "⚠️  Port $port is already in use"
    else
        echo "✅ Port $port is available"
    fi
done
```

## Docker Compose Integration

### Network-Internal Communication
Services should communicate using container ports (not host ports):
```yaml
# Correct: Internal communication
BACKEND_URL=http://backend:4000

# Incorrect: Host port communication  
BACKEND_URL=http://localhost:4000
```

### Host Port Exposure Rules
1. **Development**: Native applications bind to localhost, infrastructure in Docker
2. **Production**: Minimal exposure (80, 443 only)
3. **Cloudflare**: No host ports (tunnel-only)
4. **Monitoring**: Expose monitoring ports for external access

## Migration and Upgrade Considerations

### Port Changes from Phase 0
- **Frontend**: 8080 → 3000 (completed in T001)
- **Backend**: 3000 → 4000 (completed in T002)
- **Environment files**: Updated accordingly (completed in T003)

### Future Port Reservations
- **5000-5099**: Reserved for microservices expansion
- **7000-7099**: Reserved for additional databases
- **11000+**: Reserved for development tools

## Documentation Integration

### Phase 1 Task Requirements
All Phase 1 docker-compose files must:
1. **Reference this document** for port allocation
2. **Use assigned port ranges** from this matrix
3. **Document any deviations** with justification
4. **Test for conflicts** before implementation

### Environment File Updates
All `.env` files should reference container ports for internal communication:
```env
# Use container ports (not host ports) for service communication
MONGODB_URI=mongodb://mongodb:27017/database
REDIS_URL=redis://redis:6379
PROMETHEUS_URL=http://prometheus:9090
```

## Troubleshooting

### Common Port Issues
1. **Port Already in Use**: Check running services with `netstat` or `lsof`
2. **Container Communication Failure**: Verify using container ports (not host ports)
3. **Override Not Working**: Ensure override file is properly named and located
4. **Service Discovery Failure**: Check network connectivity and DNS resolution

### Resolution Commands
```bash
# Find process using port
lsof -i :3000

# Kill process using port
sudo kill -9 $(lsof -t -i:3000)

# Check Docker container ports
docker port container_name

# Test internal connectivity
docker exec -it backend-container curl http://frontend:3000
```

This port allocation strategy ensures conflict-free deployment across all environments while maintaining clear communication patterns and easy troubleshooting.