# Data Model: Docker Container Configuration

**Date**: 2025-09-16
**Feature**: Production-Grade Docker Containerization Setup

## Configuration Entities

### 1. Environment Configuration

**Purpose**: Defines environment-specific settings for different deployment scenarios

**Attributes**:
- `name`: Environment identifier (development, production, cloudflare, pre-built, monitoring)
- `nodeEnv`: Node.js environment setting (development, production)
- `ports`: Port mappings for services
- `volumes`: Volume mount configurations
- `networks`: Network configuration references
- `secrets`: Secret references for sensitive data
- `healthCheck`: Health check configuration
- `restartPolicy`: Container restart behavior

**Validation Rules**:
- Environment name must be unique within deployment
- Port mappings must not conflict within same host
- Volume paths must be absolute and accessible
- Network references must exist in network definitions
- Secret references must exist in secrets definitions

**States**:
- `Stopped`: Services not running
- `Starting`: Services initializing
- `Running`: Services operational
- `Unhealthy`: Health checks failing
- `Stopping`: Services shutting down

### 2. Service Definition

**Purpose**: Defines containerized service configuration

**Attributes**:
- `name`: Service identifier (frontend, backend, traefik, cloudflared, monitoring)
- `image`: Docker image reference
- `build`: Build configuration for custom images
- `environment`: Environment variables
- `volumes`: Volume mounts
- `networks`: Network memberships
- `ports`: Port exposures
- `depends_on`: Service dependencies
- `healthcheck`: Health check commands
- `restart`: Restart policy
- `deploy`: Deployment constraints

**Validation Rules**:
- Service name must be valid DNS name
- Image reference must be valid Docker image
- Port numbers must be in valid range (1-65535)
- Dependencies must reference existing services
- Health check commands must be executable
- Network references must exist

**Relationships**:
- Belongs to Environment Configuration
- References Network Configuration
- References Volume Configuration
- References Secret Configuration

### 3. Network Configuration

**Purpose**: Defines container networking and isolation

**Attributes**:
- `name`: Network identifier
- `driver`: Network driver type (bridge, overlay)
- `internal`: Whether network allows external access
- `attachable`: Whether external containers can attach
- `ipam`: IP address management configuration
- `labels`: Metadata labels

**Validation Rules**:
- Network name must be unique within deployment
- Driver must be supported by Docker
- IPAM configuration must not conflict with existing networks
- Internal networks cannot have port mappings to host

**Network Types**:
- `frontend`: External-facing services (Traefik, frontend app)
- `backend`: Internal application services
- `database`: Data tier services (if included)
- `monitoring`: Observability services

### 4. Volume Configuration

**Purpose**: Defines persistent storage and bind mounts

**Attributes**:
- `name`: Volume identifier
- `type`: Volume type (bind, volume, tmpfs)
- `source`: Source path (for bind mounts)
- `target`: Container mount path
- `readOnly`: Whether mount is read-only
- `driver`: Volume driver (for named volumes)
- `driverOpts`: Driver-specific options

**Validation Rules**:
- Volume name must be unique within service
- Source paths must exist for bind mounts
- Target paths must be absolute
- Read-only volumes cannot be used for writable data

**Volume Types**:
- `Source Code`: Development bind mounts for hot reload
- `Node Modules`: Anonymous volumes for dependencies
- `SSL Certificates`: Persistent storage for Traefik certificates
- `Logs`: Log aggregation storage
- `Monitoring Data`: Metrics and dashboard storage

### 5. Secret Configuration

**Purpose**: Manages sensitive configuration data

**Attributes**:
- `name`: Secret identifier
- `external`: Whether secret is externally managed
- `file`: Path to secret file (for file-based secrets)
- `environment`: Environment variable name
- `labels`: Metadata labels

**Validation Rules**:
- Secret name must be unique within deployment
- External secrets must exist in Docker secret store
- File paths must be accessible and readable
- Environment variable names must be valid

**Secret Types**:
- `MongoDB Connection String`: Database access credentials
- `SSL Certificates`: TLS certificates and keys
- `API Keys`: External service credentials
- `JWT Secrets`: Authentication signing keys
- `Cloudflare Tokens`: Tunnel authentication

### 6. Health Check Configuration

**Purpose**: Defines service health monitoring

**Attributes**:
- `test`: Health check command or HTTP endpoint
- `interval`: Check frequency
- `timeout`: Maximum check duration
- `retries`: Number of failed checks before unhealthy
- `startPeriod`: Grace period after container start

**Validation Rules**:
- Test command must be executable within container
- Interval must be positive duration
- Timeout must be less than interval
- Retries must be positive integer
- Start period should allow for application initialization

**Health Check Types**:
- `HTTP Endpoint`: GET request to health endpoint
- `Command Execution`: Shell command with exit code
- `TCP Socket`: Connection test to service port
- `Database Query`: Application-specific connectivity test

## Entity Relationships

```
Environment Configuration
├── Service Definition (1:N)
│   ├── Network Configuration (N:M)
│   ├── Volume Configuration (1:N)
│   ├── Secret Configuration (N:M)
│   └── Health Check Configuration (1:1)
└── Deployment Configuration (1:1)
```

## State Transitions

### Service Lifecycle
```
Stopped → Starting → Running → [Unhealthy] → Stopping → Stopped
                  ↓
                Restarting (if restart policy enabled)
```

### Environment Lifecycle
```
Inactive → Deploying → Active → Updating → Active
                    ↓
                  Scaling → Active
                    ↓
                 Stopping → Inactive
```

## Validation Rules Summary

1. **Naming**: All identifiers must be valid DNS names
2. **Uniqueness**: Names must be unique within their scope
3. **References**: All cross-references must exist
4. **Conflicts**: Port mappings and network configurations must not conflict
5. **Security**: Secrets must not be exposed in logs or environment variables
6. **Resource Limits**: CPU and memory limits must be specified for production
7. **Dependencies**: Service dependencies must form a directed acyclic graph
8. **Health Checks**: All production services must have health checks defined

## Configuration Examples

### Development Environment
- Hot reload enabled
- Debug ports exposed
- Source code bind mounted
- Development dependencies included

### Production Environment
- Optimized images
- Health checks enabled
- Restart policies configured
- Security hardening applied
- SSL termination configured

### Monitoring Environment
- Metrics collection enabled
- Log aggregation configured
- Dashboard services included
- Alerting rules defined