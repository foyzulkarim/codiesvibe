#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# --- Configuration ---
# IMPORTANT: Replace this with the actual absolute path to the codiesvibe directory on your VPS.
# Example: PROJECT_DIR="/home/ubuntu/codiesvibe"
PROJECT_DIR="/path/to/codiesvibe" 
COMPOSE_FILE="docker-compose.production.yml"
# ---------------------

echo "Starting deployment for codiesvibe..."

# 1. Navigate to the project root directory
if [ ! -d "$PROJECT_DIR" ]; then
    echo "Error: Project directory $PROJECT_DIR does not exist."
    exit 1
fi
cd "$PROJECT_DIR"

# 2. Pull the latest code from the main branch
echo "Pulling latest code from main branch..."
git pull origin main

# 3. Stop, rebuild, and restart containers
# The 'up --build' command handles stopping, removing, building, and starting all in one go.
# --force-recreate is essential to ensure the one-time 'frontend-init' container runs again.
echo "Stopping and rebuilding containers with $COMPOSE_FILE..."
docker-compose -f "$COMPOSE_FILE" up -d --build --force-recreate

echo "Deployment complete! Check container status with 'docker-compose -f $COMPOSE_FILE ps'"
