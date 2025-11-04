#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# --- Configuration ---
# IMPORTANT: Replace this with the actual absolute path to the codiesvibe directory on your VPS.
# Example: PROJECT_DIR="/home/ubuntu/codiesvibe"
PROJECT_DIR="/path/to/codiesvibe"
COMPOSE_FILE="docker-compose.production.yml"
# ---------------------

# Validate PROJECT_DIR is not the placeholder
if [ "$PROJECT_DIR" = "/path/to/codiesvibe" ]; then
    echo "Error: PROJECT_DIR placeholder not updated in deploy.sh"
    exit 1
fi

echo "Starting deployment for codiesvibe..."

# 1. Navigate to the project root directory
if [ ! -d "$PROJECT_DIR" ]; then
    echo "Error: Project directory $PROJECT_DIR does not exist."
    exit 1
fi
cd "$PROJECT_DIR"

# 2. Pull the latest code from the main branch
echo "Pulling latest code from main branch..."
# Stash any local changes to prevent conflicts
git stash push -m "Auto-stash before deployment $(date)" || echo "No local changes to stash"
git pull origin main || {
    echo "Error: Failed to pull latest changes. Attempting to reset..."
    git reset --hard HEAD
    git pull origin main || {
        echo "Error: Failed to pull changes after reset. Deployment aborted."
        exit 1
    }
}

# 3. Stop containers and clean up volumes
echo "Stopping containers and cleaning up volumes..."
docker-compose -f "$COMPOSE_FILE" down --volumes --remove-orphans

# 4. Rebuild and restart containers
# The 'up --build' command handles building and starting all containers.
# --force-recreate ensures all containers are recreated from scratch.
echo "Rebuilding and starting containers with $COMPOSE_FILE..."
docker-compose -f "$COMPOSE_FILE" up -d --build --force-recreate

# Verify deployment success
echo "Verifying deployment..."
sleep 10  # Allow containers to start
if docker-compose -f "$COMPOSE_FILE" ps | grep -q "Up"; then
    echo "✅ Deployment successful! Containers are running."
    echo "Container status:"
    docker-compose -f "$COMPOSE_FILE" ps
else
    echo "❌ Deployment may have failed. Check container status:"
    docker-compose -f "$COMPOSE_FILE" ps
    echo "Container logs:"
    docker-compose -f "$COMPOSE_FILE" logs --tail=20
    exit 1
fi
