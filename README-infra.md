# Infrastructure Setup for CodeiesVibe

This document explains how to spin up all the supporting infrastructure services for the CodeiesVibe project using Docker Compose.

## Quick Start

To start all infrastructure services with a single command:

```bash
docker-compose -f docker-compose.infra.yml up -d
```

To stop all services:

```bash
docker-compose -f docker-compose.infra.yml down
```

To stop and remove all data volumes:

```bash
docker-compose -f docker-compose.infra.yml down -v
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

## Environment Variables for Your Application

Add these to your application's `.env` file to connect to the infrastructure services:

```env
# Database
MONGODB_URI=mongodb://codiesvibe_user:codiesvibe_password@localhost:27017/codiesvibe
MONGODB_URI_ADMIN=mongodb://admin:password123@localhost:27017/codiesvibe

# Redis
REDIS_URL=redis://:redis123@localhost:6379

# Email (Development)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=

# Monitoring
PROMETHEUS_URL=http://localhost:9090
LOKI_URL=http://localhost:3100
```

## Health Checks

All services include health checks. You can monitor the status with:

```bash
docker-compose -f docker-compose.infra.yml ps
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
docker-compose -f docker-compose.infra.yml logs [service-name]
```

### Port Conflicts
If you have port conflicts, you can modify the ports in `docker-compose.infra.yml` or stop conflicting services.

### Reset Everything
To completely reset all data and start fresh:
```bash
docker-compose -f docker-compose.infra.yml down -v
docker-compose -f docker-compose.infra.yml up -d
```

## Integration with Main Application

When running your main application (frontend/backend), make sure to:

1. Use the environment variables listed above
2. Ensure your application containers are on the same network (`codiesvibe-network`)
3. Use service names (e.g., `mongodb`, `redis`) as hostnames when connecting from other containers

## Production Notes

This infrastructure setup is designed for development. For production:

- Change all default passwords
- Use proper secrets management
- Configure proper resource limits
- Set up proper backup strategies
- Use external managed services where appropriate