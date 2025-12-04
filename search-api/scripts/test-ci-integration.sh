#!/bin/bash
# Local CI Integration Test
# Simulates the GitHub Actions integration test environment
# Run this before pushing to catch CI failures early

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Portable timeout function (macOS doesn't have timeout)
wait_for_url() {
    local url=$1
    local max_seconds=$2
    local elapsed=0

    while [ $elapsed -lt $max_seconds ]; do
        if curl -sf "$url" > /dev/null 2>&1; then
            return 0
        fi
        sleep 2
        elapsed=$((elapsed + 2))
    done
    return 1
}

echo -e "${YELLOW}=== Local CI Integration Test ===${NC}"
echo "This simulates the GitHub Actions integration test environment"
echo ""

# Container names
MONGODB_CONTAINER="ci-test-mongodb"
QDRANT_CONTAINER="ci-test-qdrant"
SEARCH_API_CONTAINER="ci-test-search-api"
SEARCH_API_IMAGE="ci-test-search-api:local"

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}Cleaning up containers...${NC}"
    docker stop $SEARCH_API_CONTAINER $MONGODB_CONTAINER $QDRANT_CONTAINER 2>/dev/null || true
    docker rm $SEARCH_API_CONTAINER $MONGODB_CONTAINER $QDRANT_CONTAINER 2>/dev/null || true
}

# Set trap to cleanup on exit
trap cleanup EXIT

# Check Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running${NC}"
    exit 1
fi

echo -e "${GREEN}Step 1/5: Starting MongoDB...${NC}"
docker run -d --name $MONGODB_CONTAINER \
    -p 27017:27017 \
    -e MONGO_INITDB_ROOT_USERNAME=admin \
    -e MONGO_INITDB_ROOT_PASSWORD=password123 \
    -e MONGO_INITDB_DATABASE=codiesvibe \
    mongo:7.0

echo -e "${GREEN}Step 2/5: Starting Qdrant...${NC}"
docker run -d --name $QDRANT_CONTAINER \
    -p 6333:6333 \
    -p 6334:6334 \
    qdrant/qdrant:latest

echo "Waiting for services to be ready..."
sleep 5

# Wait for Qdrant
echo "Checking Qdrant..."
if wait_for_url "http://localhost:6333/readyz" 60; then
    echo -e "${GREEN}Qdrant is ready${NC}"
else
    echo -e "${RED}Qdrant failed to start${NC}"
    exit 1
fi

echo -e "${GREEN}Step 3/5: Building search-api Docker image...${NC}"
cd "$PROJECT_ROOT"
docker build -f Dockerfile.search-api --target production -t $SEARCH_API_IMAGE . || {
    echo -e "${RED}Docker build failed${NC}"
    exit 1
}

echo -e "${GREEN}Step 4/5: Starting search-api container...${NC}"
# These env vars match .github/workflows/search-api-ci-cd.yml
docker run -d --name $SEARCH_API_CONTAINER \
    -p 4003:4003 \
    -e NODE_ENV=test \
    -e JWT_SECRET=test-secret \
    -e PORT=4003 \
    -e "MONGODB_URI=mongodb://admin:password123@host.docker.internal:27017/codiesvibe?authSource=admin" \
    -e TOGETHER_API_KEY=test-api-key-for-ci \
    -e QDRANT_HOST=host.docker.internal \
    -e QDRANT_PORT=6333 \
    -e VLLM_BASE_URL=http://localhost:8000 \
    -e ENABLE_CACHE=false \
    -e ENABLE_VECTOR_VALIDATION=false \
    -e ENABLE_RATE_LIMITING=false \
    -e ENABLE_SECURITY_HEADERS=false \
    -e CLERK_SECRET_KEY=sk_test_fake_key_for_ci \
    $SEARCH_API_IMAGE

echo "Waiting for search-api to start..."
sleep 5

# Show logs for debugging
echo -e "${YELLOW}=== Container logs ===${NC}"
docker logs $SEARCH_API_CONTAINER

echo -e "${GREEN}Step 5/5: Testing health endpoint...${NC}"
if wait_for_url "http://localhost:4003/health" 120; then
    echo -e "${GREEN}Health check passed${NC}"
else
    echo -e "${RED}Health check failed${NC}"
    echo -e "${YELLOW}=== Final container logs ===${NC}"
    docker logs $SEARCH_API_CONTAINER
    exit 1
fi

echo ""
echo -e "${GREEN}=== Health Check Response ===${NC}"
curl -s http://localhost:4003/health | jq . || curl -s http://localhost:4003/health

echo ""
echo -e "${GREEN}=== CI Integration Test PASSED ===${NC}"
echo "The search-api container started successfully with CI environment variables."
echo ""
echo "Cleanup will run automatically..."
