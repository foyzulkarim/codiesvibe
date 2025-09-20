# Cloudflare Tunnel Setup Guide for CodiesVibe

This guide explains how to set up CodiesVibe with Cloudflare tunnels using `docker-compose.cloudflare.yml`.

## Prerequisites

1. **Cloudflare Account**: With a domain configured in Cloudflare
2. **Cloudflare Tunnel**: Created via Cloudflare dashboard or CLI
3. **Infrastructure**: Running `docker-compose.infra.yml` 

## Quick Setup

### 1. Create Cloudflare Tunnel

Using Cloudflare Dashboard:
1. Go to Cloudflare Dashboard → Zero Trust → Networks → Tunnels
2. Create a new tunnel
3. Copy the tunnel token

Using Cloudflare CLI:
```bash
# Install cloudflared
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb

# Authenticate
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create codiesvibe

# Get tunnel token
cloudflared tunnel token <tunnel-id>
```

### 2. Configure Environment Variables

Create `.env.cloudflare`:
```bash
# Required: Cloudflare Tunnel Token
CLOUDFLARE_TUNNEL_TOKEN=your-tunnel-token-here

# Required: Domain Configuration
CORS_ORIGIN=https://your-domain.com
GITHUB_CALLBACK_URL=https://your-domain.com/api/auth/github/callback

# Required: GitHub OAuth (configure in GitHub with your domain)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Required: Production Secrets
JWT_SECRET=your-secure-jwt-secret-32-chars-minimum
COOKIE_SECRET=your-secure-cookie-secret-32-chars-minimum
CSRF_SECRET=your-secure-csrf-secret-32-chars-minimum

# Optional: Cloudflare API (for advanced features)
CLOUDFLARE_ZONE_ID=your-zone-id
CLOUDFLARE_API_TOKEN=your-api-token

# Optional: CDN Configuration
CLOUDFLARE_CDN_URL=https://cdn.your-domain.com

# Optional: Tunnel Configuration
TUNNEL_LOGLEVEL=info
LOG_LEVEL=warn
```

### 3. Start Infrastructure

```bash
# Start infrastructure first
docker-compose -f docker-compose.infra.yml up -d

# Verify infrastructure is healthy
docker-compose -f docker-compose.infra.yml ps
```

### 4. Deploy with Cloudflare

```bash
# Load environment variables
source .env.cloudflare

# Or use docker-compose with env file
docker-compose -f docker-compose.cloudflare.yml --env-file .env.cloudflare up -d

# Check status
docker-compose -f docker-compose.cloudflare.yml ps
```

## Cloudflare Tunnel Configuration

### Tunnel Configuration (cloudflared)

The tunnel configuration points to the internal nginx service:

```yaml
# In Cloudflare Dashboard → Tunnels → Configure
ingress:
  - hostname: your-domain.com
    service: http://codiesvibe-nginx-cf:80
  - service: http_status:404
```

### DNS Configuration

1. Go to Cloudflare Dashboard → DNS → Records
2. Add a CNAME record:
   - Name: `@` (or subdomain)
   - Target: `tunnel-id.cfargotunnel.com`
   - Proxy status: Proxied

## Security Features

### Enhanced Security for Public Access

The Cloudflare deployment includes:

- **No Host Ports**: All traffic through Cloudflare tunnel
- **Reduced Resource Limits**: 256M RAM, 0.3 CPU
- **Stricter Rate Limiting**: 50 requests per 15 minutes
- **Enhanced Container Security**:
  - Read-only filesystem
  - No privilege escalation
  - All capabilities dropped
  - Non-root user execution

### Cloudflare Security Features

- **DDoS Protection**: Automatic protection
- **WAF**: Web Application Firewall
- **SSL/TLS**: Automatic SSL certificate management
- **Access Control**: IP blocking, country blocking
- **Bot Management**: Automatic bot detection

## Monitoring and Logs

### Tunnel Metrics

Cloudflare tunnel exposes metrics on port 8081:
```bash
# Check tunnel metrics
curl http://localhost:8081/metrics
```

### Container Logs

```bash
# View all logs
docker-compose -f docker-compose.cloudflare.yml logs

# View specific service logs
docker-compose -f docker-compose.cloudflare.yml logs cloudflared
docker-compose -f docker-compose.cloudflare.yml logs backend
docker-compose -f docker-compose.cloudflare.yml logs nginx
```

### Health Checks

```bash
# Check service health
docker-compose -f docker-compose.cloudflare.yml ps

# Test internal connectivity
docker exec codiesvibe-nginx-cf wget -q --spider http://localhost/health
```

## Troubleshooting

### Common Issues

1. **Tunnel Connection Failed**
   ```bash
   # Check tunnel token
   echo $CLOUDFLARE_TUNNEL_TOKEN
   
   # View cloudflared logs
   docker-compose -f docker-compose.cloudflare.yml logs cloudflared
   ```

2. **502 Bad Gateway**
   ```bash
   # Check backend health
   docker exec codiesvibe-backend-cf node healthcheck.js
   
   # Check nginx configuration
   docker exec codiesvibe-nginx-cf nginx -t
   ```

3. **GitHub OAuth Issues**
   - Verify GitHub OAuth app settings point to your Cloudflare domain
   - Check callback URL: `https://your-domain.com/api/auth/github/callback`

### Service Dependencies

The startup order is:
1. **Infrastructure** (MongoDB, Redis, etc.)
2. **Backend** (waits for infrastructure)
3. **Frontend** (builds and copies files)
4. **Nginx** (waits for backend and frontend)
5. **Cloudflared** (waits for nginx)

## Production Deployment

### Using Pre-built Images

Update `docker-compose.cloudflare.yml` to use GHCR images:

```yaml
frontend:
  image: ghcr.io/foyzulkarim/codiesvibe-frontend:latest
  # Comment out build section

backend:
  image: ghcr.io/foyzulkarim/codiesvibe-backend:latest
  # Comment out build section
```

### Environment-specific Configuration

Create environment-specific files:
- `.env.cloudflare.staging`
- `.env.cloudflare.production`

```bash
# Deploy to staging
docker-compose -f docker-compose.cloudflare.yml --env-file .env.cloudflare.staging up -d

# Deploy to production
docker-compose -f docker-compose.cloudflare.yml --env-file .env.cloudflare.production up -d
```

## Integration with Infrastructure

The Cloudflare deployment connects to the same infrastructure as other environments:

- **Database**: MongoDB from `docker-compose.infra.yml`
- **Cache**: Redis from infrastructure
- **Monitoring**: Prometheus, Grafana, Loki
- **Network**: Uses `codiesvibe-network`

This allows you to run multiple environments simultaneously:
```bash
# Infrastructure (shared)
docker-compose -f docker-compose.infra.yml up -d

# Development (localhost)
docker-compose -f docker-compose.dev.yml up -d

# Cloudflare (public tunnel)
docker-compose -f docker-compose.cloudflare.yml up -d
```

## Advanced Configuration

### Custom Nginx Configuration

Create `nginx.cloudflare.conf` for Cloudflare-specific settings:
```nginx
# Add Cloudflare real IP
set_real_ip_from 103.21.244.0/22;
real_ip_header CF-Connecting-IP;

# Trust Cloudflare headers
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto https;
```

### Multiple Tunnels

Run multiple tunnels for different environments:
```bash
# Staging tunnel
CLOUDFLARE_TUNNEL_TOKEN=staging-token docker-compose -f docker-compose.cloudflare.yml up -d

# Production tunnel
CLOUDFLARE_TUNNEL_TOKEN=production-token docker-compose -f docker-compose.cloudflare.yml up -d
```

This setup provides a secure, scalable, and highly available deployment through Cloudflare's global network.