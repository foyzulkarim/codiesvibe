#!/bin/bash
# CodiesVibe Production Deployment Script
# This script ensures proper environment setup and deploys the production environment

set -e  # Exit on any error

echo "🚀 Starting CodiesVibe Production Deployment..."

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required files exist
print_status "Checking required files..."
if [ ! -f "docker-compose.production.yml" ]; then
    print_error "docker-compose.production.yml not found!"
    exit 1
fi

if [ ! -f ".env.production" ]; then
    print_error ".env.production not found!"
    print_status "Please create it from the example file:"
    print_status "  cp .env.production.example .env.production"
    print_status "  nano .env.production  # Edit with your actual values"
    exit 1
fi

# Load production environment variables
if [ -f ".env.production" ]; then
    print_status "Loading production environment variables..."
    set -a  # Automatically export variables
    source .env.production
    set +a  # Stop auto-exporting
fi

# Check if infrastructure is running
print_status "Checking infrastructure services..."
if ! docker network ls | grep -q "codiesvibe-network"; then
    print_error "Infrastructure network not found. Please run: docker-compose -f docker-compose.infra.yml up -d"
    exit 1
fi

# Check if MongoDB is accessible
print_status "Checking MongoDB connection..."
# Try mongosh first, fall back to mongo for older versions
if ! docker exec codiesvibe-mongodb mongosh --eval "db.adminCommand('ping')" >/dev/null 2>&1 && \
   ! docker exec codiesvibe-mongodb mongo --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
    print_error "MongoDB is not accessible. Please check infrastructure services."
    exit 1
fi

# Stop existing production services
print_status "Stopping existing production services..."
docker-compose -f docker-compose.production.yml down --remove-orphans

# Build and start production services
print_status "Building and starting production services..."
docker-compose -f docker-compose.production.yml up -d --build

# Wait for services to be ready
print_status "Waiting for services to start..."
sleep 30

# Health checks
print_status "Performing health checks..."

# Check nginx
if curl -f http://localhost/health >/dev/null 2>&1; then
    print_success "Nginx is healthy"
else
    print_error "Nginx health check failed"
fi

# Check backend through nginx
if curl -f http://localhost/api/health >/dev/null 2>&1; then
    print_success "Backend is accessible through nginx"
else
    print_error "Backend health check failed"
fi

# Check frontend
if curl -f http://localhost/ >/dev/null 2>&1; then
    print_success "Frontend is serving content"
else
    print_error "Frontend health check failed"
fi

# Display service status
print_status "Production deployment status:"
docker-compose -f docker-compose.production.yml ps

print_success "🎉 Production deployment completed!"
print_status "Application is available at: http://localhost"
print_status "API documentation: http://localhost/docs"
print_status "Health endpoints:"
print_status "  Frontend: http://localhost/"
print_status "  Backend: http://localhost/api/health"
print_status "  Nginx: http://localhost/nginx-health"

# Display container logs for debugging
print_status "Recent logs from services:"
echo "--- Frontend Logs ---"
docker logs codiesvibe-frontend-prod --tail 10
echo "--- Backend Logs ---"
docker logs codiesvibe-backend-prod --tail 10
echo "--- Nginx Logs ---"
docker logs codiesvibe-nginx --tail 10