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

# Extract built files
print_status "Extracting built files..."
TEMP_DIR=$(mktemp -d) || { print_error "Failed to create temporary directory"; exit 1; }
docker cp $TEMP_CONTAINER:/usr/share/nginx/html "$TEMP_DIR/"

# Clean up temporary container
docker rm $TEMP_CONTAINER

# Search for API URLs in built files
print_status "Searching for API configurations in built files..."

echo "=== Searching for 'localhost' references ==="
if grep -r "localhost" "$TEMP_DIR/html/" 2>/dev/null; then
    print_error "Found localhost references in built files!"
else
    print_success "No localhost references found"
fi

echo "=== Searching for API URL configurations ==="
if grep -r "/api" "$TEMP_DIR/html/" 2>/dev/null; then
    print_success "Found /api references in built files"
else
    print_error "No /api references found in built files"
fi

echo "=== Searching for 4000 port references ==="
if grep -r "4000" "$TEMP_DIR/html/" 2>/dev/null; then
    print_error "Found port 4000 references in built files!"
else
    print_success "No port 4000 references found"
fi

echo "=== Environment variable patterns ==="
grep -r "VITE_API" "$TEMP_DIR/html/" 2>/dev/null || echo "No VITE_API references (expected - they should be replaced)"

echo "=== Index.html content preview ==="
head -20 "$TEMP_DIR/html/index.html"

echo "=== Built JavaScript file analysis ==="
JS_FILE=$(find "$TEMP_DIR/html/assets" -name "*.js" | head -1)
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

# Test with temporary container - find available port
print_status "Testing API configuration with temporary container..."
TEST_PORT=3001
while netstat -ln 2>/dev/null | grep -q ":$TEST_PORT "; do
    TEST_PORT=$((TEST_PORT + 1))
done
TEMP_CONTAINER=$(docker run -d -p $TEST_PORT:80 codiesvibe-frontend:latest)
sleep 2

# Test if the frontend loads
if curl -f http://localhost:$TEST_PORT/ >/dev/null 2>&1; then
    print_success "Frontend container is serving content on port $TEST_PORT"

    # Download and check the main JS file for API configuration
    MAIN_JS=$(curl -s http://localhost:$TEST_PORT/ | grep -o 'assets/[^"]*\.js' | head -1)
    if [ -n "$MAIN_JS" ]; then
        print_status "Downloading main JavaScript file: $MAIN_JS"
        curl -s "http://localhost:$TEST_PORT/$MAIN_JS" > "$TEMP_DIR/main.js"

        if grep -q "/api" "$TEMP_DIR/main.js"; then
            print_success "✅ API configuration correctly embedded as '/api'"
        else
            print_error "❌ API configuration not found or incorrect"
        fi

        if grep -q "localhost" "$TEMP_DIR/main.js"; then
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
rm -rf "$TEMP_DIR"

print_status "Debug completed!"