# Docker Compose Architecture Evolution Plan

## **Current State Analysis**

### **Existing Structure:**
```
/
├── docker-compose.backend.yml      # Development (monolithic)
├── docker-compose.production.yml   # Production (monolithic)
├── docker-compose.infra.yml        # Infrastructure
└── docker-compose.monitoring.yml   # Monitoring
```

### **Issues Identified:**
- Service duplication across environments
- Monolithic files becoming hard to maintain
- Inconsistent service configurations
- Difficult to onboard new services
- Environment-specific logic mixed with service definitions

## **Target Modular Architecture**

### **Proposed Structure:**
```
/
├── docker-compose/
│   ├── services/
│   │   ├── docker-compose.nestjs.yml      # NestJS base definition
│   │   ├── docker-compose.fastify.yml     # Fastify base definition
│   │   ├── docker-compose.gateway.yml     # Gateway base definition
│   │   ├── docker-compose.frontend.yml    # Frontend base definition
│   │   ├── docker-compose.mongodb.yml     # MongoDB base definition
│   │   ├── docker-compose.redis.yml       # Redis base definition
│   │   └── docker-compose.ollama.yml      # Ollama base definition
│   ├── environments/
│   │   ├── docker-compose.development.yml # Development overrides
│   │   ├── docker-compose.staging.yml     # Staging overrides
│   │   └── docker-compose.production.yml  # Production overrides
│   ├── infrastructure/
│   │   ├── docker-compose.infra.yml       # Core infrastructure
│   │   └── docker-compose.monitoring.yml  # Monitoring stack
│   └── docker-compose.yml                 # Root composition file
```

## **Service Definition Standards**

### **Base Service Template:**
```yaml
# docker-compose/services/docker-compose.{service}.yml
services:
  {service-name}:
    build:
      context: ./backend/{service}
      dockerfile: Dockerfile.{service}
      args:
        - BUILD_DATE=${BUILD_DATE:-$(date -u +'%Y-%m-%dT%H:%M:%SZ')}
        - GIT_COMMIT=${GIT_COMMIT:-$(git rev-parse --short HEAD)}
        - VERSION=${VERSION:-latest}
    environment:
      - PORT={port}
      - NODE_ENV=${NODE_ENV:-development}
    networks:
      - codiesvibe-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:{port}/health"]
      interval: 30s
      timeout: 10s
      start_period: 15s
      retries: 3
```

### **Environment Override Template:**
```yaml
# docker-compose/environments/docker-compose.{env}.yml
services:
  {service-name}:
    extends:
      file: ../services/docker-compose.{service}.yml
      service: {service-name}
    container_name: codiesvibe-{service-name}-{env}
    # Environment-specific configurations
```

## **Service Categorization**

### **1. Application Services**
- **nestjs-api**: Primary backend API
- **fastify-api**: AI/ML processing service
- **gateway**: API gateway/load balancer
- **frontend**: Web application

### **2. Data Services**
- **mongodb**: Primary database
- **redis**: Cache/session store
- **elasticsearch**: Search engine (future)

### **3. AI/ML Services**
- **ollama**: Local LLM service
- **mcp-server**: Model Context Protocol server

### **4. Infrastructure Services**
- **nginx**: Reverse proxy
- **prometheus**: Metrics collection
- **grafana**: Monitoring dashboard
- **loki**: Log aggregation

## **Environment Configuration Strategy**

### **Development Environment:**
```yaml
# docker-compose/environments/docker-compose.development.yml
services:
  nestjs-api:
    extends:
      file: ../services/docker-compose.nestjs.yml
      service: nestjs-api
    build:
      target: development
    ports:
      - "4001:4001"
    volumes:
      - ./backend/nestjs-api/src:/app/src
      - ./backend/shared:/app/shared
    environment:
      - NODE_ENV=development
      - LOG_LEVEL=debug
```

### **Production Environment:**
```yaml
# docker-compose/environments/docker-compose.production.yml
services:
  nestjs-api:
    extends:
      file: ../services/docker-compose.nestjs.yml
      service: nestjs-api
    build:
      target: production
    expose:
      - "4001"
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=info
    read_only: true
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
```

## **Root Composition Strategy**

### **Main docker-compose.yml:**
```yaml
# Root composition file
include:
  - ./docker-compose/services/docker-compose.nestjs.yml
  - ./docker-compose/services/docker-compose.fastify.yml
  - ./docker-compose/services/docker-compose.gateway.yml
  - ./docker-compose/infrastructure/docker-compose.infra.yml

# Environment-specific overrides
profiles:
  development:
    - ./docker-compose/environments/docker-compose.development.yml
  production:
    - ./docker-compose/environments/docker-compose.production.yml
```

## **Service Dependencies Management**

### **Dependency Matrix:**
| Service | Depends On | Startup Order |
|---------|------------|---------------|
| mongodb | - | 1 |
| redis | - | 1 |
| nestjs-api | mongodb, redis | 2 |
| fastify-api | mongodb | 2 |
| gateway | nestjs-api, fastify-api | 3 |
| frontend | gateway | 4 |

### **Health Check Strategy:**
```yaml
depends_on:
  mongodb:
    condition: service_healthy
  redis:
    condition: service_healthy
```

## **Configuration Management**

### **Environment Variables:**
```bash
# .env.development
NODE_ENV=development
LOG_LEVEL=debug
MONGODB_URI=mongodb://admin:password123@mongodb:27017/codiesvibe
REDIS_URL=redis://:redis123@redis:6379

# .env.production
NODE_ENV=production
LOG_LEVEL=info
MONGODB_URI=mongodb://admin:${MONGO_PASSWORD}@mongodb:27017/codiesvibe
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
```

### **Secret Management:**
```yaml
# Production secrets (use Docker secrets or external secret manager)
secrets:
  mongodb_password:
    external: true
  jwt_secret:
    external: true
```

## **Scaling Strategy**

### **Horizontal Scaling:**
```yaml
services:
  nestjs-api:
    deploy:
      replicas: 3
    environment:
      - INSTANCE_ID={{.Task.Slot}}
```

### **Resource Management:**
```yaml
services:
  nestjs-api:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
```

## **Migration Path**

### **Phase 1: Service Extraction**
1. Extract individual services to base definitions
2. Create environment override files
3. Update existing compose files to use extends

### **Phase 2: Directory Reorganization**
1. Create modular directory structure
2. Move service definitions to appropriate folders
3. Update include paths

### **Phase 3: Advanced Features**
1. Add profiles for different deployment scenarios
2. Implement proper secret management
3. Add scaling configurations

## **Usage Examples**

### **Development:**
```bash
# Start all development services
docker-compose --profile development up

# Start specific service
docker-compose --profile development up nestjs-api

# Start with hot reload
docker-compose --profile development up --build
```

### **Production:**
```bash
# Deploy to production
docker-compose --profile production up -d

# Scale services
docker-compose --profile production up --scale nestjs-api=3
```

### **Testing:**
```bash
# Run integration tests
docker-compose --profile testing up --abort-on-container-exit
```

## **Benefits of This Architecture**

1. **Maintainability**: Single source of truth for each service
2. **Consistency**: Standardized service definitions
3. **Flexibility**: Easy environment-specific overrides
4. **Scalability**: Built-in support for service scaling
5. **Onboarding**: Clear structure for new services
6. **Testing**: Isolated environments for testing
7. **Security**: Proper secret management
8. **Monitoring**: Integrated observability stack

## **Implementation Considerations**

### **File Naming Conventions**
- Use kebab-case for file names
- Include service name in base definition files
- Include environment name in override files

### **Version Control Strategy**
- Track all compose files in version control
- Use environment variables for sensitive data
- Separate infrastructure from application code

### **CI/CD Integration**
- Use compose files in deployment pipelines
- Implement health checks in deployment scripts
- Support blue-green deployments

### **Monitoring and Observability**
- Include monitoring in all environments
- Standardize logging formats
- Implement distributed tracing

## **Future Enhancements**

### **Multi-Environment Support**
- Add staging environment
- Support feature flags
- Enable A/B testing

### **Advanced Networking**
- Implement service mesh
- Add network policies
- Support external service integration

### **Security Hardening**
- Implement zero-trust networking
- Add runtime security scanning
- Enable automated security updates

### **Performance Optimization**
- Implement caching strategies
- Add CDN integration
- Optimize resource utilization

This architecture provides a solid foundation for growing your Docker Compose setup while maintaining clarity and manageability.