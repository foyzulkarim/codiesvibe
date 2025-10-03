# Docker Compose Architecture Evolution Tasks

## **Phase 1: Service Extraction**

### **Task 1: Create Modular Directory Structure**
**Objective:** Establish the foundation for modular Docker Compose architecture

**What to do:**
1. Create the main `docker-compose/` directory at project root
2. Create subdirectories: `services/`, `environments/`, `infrastructure/`
3. Verify directory structure matches the planned architecture

**Files/Directories to create:**
```
docker-compose/
├── services/
├── environments/
└── infrastructure/
```

**Validation:** Directory structure exists and is empty

**Done when:** All directories are created and accessible

---

### **Task 2: Extract NestJS Service Base Definition**
**Objective:** Create reusable NestJS service definition

**What to do:**
1. Analyze existing NestJS configuration in `docker-compose.backend.yml`
2. Create `docker-compose/services/docker-compose.nestjs.yml`
3. Extract common configuration (build args, environment variables, health checks)
4. Remove environment-specific settings (ports, volumes, development env vars)

**Base definition should include:**
- Build context and Dockerfile path
- Build args (BUILD_DATE, GIT_COMMIT, VERSION)
- Common environment variables (PORT, MONGODB_URI, REDIS_URL)
- Network configuration
- Health check configuration
- Restart policy
- Dependencies on mongodb and redis

**Validation:** File contains only service-common configuration

**Done when:** `docker-compose/services/docker-compose.nestjs.yml` exists with base configuration

---

### **Task 3: Extract Fastify Service Base Definition**
**Objective:** Create reusable Fastify service definition

**What to do:**
1. Analyze existing Fastify configuration in `docker-compose.backend.yml`
2. Create `docker-compose/services/docker-compose.fastify.yml`
3. Extract common configuration (build args, environment variables, health checks)
4. Remove environment-specific settings (ports, volumes, development env vars)

**Base definition should include:**
- Build context and Dockerfile path
- Build args (BUILD_DATE, GIT_COMMIT, VERSION)
- Common environment variables (PORT, MONGODB_URI, MCP_SERVER_URL, OLLAMA_MODEL)
- Network configuration
- Health check configuration
- Restart policy
- Dependencies on mongodb

**Validation:** File contains only service-common configuration

**Done when:** `docker-compose/services/docker-compose.fastify.yml` exists with base configuration

---

### **Task 4: Extract Gateway Service Base Definition**
**Objective:** Create reusable Gateway service definition

**What to do:**
1. Analyze existing Gateway configuration in `docker-compose.backend.yml`
2. Create `docker-compose/services/docker-compose.gateway.yml`
3. Extract common configuration (build args, health checks)
4. Remove environment-specific settings (ports, volumes)

**Base definition should include:**
- Build context and Dockerfile path
- Build args (BUILD_DATE, GIT_COMMIT, VERSION)
- Common environment variables (NGINX_WORKER_PROCESSES, NGINX_WORKER_CONNECTIONS)
- Network configuration
- Health check configuration
- Restart policy

**Validation:** File contains only service-common configuration

**Done when:** `docker-compose/services/docker-compose.gateway.yml` exists with base configuration

---

### **Task 5: Extract MongoDB Service Base Definition**
**Objective:** Create reusable MongoDB service definition

**What to do:**
1. Analyze existing MongoDB configuration in `docker-compose.backend.yml`
2. Create `docker-compose/services/docker-compose.mongodb.yml`
3. Extract common configuration (image, environment, health checks)
4. Remove environment-specific settings (ports)

**Base definition should include:**
- MongoDB image and version
- Environment variables (MONGO_INITDB_ROOT_USERNAME, MONGO_INITDB_ROOT_PASSWORD, MONGO_INITDB_DATABASE)
- Volume mounts for data persistence
- Network configuration
- Health check configuration
- Restart policy
- Init script mount

**Validation:** File contains only service-common configuration

**Done when:** `docker-compose/services/docker-compose.mongodb.yml` exists with base configuration

---

### **Task 6: Extract Redis Service Base Definition**
**Objective:** Create reusable Redis service definition

**What to do:**
1. Analyze existing Redis configuration in `docker-compose.backend.yml`
2. Create `docker-compose/services/docker-compose.redis.yml`
3. Extract common configuration (image, command, health checks)
4. Remove environment-specific settings (ports)

**Base definition should include:**
- Redis image and version
- Command with password requirement
- Volume mounts for data persistence
- Configuration file mount
- Network configuration
- Health check configuration
- Restart policy

**Validation:** File contains only service-common configuration

**Done when:** `docker-compose/services/docker-compose.redis.yml` exists with base configuration

---

### **Task 7: Create Development Environment Overrides**
**Objective:** Create development-specific service configurations

**What to do:**
1. Create `docker-compose/environments/docker-compose.development.yml`
2. Add development overrides for each service using `extends`
3. Include development-specific configurations:
   - Port mappings for external access
   - Volume mounts for hot reload
   - Development environment variables
   - Less strict security settings

**Services to override:**
- **nestjs-api**: Development build target, port 4001, source code volumes
- **fastify-api**: Port 4002, source code volumes, development env vars
- **gateway**: Port 4000, config volume mount
- **mongodb**: Port 27017 for direct access
- **redis**: Port 6379 for direct access

**Validation:** All services extend base definitions correctly

**Done when:** Development overrides file exists with all service configurations

---

### **Task 8: Create Production Environment Overrides**
**Objective:** Create production-specific service configurations

**What to do:**
1. Create `docker-compose/environments/docker-compose.production.yml`
2. Add production overrides for each service using `extends`
3. Include production-specific configurations:
   - Internal ports only (no external exposure)
   - No volume mounts (read-only filesystem)
   - Production environment variables
   - Strict security settings
   - Resource limits

**Services to override:**
- **nestjs-api**: Production build target, internal port only, security hardening
- **fastify-api**: Internal port only, security hardening, resource limits
- **gateway**: Production configuration
- **mongodb**: No external port exposure
- **redis**: No external port exposure

**Validation:** All services extend base definitions correctly

**Done when:** Production overrides file exists with all service configurations

---

### **Task 9: Move Infrastructure Files**
**Objective:** Organize infrastructure configurations

**What to do:**
1. Move `docker-compose.infra.yml` to `docker-compose/infrastructure/docker-compose.infra.yml`
2. Move `docker-compose.monitoring.yml` to `docker-compose/infrastructure/docker-compose.monitoring.yml`
3. Update any internal references or paths if necessary
4. Verify files are still functional in new location

**Validation:** Infrastructure files work correctly from new location

**Done when:** All infrastructure files are moved and accessible

---

### **Task 10: Create Root Composition File**
**Objective:** Create main docker-compose.yml with includes and profiles

**What to do:**
1. Create `docker-compose/docker-compose.yml` at project root
2. Add `include` statements for all service base definitions
3. Add `profiles` for different environments
4. Include infrastructure files

**Root composition should include:**
- Service base definitions from `services/` directory
- Infrastructure files from `infrastructure/` directory
- Profile definitions for development and production

**Validation:** File syntax is valid and includes all necessary components

**Done when:** Root composition file exists with proper includes and profiles

---

## **Phase 2: Directory Reorganization**

### **Task 11: Update Development Compose File**
**Objective:** Refactor existing development file to use new modular structure

**What to do:**
1. Update `docker-compose.backend.yml` to use new modular structure
2. Replace service definitions with `extends` references
3. Include only development-specific overrides
4. Remove duplicated service definitions
5. Test that the file works correctly

**Changes to make:**
- Replace service definitions with extends to base files
- Keep only development-specific configurations
- Update include paths if necessary
- Ensure all dependencies are correctly referenced

**Validation:** Development environment starts correctly with new structure

**Done when:** `docker-compose.backend.yml` uses modular structure successfully

---

### **Task 12: Update Production Compose File**
**Objective:** Refactor existing production file to use new modular structure

**What to do:**
1. Update `docker-compose.production.yml` to use new modular structure
2. Replace service definitions with `extends` references
3. Include only production-specific overrides
4. Remove duplicated service definitions
5. Test that the file works correctly

**Changes to make:**
- Replace service definitions with extends to base files
- Keep only production-specific configurations
- Update include paths if necessary
- Ensure all dependencies are correctly referenced

**Validation:** Production environment starts correctly with new structure

**Done when:** `docker-compose.production.yml` uses modular structure successfully

---

### **Task 13: Create Environment Variable Files**
**Objective:** Standardize environment variable management

**What to do:**
1. Create `.env.development` with development-specific variables
2. Create `.env.production` with production-specific variables
3. Move common variables to `.env.example`
4. Update compose files to reference correct environment files
5. Add documentation for each environment variable

**Environment files to create:**
- `.env.development`: Development database URLs, logging levels, CORS origins
- `.env.production`: Production database URLs, security settings, resource limits
- `.env.example`: Template with all required variables

**Validation:** Environment variables are correctly loaded in each environment

**Done when:** Environment variable files exist and work correctly

---

### **Task 14: Update Volume Definitions**
**Objective:** Consolidate and organize volume definitions

**What to do:**
1. Review all volume definitions across compose files
2. Move common volume definitions to root composition file
3. Ensure consistent naming conventions
4. Add proper drivers and configurations
5. Document each volume's purpose

**Volumes to organize:**
- Database data volumes (mongodb_data, redis_data)
- Log volumes (nestjs_logs, fastify_logs, gateway_logs)
- Configuration volumes
- Temporary volumes

**Validation:** All volumes are properly defined and accessible

**Done when:** Volume definitions are consolidated and documented

---

### **Task 15: Update Network Configuration**
**Objective:** Standardize network configuration across all environments

**What to do:**
1. Review network definitions across all compose files
2. Ensure consistent network naming and configuration
3. Update service network references
4. Add proper subnet configurations
5. Document network topology

**Network configurations to standardize:**
- codiesvibe-network configuration
- Subnet settings
- Driver configurations
- Service network attachments

**Validation:** All services can communicate correctly via networks

**Done when:** Network configuration is consistent across all environments

### **Task 16: Create Documentation**
**Objective:** Document the new architecture comprehensively

**What to do:**
1. Create architecture overview documentation
2. Document each service and its configuration
3. Create usage guides for each environment
4. Add troubleshooting guides
5. Document migration procedures

**Documentation to create:**
- Architecture overview
- Service configuration guide
- Environment setup guides
- Deployment procedures
- Troubleshooting guide

**Validation:** Documentation is complete and easy to follow

**Done when:** All documentation exists and is up-to-date

---

## **Phase 3: Advanced Features**

### **Task 17: Add Staging Environment**
**Objective:** Create staging environment configuration

**What to do:**
1. Create `docker-compose/environments/docker-compose.staging.yml`
2. Configure staging-specific overrides
3. Add staging profile to root composition
4. Create `.env.staging` environment file
5. Document staging environment usage

**Staging configuration should include:**
- Production-like security settings
- Limited resource allocation
- Staging-specific environment variables
- Internal port exposure only

**Validation:** Staging environment starts and functions correctly

**Done when:** Staging environment is fully configured and documented

---

### **Task 18: Implement Service Scaling**
**Objective:** Add scaling capabilities to services

**What to do:**
1. Add `deploy` configurations to base service definitions
2. Configure resource limits and reservations
3. Add scaling support for stateless services
4. Update environment overrides with scaling settings
5. Document scaling procedures

**Services to enable scaling:**
- nestjs-api (horizontal scaling)
- fastify-api (horizontal scaling)
- gateway (load balancing)

**Validation:** Services can be scaled up and down successfully

**Done when:** Scaling configurations are implemented and tested

---

### **Task 19: Add Health Check Enhancements**
**Objective:** Improve health check configurations

**What to do:**
1. Review and enhance existing health checks
2. Add startup probes for slow-starting services
3. Implement dependency health checks
4. Add health check endpoints where missing
5. Configure proper timeouts and retries

**Health check improvements:**
- Database connection health checks
- Application readiness probes
- Dependency service health verification
- Graceful degradation handling

**Validation:** All health checks work correctly and provide accurate status

**Done when:** Health checks are comprehensive and reliable

---

### **Task 20: Implement Secret Management**
**Objective:** Add proper secret management for production

**What to do:**
1. Identify sensitive data in environment variables
2. Create Docker secrets configuration
3. Update production compose file to use secrets
4. Add secret management documentation
5. Create secret rotation procedures

**Secrets to manage:**
- Database passwords
- JWT secrets
- API keys
- SSL certificates

**Validation:** Secrets are properly managed and not exposed in plain text

**Done when:** Secret management is implemented and documented

---

### **Task 21: Add Monitoring Integration**
**Objective:** Integrate monitoring across all environments

**What to do:**
1. Ensure all services export metrics
2. Add monitoring labels and annotations
3. Configure log aggregation for all services
4. Update monitoring compose file with new services
5. Create monitoring dashboards

**Monitoring integration includes:**
- Prometheus metrics collection
- Grafana dashboards
- Loki log aggregation
- Alert rules for critical services

**Validation:** Monitoring captures data from all services correctly

**Done when:** Monitoring is fully integrated across all environments

---

### **Task 22: Create Testing Procedures**
**Objective:** Establish testing procedures for the new architecture

**What to do:**
1. Create integration test scripts
2. Add health check validation tests
3. Create environment-specific test suites
4. Add performance testing procedures
5. Document testing workflows

**Testing procedures to implement:**
- Service startup validation
- Inter-service communication tests
- Environment configuration validation
- Performance benchmarking
- Failure scenario testing

**Validation:** All tests pass and provide meaningful feedback

**Done when:** Testing procedures are comprehensive and automated

---

### **Task 23: Final Validation and Cleanup**
**Objective:** Validate the complete architecture and clean up

**What to do:**
1. Test all environments end-to-end
2. Validate service dependencies and startup order
3. Remove any remaining duplicate configurations
4. Update all documentation with final configurations
5. Create migration guide for team members

**Final validation includes:**
- Complete environment testing
- Service dependency verification
- Configuration consistency check
- Documentation accuracy review
- Team training materials

**Validation:** All environments work correctly and documentation is accurate

**Done when:** Architecture is fully functional and ready for team use

---

## **Success Criteria**

### **Phase 1 Completion:**
- All service base definitions exist and are functional
- Environment override files work correctly
- No service duplication remains
- Directory structure matches planned architecture

### **Phase 2 Completion:**
- All existing compose files use modular structure
- Environment variables are properly managed
- Volumes and networks are standardized
- Development and production environments work correctly
- Documentation is comprehensive and up-to-date

### **Phase 3 Completion:**
- All advanced features are implemented
- Monitoring and observability are integrated
- Testing procedures are established

### **Overall Success:**
- Docker Compose architecture is modular and maintainable
- Service onboarding is streamlined
- Environment management is consistent
- Team can easily work with the new structure

---

## **Implementation Notes**

### **Prerequisites:**
- Docker Compose v2.0+ (for `extends` and `include` features)
- Understanding of current service configurations
- Backup of existing compose files before migration

### **Order of Execution:**
- Complete Phase 1 before starting Phase 2
- Complete Phase 2 before starting Phase 3
- Test each task individually before proceeding
- Validate each phase completion before moving to next

### **Risk Mitigation:**
- Keep original compose files as backup during migration
- Test each environment individually
- Have rollback procedures documented
- Communicate changes to team members

### **Quality Assurance:**
- Validate YAML syntax for each file
- Test service startup and communication
- Verify environment variable loading
- Check health check functionality
- Validate monitoring integration