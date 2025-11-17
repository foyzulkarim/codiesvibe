#!/bin/bash

# ============================================================================
# Search API - VPS Deployment Script
# ============================================================================
# This script deploys the Search API to a VPS using Docker Compose
#
# Usage:
#   ./scripts/deploy-vps.sh [environment]
#
# Arguments:
#   environment - production|staging (default: production)
#
# Prerequisites:
#   - Docker and Docker Compose installed on VPS
#   - SSH access to VPS
#   - .env.production or .env.staging file configured
#   - VPS_HOST, VPS_USER, VPS_PATH environment variables set
#
# Example:
#   export VPS_HOST=your-server.com
#   export VPS_USER=deploy
#   export VPS_PATH=/opt/search-api
#   ./scripts/deploy-vps.sh production
# ============================================================================

set -e # Exit on error
set -u # Exit on undefined variable

# ============================================================================
# Configuration
# ============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Environment (production or staging)
ENVIRONMENT="${1:-production}"

# VPS Configuration (from environment variables)
VPS_HOST="${VPS_HOST:-}"
VPS_USER="${VPS_USER:-deploy}"
VPS_PATH="${VPS_PATH:-/opt/search-api}"
VPS_SSH_KEY="${VPS_SSH_KEY:-~/.ssh/id_rsa}"

# Docker Compose file
COMPOSE_FILE="docker-compose.${ENVIRONMENT}.yml"

# Backup directory
BACKUP_DIR="${VPS_PATH}/backups"

# ============================================================================
# Helper Functions
# ============================================================================

log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check if VPS_HOST is set
    if [ -z "$VPS_HOST" ]; then
        log_error "VPS_HOST environment variable not set"
        echo "Please set VPS_HOST to your server hostname or IP"
        echo "Example: export VPS_HOST=your-server.com"
        exit 1
    fi

    # Check if environment file exists
    if [ ! -f ".env.${ENVIRONMENT}" ]; then
        log_error "Environment file .env.${ENVIRONMENT} not found"
        echo "Please create .env.${ENVIRONMENT} with your configuration"
        exit 1
    fi

    # Check if compose file exists
    if [ ! -f "$COMPOSE_FILE" ]; then
        log_error "Docker Compose file $COMPOSE_FILE not found"
        exit 1
    fi

    # Check SSH connectivity
    if ! ssh -i "$VPS_SSH_KEY" -o ConnectTimeout=5 "${VPS_USER}@${VPS_HOST}" "echo 'SSH connection successful'" &>/dev/null; then
        log_error "Cannot connect to VPS via SSH"
        echo "Please check:"
        echo "  - VPS_HOST is correct: $VPS_HOST"
        echo "  - VPS_USER is correct: $VPS_USER"
        echo "  - SSH key is correct: $VPS_SSH_KEY"
        echo "  - SSH access is configured"
        exit 1
    fi

    log_success "Prerequisites check passed"
}

create_backup() {
    log_info "Creating backup of current deployment..."

    ssh -i "$VPS_SSH_KEY" "${VPS_USER}@${VPS_HOST}" << EOF
        # Create backup directory if not exists
        mkdir -p ${BACKUP_DIR}

        # Create timestamp
        TIMESTAMP=\$(date +%Y%m%d_%H%M%S)

        # Backup current deployment
        if [ -d "${VPS_PATH}/current" ]; then
            cd ${VPS_PATH}
            tar -czf ${BACKUP_DIR}/backup_\${TIMESTAMP}.tar.gz current/ || true
            echo "Backup created: ${BACKUP_DIR}/backup_\${TIMESTAMP}.tar.gz"

            # Keep only last 5 backups
            ls -t ${BACKUP_DIR}/backup_*.tar.gz | tail -n +6 | xargs -r rm
        else
            echo "No current deployment to backup"
        fi
EOF

    log_success "Backup created"
}

deploy_application() {
    log_info "Deploying application to VPS..."

    # Create deployment directory on VPS
    ssh -i "$VPS_SSH_KEY" "${VPS_USER}@${VPS_HOST}" "mkdir -p ${VPS_PATH}/current"

    # Sync files to VPS (excluding node_modules, .git, etc.)
    log_info "Syncing files to VPS..."
    rsync -avz --delete \
        --exclude 'node_modules' \
        --exclude '.git' \
        --exclude '.env*' \
        --exclude 'dist' \
        --exclude 'coverage' \
        --exclude '*.log' \
        --exclude 'logs' \
        -e "ssh -i $VPS_SSH_KEY" \
        ./ "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/current/"

    # Copy environment file
    log_info "Copying environment file..."
    scp -i "$VPS_SSH_KEY" ".env.${ENVIRONMENT}" "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/current/.env"

    log_success "Files synced to VPS"
}

build_and_start() {
    log_info "Building and starting containers..."

    ssh -i "$VPS_SSH_KEY" "${VPS_USER}@${VPS_HOST}" << EOF
        cd ${VPS_PATH}/current

        # Load environment variables
        export \$(cat .env | grep -v '^#' | xargs)

        # Pull latest images (if using external registry)
        docker-compose -f ${COMPOSE_FILE} pull || true

        # Build the application image
        docker-compose -f ${COMPOSE_FILE} build --no-cache

        # Stop and remove old containers
        docker-compose -f ${COMPOSE_FILE} down || true

        # Start new containers
        docker-compose -f ${COMPOSE_FILE} up -d

        # Show container status
        docker-compose -f ${COMPOSE_FILE} ps
EOF

    log_success "Containers started"
}

verify_deployment() {
    log_info "Verifying deployment..."

    # Wait for application to be ready
    log_info "Waiting for application to be ready (max 60 seconds)..."

    ssh -i "$VPS_SSH_KEY" "${VPS_USER}@${VPS_HOST}" << 'EOF'
        HEALTH_URL="http://localhost:4003/health"
        MAX_ATTEMPTS=30
        ATTEMPT=0

        while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
            if curl -f "$HEALTH_URL" &>/dev/null; then
                echo "✓ Health check passed"
                exit 0
            fi

            ATTEMPT=$((ATTEMPT + 1))
            echo "Waiting for health check... ($ATTEMPT/$MAX_ATTEMPTS)"
            sleep 2
        done

        echo "✗ Health check failed after $MAX_ATTEMPTS attempts"
        exit 1
EOF

    if [ $? -eq 0 ]; then
        log_success "Deployment verified - application is healthy"
    else
        log_error "Deployment verification failed"
        echo "Check application logs:"
        echo "  ssh ${VPS_USER}@${VPS_HOST} 'cd ${VPS_PATH}/current && docker-compose -f ${COMPOSE_FILE} logs'"
        exit 1
    fi
}

run_health_checks() {
    log_info "Running comprehensive health checks..."

    ssh -i "$VPS_SSH_KEY" "${VPS_USER}@${VPS_HOST}" << 'EOF'
        # Basic health check
        echo "1. Basic health check..."
        RESPONSE=$(curl -s http://localhost:4003/health)
        echo "   Response: $RESPONSE"

        # Liveness check
        echo "2. Liveness check..."
        RESPONSE=$(curl -s http://localhost:4003/health/live)
        echo "   Response: $RESPONSE"

        # Readiness check
        echo "3. Readiness check..."
        RESPONSE=$(curl -s http://localhost:4003/health/ready)
        echo "   Response: $RESPONSE"

        # Check container status
        echo "4. Container status..."
        cd /opt/search-api/current
        docker-compose ps

        # Check logs for errors
        echo "5. Recent logs (last 20 lines)..."
        docker-compose logs --tail=20 search-api
EOF

    log_success "Health checks completed"
}

show_deployment_info() {
    log_success "Deployment completed successfully!"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  DEPLOYMENT INFORMATION"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "  Environment:    ${ENVIRONMENT}"
    echo "  VPS Host:       ${VPS_HOST}"
    echo "  Deployment Path: ${VPS_PATH}/current"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  USEFUL COMMANDS"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "  View logs:"
    echo "    ssh ${VPS_USER}@${VPS_HOST} 'cd ${VPS_PATH}/current && docker-compose -f ${COMPOSE_FILE} logs -f'"
    echo ""
    echo "  Restart application:"
    echo "    ssh ${VPS_USER}@${VPS_HOST} 'cd ${VPS_PATH}/current && docker-compose -f ${COMPOSE_FILE} restart'"
    echo ""
    echo "  Check status:"
    echo "    ssh ${VPS_USER}@${VPS_HOST} 'cd ${VPS_PATH}/current && docker-compose -f ${COMPOSE_FILE} ps'"
    echo ""
    echo "  Rollback:"
    echo "    ./scripts/rollback-vps.sh"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# ============================================================================
# Main Deployment Flow
# ============================================================================

main() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  🚀 SEARCH API - VPS DEPLOYMENT"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "  Environment: ${ENVIRONMENT}"
    echo "  VPS Host:    ${VPS_HOST}"
    echo "  VPS User:    ${VPS_USER}"
    echo "  VPS Path:    ${VPS_PATH}"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # Confirm deployment
    read -p "Continue with deployment? (yes/no): " -r
    echo
    if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
        log_info "Deployment cancelled"
        exit 0
    fi

    # Run deployment steps
    check_prerequisites
    create_backup
    deploy_application
    build_and_start
    verify_deployment
    run_health_checks
    show_deployment_info
}

# Run main function
main
