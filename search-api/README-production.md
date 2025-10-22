# Production Deployment Guide

This guide covers how to deploy and manage the Search API service in a production environment.

## Prerequisites

1. Node.js 18+ installed
2. PM2 installed globally: `npm install -g pm2`
3. Production environment variables configured
4. MongoDB and Qdrant services running

## Production Setup

### 1. Environment Configuration

Copy the production environment template:
```bash
cp .env.production .env
```

Update `.env` with your production values:
- MongoDB connection string
- Qdrant host and port
- Ollama/vLLM endpoints
- Security configurations

### 2. Install Dependencies

```bash
npm ci --production
```

### 3. Build for Production

```bash
npm run build:prod
```

## Production Commands

### Deploy to Production
```bash
npm run deploy:prod
```
This command builds the project and starts it with PM2.

### Start/Stop/Restart
```bash
# Start the service
npm run start:prod:pm2

# Stop the service
npm run stop:prod

# Restart the service
npm run restart:prod

# Reload the service (zero-downtime)
npm run reload:prod
```

### Monitoring
```bash
# View logs
npm run logs:prod

# Monitor processes
npm run monit:prod

# Check PM2 status
pm2 status
```

## PM2 Configuration

The service uses PM2 with the following optimizations:

- **Cluster Mode**: Utilizes all CPU cores
- **Auto Restart**: Restarts on crashes
- **Memory Limit**: Restarts if memory usage exceeds 1GB
- **Log Management**: Centralized logging with timestamps
- **Graceful Shutdown**: 5-second timeout for clean shutdowns

## Production Optimizations

1. **Source Maps Disabled**: Faster startup and smaller bundle size
2. **Cluster Mode**: Better CPU utilization
3. **Memory Management**: Automatic restarts on memory leaks
4. **Log Level**: Set to 'warn' to reduce log noise
5. **Cache TTL**: Extended to 2 hours for better performance

## Health Monitoring

The service includes health check endpoints:
- `GET /health` - Basic health check
- Monitor CPU, memory, and response times via PM2

## Troubleshooting

### Service Won't Start
1. Check environment variables: `pm2 env search-api`
2. Verify MongoDB/Qdrant connectivity
3. Check logs: `npm run logs:prod`

### High Memory Usage
1. Monitor with: `pm2 monit`
2. Check for memory leaks in logs
3. Service auto-restarts at 1GB limit

### Performance Issues
1. Monitor response times
2. Check database connections
3. Verify cache configuration

## Security Considerations

1. Use environment variables for secrets
2. Configure firewall rules
3. Enable HTTPS in reverse proxy
4. Regular security updates
5. Monitor access logs

## Backup and Recovery

1. Regular MongoDB backups
2. Qdrant vector database backups
3. Environment configuration backups
4. Application logs retention

## Scaling

For high-traffic scenarios:
1. Increase PM2 instances in `ecosystem.config.js`
2. Use load balancer
3. Scale MongoDB/Qdrant horizontally
4. Implement Redis for distributed caching