#!/bin/bash
# Debug script to verify API configuration in built frontend files

set -e

echo "🔍 Debugging API Configuration in Frontend Build..."

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[DEBUG]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if frontend container exists
if ! docker images | grep -q "codiesvibe-frontend"; then
    print_error "Frontend image not found. Please run: docker-compose -f docker-compose.production.yml build frontend"
    exit 1
fi

# Create temporary container to inspect build files
print_status "Creating temporary container to inspect build files..."
TEMP_CONTAINER=$(docker create codiesvibe-frontend:latest)

# Extract built JavaScript files
print_status "Extracting built files..."
mkdir -p /tmp/codiesvibe-debug
docker cp $TEMP_CONTAINER:/usr/share/nginx/html /tmp/codiesvibe-debug/

# Clean up temporary container
docker rm $TEMP_CONTAINER

# Search for API URLs in built files
print_status "Searching for API configurations in built files..."

echo "=== Searching for 'localhost' references ==="
if grep -r "localhost" /tmp/codiesvibe-debug/html/ 2>/dev/null; then
    print_error "Found localhost references in built files!"
else
    print_success "No localhost references found"
fi

echo "=== Searching for API URL configurations ==="
if grep -r "/api" /tmp/codiesvibe-debug/html/ 2>/dev/null; then
    print_success "Found /api references in built files"
else
    print_error "No /api references found in built files"
fi

echo "=== Searching for 4000 port references ==="
if grep -r "4000" /tmp/codiesvibe-debug/html/ 2>/dev/null; then
    print_error "Found port 4000 references in built files!"
else
    print_success "No port 4000 references found"
fi

echo "=== Environment variable patterns ==="
grep -r "VITE_API" /tmp/codiesvibe-debug/html/ 2>/dev/null || echo "No VITE_API references (expected - they should be replaced)"

echo "=== Index.html content preview ==="
head -20 /tmp/codiesvibe-debug/html/index.html

echo "=== Built JavaScript file analysis ==="
JS_FILE=$(find /tmp/codiesvibe-debug/html/assets -name "*.js" | head -1)
if [ -f "$JS_FILE" ]; then
    echo "Analyzing: $JS_FILE"
    echo "File size: $(du -h "$JS_FILE" | cut -f1)"

    # Look for baseURL configuration
    if grep -o "baseURL[^,}]*" "$JS_FILE" 2>/dev/null; then
        print_success "Found baseURL configuration in built file"
    else
        print_error "No baseURL configuration found"
    fi
else
    print_error "No JavaScript files found in build"
fi

# Test with temporary container
print_status "Testing API configuration with temporary container..."
TEMP_CONTAINER=$(docker run -d -p 3001:80 codiesvibe-frontend:latest)
sleep 2

# Test if the frontend loads
if curl -f http://localhost:3001/ >/dev/null 2>&1; then
    print_success "Frontend container is serving content on port 3001"

    # Download and check the main JS file for API configuration
    MAIN_JS=$(curl -s http://localhost:3001/ | grep -o 'assets/[^"]*\.js' | head -1)
    if [ -n "$MAIN_JS" ]; then
        print_status "Downloading main JavaScript file: $MAIN_JS"
        curl -s "http://localhost:3001/$MAIN_JS" > /tmp/main.js

        if grep -q "/api" /tmp/main.js; then
            print_success "✅ API configuration correctly embedded as '/api'"
        else
            print_error "❌ API configuration not found or incorrect"
        fi

        if grep -q "localhost" /tmp/main.js; then
            print_error "❌ Found localhost references in production build"
        else
            print_success "✅ No localhost references in production build"
        fi
    fi
else
    print_error "Frontend container failed to serve content"
fi

# Cleanup
docker stop $TEMP_CONTAINER >/dev/null 2>&1
docker rm $TEMP_CONTAINER >/dev/null 2>&1
rm -rf /tmp/codiesvibe-debug
rm -f /tmp/main.js

print_status "Debug completed!"