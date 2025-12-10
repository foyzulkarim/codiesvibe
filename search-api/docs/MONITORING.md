# Monitoring & Observability Guide

Complete monitoring and observability guide for the CodiesVibe Search API.

## Table of Contents

- [Health Checks](#health-checks)
- [Prometheus Metrics](#prometheus-metrics)
- [Logging](#logging)
- [Alerts](#alerts)
- [Dashboards](#dashboards)

---

## Health Checks

### Endpoints

| Endpoint | Purpose | Response Time | Checks |
|----------|---------|---------------|--------|
| `/health` | Basic health | <10ms | Server running |
| `/health/live` | Liveness probe | <100ms | Process alive |
| `/health/ready` | Readiness probe | <1s | MongoDB, Qdrant, system |
| `/health/circuit-breakers` | Circuit breaker status | <100ms | External services |

### GET /health

Quick server status check.

```bash
curl http://localhost:4003/health
```

**Response** (200 OK):
```json
{
  "status": "healthy",
  "timestamp": "2025-01-10T12:00:00.000Z",
  "uptime": 123.45,
  "services": {
    "server": "running",
    "search": "available"
  }
}
```

### GET /health/live

Fast liveness check for container orchestrators.

```bash
curl http://localhost:4003/health/live
```

**Use in Kubernetes**:
```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 4003
  initialDelaySeconds: 30
  periodSeconds: 10
```

### GET /health/ready

Comprehensive readiness check.

```bash
curl http://localhost:4003/health/ready
```

**Response** (200 OK):
```json
{
  "status": "healthy",
  "timestamp": "2025-01-10T12:00:00.000Z",
  "services": {
    "mongodb": "connected",
    "qdrant": "connected"
  },
  "system": {
    "memory": {
      "used": 512000000,
      "total": 2000000000
    },
    "cpu": {
      "usage": 0.45
    }
  }
}
```

**Response** (503 Service Unavailable):
```json
{
  "status": "unhealthy",
  "timestamp": "2025-01-10T12:00:00.000Z",
  "services": {
    "mongodb": "disconnected",
    "qdrant": "connected"
  },
  "error": "MongoDB connection failed"
}
```

---

## Prometheus Metrics

### Endpoint

```bash
curl http://localhost:4003/metrics
```

### Available Metrics

#### HTTP Metrics

```prometheus
# Total HTTP requests
http_requests_total{method="POST",route="/api/search",status="200"} 1234

# Request duration (histogram)
http_request_duration_seconds_bucket{method="POST",route="/api/search",le="0.1"} 100
http_request_duration_seconds_bucket{method="POST",route="/api/search",le="0.5"} 500

# Request size (bytes)
http_request_size_bytes{method="POST",route="/api/search"} 1024

# Response size (bytes)
http_response_size_bytes{method="POST",route="/api/search"} 2048
```

#### Search Metrics

```prometheus
# Search queries total
search_queries_total{status="success"} 1000
search_queries_total{status="error"} 10

# Search duration (histogram)
search_duration_seconds_bucket{le="0.1"} 100
search_duration_seconds_bucket{le="0.5"} 500

# Cache hits
cache_hits_total 400
cache_misses_total 600

# Vector queries executed
vector_queries_total{collection="tools"} 500
```

#### Database Metrics

```prometheus
# MongoDB connection pool
mongodb_connections_active 5
mongodb_connections_idle 10

# Qdrant queries
qdrant_queries_total{collection="tools"} 1000
qdrant_query_duration_seconds_bucket{le="0.1"} 900
```

#### System Metrics

```prometheus
# Memory usage
process_heap_bytes 512000000

# CPU usage
process_cpu_seconds_total 123.45

# Event loop lag
nodejs_eventloop_lag_seconds 0.001
```

---

## Logging

### Log Levels

| Level | Description | Use Case |
|-------|-------------|----------|
| `debug` | Detailed debugging | Development |
| `info` | General information | Production (default) |
| `warn` | Warning messages | Production |
| `error` | Error messages | Production (critical) |

### Log Files

**Console** (stdout/stderr):
- Colorized output in development
- JSON format in production

**Files**:
- `logs/search-api.log` - All logs
- `logs/security.log` - Security events only

**Loggly** (optional):
- Cloud logging service
- Centralized log aggregation

### Log Format

**Development** (colorized):
```
2025-01-10T12:00:00.000Z info: Search request received {
  correlationId: "abc-123",
  clientId: "127.0.0.1",
  query: "AI tools"
}
```

**Production** (JSON):
```json
{
  "timestamp": "2025-01-10T12:00:00.000Z",
  "level": "info",
  "message": "Search request received",
  "service": "search-api",
  "correlationId": "abc-123",
  "context": {
    "clientId": "127.0.0.1",
    "query": "AI tools"
  }
}
```

### Viewing Logs

```bash
# Docker
docker-compose logs -f search-api

# Local
tail -f logs/search-api.log
tail -f logs/security.log

# PM2
pm2 logs search-api
```

### Log Rotation

**logrotate** configuration:

```
/var/log/search-api/*.log {
  daily
  rotate 7
  compress
  delaycompress
  notifempty
  create 0640 node node
}
```

---

## Alerts

### Recommended Alerts

#### High Error Rate

```promql
rate(http_requests_total{status=~"5.."}[5m]) > 0.05
```

**Action**: Investigate server errors

#### High Search Latency

```promql
histogram_quantile(0.95, rate(search_duration_seconds_bucket[5m])) > 1.0
```

**Action**: Check database connections, LLM API

#### Low Cache Hit Rate

```promql
rate(cache_hits_total[5m]) / rate(cache_requests_total[5m]) < 0.2
```

**Action**: Review cache configuration

#### Database Connection Issues

```promql
up{job="search-api"} == 0
```

**Action**: Check MongoDB/Qdrant connectivity

### Alert Configuration

**Prometheus AlertManager**:

```yaml
groups:
  - name: search-api
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} per second"
```

---

## Dashboards

### Grafana Dashboard

**Recommended Panels**:

#### 1. Request Rate

```promql
rate(http_requests_total[5m])
```

#### 2. Response Time (p50, p95, p99)

```promql
histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m]))
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))
```

#### 3. Error Rate

```promql
rate(http_requests_total{status=~"5.."}[5m])
```

#### 4. Cache Hit Rate

```promql
rate(cache_hits_total[5m]) / (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m]))
```

#### 5. Search Latency

```promql
histogram_quantile(0.95, rate(search_duration_seconds_bucket[5m]))
```

#### 6. Active Connections

```promql
mongodb_connections_active
```

### Sample Dashboard JSON

```json
{
  "dashboard": {
    "title": "Search API Monitoring",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [{
          "expr": "rate(http_requests_total[5m])"
        }]
      },
      {
        "title": "Response Time (p95)",
        "targets": [{
          "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
        }]
      }
    ]
  }
}
```

---

[← Back to README](../README.md)
