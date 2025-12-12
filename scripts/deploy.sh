#!/bin/bash
# CodiesVibe - Deployment Script (for updates)
# Run this to deploy new versions after initial setup
#
# Usage: ./deploy.sh [frontend|search-api|all]
# Example: ./deploy.sh all

set -e

SERVICE="${1:-all}"
APP_DIR="$HOME/codiesvibe"
COMPOSE_FILE="docker-compose.ssl.yml"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

cd "$APP_DIR" || error "App directory not found: $APP_DIR"

log "Starting deployment: $SERVICE"

# Create backup of current state
BACKUP_FILE="backup-$(date +%Y%m%d-%H%M%S).yml"
docker compose -f "$COMPOSE_FILE" config > "$BACKUP_FILE" 2>/dev/null || true
log "Backup created: $BACKUP_FILE"

# Pull latest images
log "Pulling latest images..."
case "$SERVICE" in
    frontend)
        docker compose -f "$COMPOSE_FILE" pull frontend-init
        ;;
    search-api)
        docker compose -f "$COMPOSE_FILE" pull search-api
        ;;
    all|*)
        docker compose -f "$COMPOSE_FILE" pull
        ;;
esac

# Deploy services
log "Deploying services..."
case "$SERVICE" in
    frontend)
        # Remove old frontend volume and redeploy
        docker compose -f "$COMPOSE_FILE" rm -sf frontend-init
        docker volume rm codiesvibe_frontend_dist 2>/dev/null || true
        docker compose -f "$COMPOSE_FILE" up -d frontend-init
        sleep 5
        docker compose -f "$COMPOSE_FILE" restart nginx
        ;;
    search-api)
        docker compose -f "$COMPOSE_FILE" up -d --force-recreate search-api
        ;;
    all|*)
        # Full redeploy
        docker compose -f "$COMPOSE_FILE" down
        docker volume rm codiesvibe_frontend_dist 2>/dev/null || true
        docker compose -f "$COMPOSE_FILE" up -d
        ;;
esac

# Wait for services
log "Waiting for services to be healthy..."
sleep 15

# Health checks
log "Running health checks..."
HEALTHY=true

if ! curl -sf "http://localhost/nginx-health" > /dev/null 2>&1; then
    warn "Nginx health check failed"
    HEALTHY=false
fi

if ! curl -sf "http://localhost:4003/health" > /dev/null 2>&1; then
    warn "Search API health check failed"
    HEALTHY=false
fi

if [ "$HEALTHY" = false ]; then
    warn "Some health checks failed. Check logs:"
    echo "  docker compose -f $COMPOSE_FILE logs"
    exit 1
fi

# Cleanup old images
log "Cleaning up old images..."
docker image prune -f

# Show status
log "Deployment complete!"
docker compose -f "$COMPOSE_FILE" ps

echo ""
log "Services deployed successfully!"
