#!/bin/bash

# ============================================================================
# Search API - VPS Rollback Script
# ============================================================================
# This script rolls back the Search API deployment on a VPS
#
# Usage:
#   ./scripts/rollback-vps.sh [backup_file]
#
# Arguments:
#   backup_file - Optional: specific backup file to restore
#                 If not provided, will restore the most recent backup
#
# Prerequisites:
#   - VPS_HOST, VPS_USER, VPS_PATH environment variables set
#   - Previous backup exists on VPS
#
# Example:
#   export VPS_HOST=your-server.com
#   export VPS_USER=deploy
#   export VPS_PATH=/opt/search-api
#   ./scripts/rollback-vps.sh
#   ./scripts/rollback-vps.sh backup_20231117_120000.tar.gz
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

# VPS Configuration
VPS_HOST="${VPS_HOST:-}"
VPS_USER="${VPS_USER:-deploy}"
VPS_PATH="${VPS_PATH:-/opt/search-api}"
VPS_SSH_KEY="${VPS_SSH_KEY:-~/.ssh/id_rsa}"

# Backup configuration
BACKUP_DIR="${VPS_PATH}/backups"
BACKUP_FILE="${1:-}"

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
        exit 1
    fi

    # Check SSH connectivity
    if ! ssh -i "$VPS_SSH_KEY" -o ConnectTimeout=5 "${VPS_USER}@${VPS_HOST}" "echo 'SSH OK'" &>/dev/null; then
        log_error "Cannot connect to VPS via SSH"
        exit 1
    fi

    log_success "Prerequisites check passed"
}

list_available_backups() {
    log_info "Available backups on VPS:"
    echo ""

    ssh -i "$VPS_SSH_KEY" "${VPS_USER}@${VPS_HOST}" << EOF
        if [ -d "${BACKUP_DIR}" ]; then
            cd ${BACKUP_DIR}
            if ls backup_*.tar.gz 1> /dev/null 2>&1; then
                ls -lth backup_*.tar.gz | awk '{print NR". "$9" ("$5", "$6" "$7" "$8")"}'
            else
                echo "No backups found in ${BACKUP_DIR}"
                exit 1
            fi
        else
            echo "Backup directory ${BACKUP_DIR} does not exist"
            exit 1
        fi
EOF

    if [ $? -ne 0 ]; then
        log_error "No backups available for rollback"
        exit 1
    fi

    echo ""
}

select_backup() {
    if [ -n "$BACKUP_FILE" ]; then
        # Backup file specified as argument
        log_info "Using specified backup: $BACKUP_FILE"
        SELECTED_BACKUP="$BACKUP_FILE"
    else
        # Auto-select most recent backup
        log_info "Auto-selecting most recent backup..."
        SELECTED_BACKUP=$(ssh -i "$VPS_SSH_KEY" "${VPS_USER}@${VPS_HOST}" \
            "ls -t ${BACKUP_DIR}/backup_*.tar.gz 2>/dev/null | head -n 1 | xargs basename")

        if [ -z "$SELECTED_BACKUP" ]; then
            log_error "No backups found"
            exit 1
        fi

        log_info "Selected backup: $SELECTED_BACKUP"
    fi
}

create_pre_rollback_backup() {
    log_info "Creating pre-rollback backup of current state..."

    ssh -i "$VPS_SSH_KEY" "${VPS_USER}@${VPS_HOST}" << EOF
        cd ${VPS_PATH}
        TIMESTAMP=\$(date +%Y%m%d_%H%M%S)

        if [ -d "current" ]; then
            tar -czf ${BACKUP_DIR}/pre_rollback_\${TIMESTAMP}.tar.gz current/
            echo "Pre-rollback backup created: pre_rollback_\${TIMESTAMP}.tar.gz"
        fi
EOF

    log_success "Pre-rollback backup created"
}

perform_rollback() {
    log_info "Performing rollback..."

    ssh -i "$VPS_SSH_KEY" "${VPS_USER}@${VPS_HOST}" << EOF
        set -e

        cd ${VPS_PATH}

        # Stop current containers
        echo "Stopping current containers..."
        if [ -d "current" ] && [ -f "current/docker-compose.production.yml" ]; then
            cd current
            docker-compose -f docker-compose.production.yml down || true
            cd ..
        fi

        # Remove current directory
        echo "Removing current deployment..."
        rm -rf current.old
        if [ -d "current" ]; then
            mv current current.old
        fi

        # Extract backup
        echo "Restoring from backup: ${SELECTED_BACKUP}..."
        tar -xzf ${BACKUP_DIR}/${SELECTED_BACKUP}

        # Start containers from restored deployment
        echo "Starting containers from backup..."
        cd current

        # Use production compose file by default
        COMPOSE_FILE="docker-compose.production.yml"
        if [ ! -f "\$COMPOSE_FILE" ]; then
            COMPOSE_FILE="docker-compose.yml"
        fi

        if [ -f "\$COMPOSE_FILE" ]; then
            docker-compose -f \$COMPOSE_FILE up -d
        else
            echo "Warning: No docker-compose file found in backup"
        fi
EOF

    if [ $? -eq 0 ]; then
        log_success "Rollback completed"
    else
        log_error "Rollback failed"
        echo "The previous state has been preserved in current.old"
        exit 1
    fi
}

verify_rollback() {
    log_info "Verifying rollback..."

    # Wait for application to be ready
    log_info "Waiting for application to be ready (max 60 seconds)..."

    ssh -i "$VPS_SSH_KEY" "${VPS_USER}@${VPS_HOST}" << 'EOF'
        HEALTH_URL="http://localhost:4003/health"
        MAX_ATTEMPTS=30
        ATTEMPT=0

        while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
            if curl -f "$HEALTH_URL" &>/dev/null; then
                echo "✓ Health check passed"

                # Get health response
                RESPONSE=$(curl -s "$HEALTH_URL")
                echo "Health response: $RESPONSE"
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
        log_success "Rollback verified - application is healthy"
    else
        log_error "Rollback verification failed"
        echo "Application may not be healthy. Check logs:"
        echo "  ssh ${VPS_USER}@${VPS_HOST} 'cd ${VPS_PATH}/current && docker-compose logs'"
        exit 1
    fi
}

cleanup_old_deployment() {
    log_info "Cleaning up old deployment..."

    ssh -i "$VPS_SSH_KEY" "${VPS_USER}@${VPS_HOST}" << EOF
        cd ${VPS_PATH}
        if [ -d "current.old" ]; then
            rm -rf current.old
            echo "Old deployment removed"
        fi
EOF

    log_success "Cleanup completed"
}

show_rollback_info() {
    log_success "Rollback completed successfully!"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  ROLLBACK INFORMATION"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "  VPS Host:        ${VPS_HOST}"
    echo "  Restored From:   ${SELECTED_BACKUP}"
    echo "  Deployment Path: ${VPS_PATH}/current"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  USEFUL COMMANDS"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "  View logs:"
    echo "    ssh ${VPS_USER}@${VPS_HOST} 'cd ${VPS_PATH}/current && docker-compose logs -f'"
    echo ""
    echo "  Check status:"
    echo "    ssh ${VPS_USER}@${VPS_HOST} 'cd ${VPS_PATH}/current && docker-compose ps'"
    echo ""
    echo "  If issues persist, you can:"
    echo "    - Check application logs"
    echo "    - Restore from a different backup"
    echo "    - Deploy a fresh version"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# ============================================================================
# Main Rollback Flow
# ============================================================================

main() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  🔄 SEARCH API - VPS ROLLBACK"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "  VPS Host: ${VPS_HOST}"
    echo "  VPS User: ${VPS_USER}"
    echo "  VPS Path: ${VPS_PATH}"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    check_prerequisites
    list_available_backups
    select_backup

    # Confirm rollback
    echo ""
    log_warning "This will rollback to: ${SELECTED_BACKUP}"
    echo ""
    read -p "Continue with rollback? (yes/no): " -r
    echo
    if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
        log_info "Rollback cancelled"
        exit 0
    fi

    # Run rollback steps
    create_pre_rollback_backup
    perform_rollback
    verify_rollback
    cleanup_old_deployment
    show_rollback_info
}

# Run main function
main
