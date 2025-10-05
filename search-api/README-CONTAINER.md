# Search API - Containerized Setup

This document explains how to run the Search API with AI Reasoning using Docker and Docker Compose.

## Prerequisites

- Docker and Docker Compose
- At least 4GB of RAM
- (Optional) GPU support for local LLM service

## Quick Start

### Development Environment

```bash
# Start all services including monitoring
docker-compose -f docker-compose.infra.yml up -d

# Check service status
docker-compose -f docker-compose.infra.yml ps

# View logs
docker-compose -f docker-compose.infra.yml logs -f search-api
```

### Production Environment

```bash
# Copy environment variables
cp .env.example .env
# Edit .env with your production values

# Start production services
docker-compose -f docker-compose.production.yml up -d

# View logs
docker-compose -f docker-compose.production.yml logs -f search-api
```

## Services

### Core Services

| Service | Port | Description |
|---------|------|-------------|
| **search-api** | 4002 | Main agentic search API with AI reasoning |
| **mongodb** | 27017 | MongoDB database |
| **redis** | 6379 | Redis cache |

### Monitoring & Observability (Development)

| Service | Port | Description |
|---------|------|-------------|
| **grafana** | 3001 | Metrics dashboard |
| **prometheus** | 9090 | Metrics collection |
| **loki** | 3100 | Log aggregation |
| **promtail** | - | Log forwarding |

### Additional Services

| Service | Port | Description |
|---------|------|-------------|
| **mailhog** | 1025/8025 | Email testing (SMTP/Web UI) |
| **ollama** | 11434 | Local LLM service (optional) |
| **nginx** | 80/443 | Reverse proxy (production only) |

## Environment Variables

### Required Variables

```bash
# Database
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=your_secure_password
MONGO_DB_NAME=ai_tools
MONGO_COLLECTION_NAME=tools

# API Configuration
PORT=4002
CONFIDENCE_THRESHOLD=0.3
MAX_ITERATIONS=10
DEFAULT_LIMIT=20
ENABLE_REASONING_EXPLANATION=true

# LLM Configuration
OLLAMA_URL=http://ollama:11434
OLLAMA_MODEL=llama3.2:3b
TEMPERATURE=0.7
```

### Optional Production Variables

```bash
# CORS
CORS_ORIGIN=https://yourdomain.com

# External LLM
OLLAMA_URL=https://your-llm-service.com/api
OLLAMA_MODEL=your-custom-model

# Redis
REDIS_PASSWORD=your_redis_password
```

## API Endpoints

### Main API
- `GET http://localhost:4002/health` - Health check
- `POST http://localhost:4002/query` - Agentic search endpoint
- `GET http://localhost:4002/tools` - Available tools information
- `POST http://localhost:4002/clarification` - Handle clarification responses

### Monitoring (Development)
- Grafana Dashboard: http://localhost:3001 (admin/admin)
- Prometheus: http://localhost:9090
- Loki Logs: http://localhost:3100

### Email Testing
- MailHog SMTP: localhost:1025
- MailHog Web UI: http://localhost:8025

## Usage Examples

### Basic Search Query

```bash
curl -X POST http://localhost:4002/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "free AI tools with API access",
    "limit": 20,
    "options": {
      "includeReasoning": true,
      "verbosity": "standard"
    }
  }'
```

### Search with Clarification

```bash
curl -X POST http://localhost:4002/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "good tools for my startup",
    "options": {
      "includeReasoning": true,
      "maxIterations": 5
    }
  }'
```

## Health Check

```bash
# Check API health
curl http://localhost:4002/health

# Expected response
{
  "status": "ok",
  "uptime": 3600,
  "timestamp": "2024-01-01T12:00:00.000Z",
  "services": {
    "database": "connected",
    "tools": 27,
    "ai": {
      "ollama": "configured",
      "reasoning": "enabled"
    }
  },
  "version": "1.0.0"
}
```

## Development Workflow

### Local Development

1. **Start Services:**
   ```bash
   docker-compose -f docker-compose.infra.yml up -d
   ```

2. **Monitor Logs:**
   ```bash
   docker-compose -f docker-compose.infra.yml logs -f search-api
   ```

3. **Make Changes:**
   - Edit source code locally
   - Rebuild and restart:
   ```bash
   docker-compose -f docker-compose.infra.yml up -d --build search-api
   ```

### Production Deployment

1. **Configure Environment:**
   ```bash
   cp .env.example .env
   # Edit .env with production values
   ```

2. **Deploy:**
   ```bash
   docker-compose -f docker-compose.production.yml up -d
   ```

3. **Monitor:**
   ```bash
   docker-compose -f docker-compose.production.yml logs -f
   ```

## Troubleshooting

### Common Issues

1. **Port Conflicts:**
   ```bash
   # Check what's using the ports
   lsof -i :4002
   lsof -i :27017
   ```

2. **Memory Issues:**
   ```bash
   # Check container resource usage
   docker stats
   ```

3. **Database Connection:**
   ```bash
   # Check MongoDB logs
   docker-compose logs mongodb
   ```

4. **LLM Service:**
   ```bash
   # Check Ollama status
   docker-compose logs ollama
   ```

### Debug Mode

Run containers without detached mode to see output:

```bash
docker-compose -f docker-compose.infra.yml up search-api
```

### Cleaning Up

```bash
# Stop and remove containers
docker-compose -f docker-compose.infra.yml down

# Remove volumes (WARNING: This deletes data)
docker-compose -f docker-compose.infra.yml down -v

# Remove images
docker-compose -f docker-compose.infra.yml down --rmi all
```

## Scaling

### Horizontal Scaling

```bash
# Scale the search-api service
docker-compose -f docker-compose.production.yml up -d --scale search-api=3
```

### Resource Limits

Adjust resource limits in `docker-compose.production.yml`:

```yaml
search-api:
  deploy:
    resources:
      limits:
        cpus: '2.0'
        memory: 2G
      reservations:
        cpus: '1.0'
        memory: 1G
```

## Security Considerations

1. **Change Default Passwords:** Update MongoDB and Redis passwords
2. **Network Security:** Services are on internal network by default
3. **Environment Variables:** Use `.env` file for sensitive data
4. **SSL/TLS:** Configure certificates in nginx for HTTPS
5. **Rate Limiting:** Nginx includes basic rate limiting

## Monitoring

### Metrics

- **Application Metrics:** Custom metrics exposed by the API
- **System Metrics:** CPU, memory, disk usage
- **Network Metrics:** Request rates, response times

### Logging

- **Structured Logging:** JSON format for easy parsing
- **Log Aggregation:** Centralized with Loki
- **Log Rotation:** Automatic log file management

### Alerts

Set up alerts in Grafana for:
- High error rates
- Memory usage > 80%
- Database connection failures
- Service downtime

## Backup & Recovery

### Database Backup

```bash
# Backup MongoDB
docker exec mongodb mongodump --host localhost --port 27017 --db ai_tools --out /backup

# Restore from backup
docker exec mongodb mongorestore --host localhost --port 27017 --db ai_tools /backup/ai_tools
```

### Volume Backups

```bash
# List volumes
docker volume ls

# Backup volume
docker run --rm -v mongodb_data:/data -v $(pwd):/backup ubuntu tar cvf /backup/mongodb_backup.tar /data

# Restore volume
docker run --rm -v mongodb_data:/data -v $(pwd):/backup ubuntu tar xvf /backup/mongodb_backup.tar -C /data
```