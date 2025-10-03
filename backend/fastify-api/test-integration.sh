#!/bin/bash
# test-integration.sh - Comprehensive Integration Testing Script for Fastify API

echo "🧪 Testing Fastify API Integration..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
FASTIFY_URL="http://localhost:4002"
NESTJS_URL="http://localhost:4001"
MCP_URL="http://localhost:3001"
OLLAMA_URL="http://localhost:11434"

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Test function
test_endpoint() {
    local name="$1"
    local method="$2"
    local url="$3"
    local data="$4"
    local expected_status="$5"
    local timeout="${6:-30}"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "\n${YELLOW}[$TOTAL_TESTS] Testing: $name${NC}"
    echo -e "${BLUE}   URL: $method $url${NC}"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "%{http_code}" -m "$timeout" -X GET "$url" \
            -H "Accept: application/json" \
            -H "User-Agent: Integration-Test/1.0")
    else
        response=$(curl -s -w "%{http_code}" -m "$timeout" -X POST "$url" \
            -H "Content-Type: application/json" \
            -H "Accept: application/json" \
            -H "User-Agent: Integration-Test/1.0" \
            -d "$data")
    fi
    
    status_code="${response: -3}"
    body="${response%???}"
    
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}   ✅ PASS${NC} - Status: $status_code"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        
        # Pretty print JSON if possible
        if echo "$body" | jq '.' >/dev/null 2>&1; then
            echo -e "${CYAN}   Response:${NC}"
            echo "$body" | jq '.' | head -10
            if [ $(echo "$body" | jq '.' | wc -l) -gt 10 ]; then
                echo "   ... (truncated)"
            fi
        else
            echo -e "${CYAN}   Response: $body${NC}"
        fi
    else
        echo -e "${RED}   ❌ FAIL${NC} - Expected: $expected_status, Got: $status_code"
        echo -e "${RED}   Response: $body${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# Check if services are running
check_service() {
    local name="$1"
    local url="$2"
    
    echo -e "\n${PURPLE}🔍 Checking $name service...${NC}"
    
    if curl -s -f -m 5 "$url" >/dev/null 2>&1; then
        echo -e "${GREEN}   ✅ $name is running${NC}"
        return 0
    else
        echo -e "${RED}   ❌ $name is not accessible at $url${NC}"
        return 1
    fi
}

# Wait for service to be ready
wait_for_service() {
    local name="$1"
    local url="$2"
    local max_attempts="${3:-30}"
    local attempt=1
    
    echo -e "\n${YELLOW}⏳ Waiting for $name to be ready...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f -m 2 "$url" >/dev/null 2>&1; then
            echo -e "${GREEN}   ✅ $name is ready (attempt $attempt)${NC}"
            return 0
        fi
        
        echo -e "${YELLOW}   ⏳ Attempt $attempt/$max_attempts - waiting...${NC}"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}   ❌ $name failed to become ready after $max_attempts attempts${NC}"
    return 1
}

# Performance test
performance_test() {
    local name="$1"
    local url="$2"
    local data="$3"
    
    echo -e "\n${PURPLE}⚡ Performance Test: $name${NC}"
    
    # Measure response time
    if [ -n "$data" ]; then
        time_total=$(curl -w "%{time_total}" -s -o /dev/null -X POST "$url" \
            -H "Content-Type: application/json" \
            -H "Accept: application/json" \
            -d "$data")
    else
        time_total=$(curl -w "%{time_total}" -s -o /dev/null -X GET "$url" \
            -H "Accept: application/json")
    fi
    
    # Convert to milliseconds
    time_ms=$(echo "$time_total * 1000" | bc -l | cut -d. -f1)
    
    if [ "$time_ms" -lt 1000 ]; then
        echo -e "${GREEN}   ✅ Fast response: ${time_ms}ms${NC}"
    elif [ "$time_ms" -lt 5000 ]; then
        echo -e "${YELLOW}   ⚠️  Moderate response: ${time_ms}ms${NC}"
    else
        echo -e "${RED}   ❌ Slow response: ${time_ms}ms${NC}"
    fi
}

# Main test execution
main() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                 Fastify API Integration Tests                ║"
    echo "║                                                              ║"
    echo "║  This script tests the complete integration between:         ║"
    echo "║  • Fastify API (Port 4002)                                   ║"
    echo "║  • NestJS API (Port 4001)                                    ║"
    echo "║  • MongoDB MCP Server (Port 3001)                           ║"
    echo "║  • Ollama LLM Server (Port 11434)                           ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    # Pre-flight checks
    echo -e "\n${PURPLE}🚀 Pre-flight Service Checks${NC}"
    
    services_ok=true
    
    if ! check_service "Fastify API" "$FASTIFY_URL/health"; then
        services_ok=false
    fi
    
    if ! check_service "NestJS API" "$NESTJS_URL/health"; then
        services_ok=false
    fi
    
    if ! check_service "MongoDB MCP" "$MCP_URL/health"; then
        echo -e "${YELLOW}   ⚠️  MCP Server check failed, will test anyway${NC}"
    fi
    
    if ! check_service "Ollama" "$OLLAMA_URL/api/tags"; then
        echo -e "${YELLOW}   ⚠️  Ollama check failed, will test anyway${NC}"
    fi
    
    if [ "$services_ok" = false ]; then
        echo -e "\n${RED}❌ Some critical services are not running!${NC}"
        echo -e "${YELLOW}Please ensure all services are started before running tests.${NC}"
        echo -e "\nTo start services:"
        echo -e "  ${CYAN}cd backend/fastify-api && npm run dev${NC}"
        echo -e "  ${CYAN}cd backend/nestjs-api && npm run start:dev${NC}"
        exit 1
    fi
    
    # Wait for services to be fully ready
    wait_for_service "Fastify API" "$FASTIFY_URL/health" 10
    wait_for_service "NestJS API" "$NESTJS_URL/health" 10
    
    echo -e "\n${PURPLE}🧪 Starting Integration Tests${NC}"
    
    # === HEALTH CHECK TESTS ===
    echo -e "\n${CYAN}═══ Health Check Tests ═══${NC}"
    
    test_endpoint "Fastify Health Check" "GET" "$FASTIFY_URL/health" "" "200" 5
    test_endpoint "NestJS Health Check" "GET" "$NESTJS_URL/health" "" "200" 5
    test_endpoint "NestJS AI Health Check" "GET" "$NESTJS_URL/ai/health" "" "200" 10
    
    # === SERVICE INFO TESTS ===
    echo -e "\n${CYAN}═══ Service Info Tests ═══${NC}"
    
    test_endpoint "Fastify Service Info" "GET" "$FASTIFY_URL/info" "" "200" 5
    
    # === TOOL ENDPOINT TESTS ===
    echo -e "\n${CYAN}═══ Tool Endpoint Tests ═══${NC}"
    
    test_endpoint "Get Fastify Tools" "GET" "$FASTIFY_URL/api/tools" "" "200" 10
    test_endpoint "Get NestJS AI Tools" "GET" "$NESTJS_URL/ai/tools" "" "200" 10
    
    # === SIMPLE QUERY TESTS ===
    echo -e "\n${CYAN}═══ Simple Query Tests ═══${NC}"
    
    test_endpoint "Simple Fastify Query" "POST" "$FASTIFY_URL/api/query" \
        '{"query": "Hello, how are you?"}' "200" 15
    
    test_endpoint "Simple NestJS AI Query" "POST" "$NESTJS_URL/ai/query" \
        '{"query": "Hello, how are you?"}' "200" 15
    
    test_endpoint "Greeting Query" "POST" "$FASTIFY_URL/api/query" \
        '{"query": "What can you help me with?"}' "200" 15
    
    # === DATABASE QUERY TESTS ===
    echo -e "\n${CYAN}═══ Database Query Tests ═══${NC}"
    
    test_endpoint "List Collections Query" "POST" "$FASTIFY_URL/api/query" \
        '{"query": "Show me all collections in the database"}' "200" 30
    
    test_endpoint "Database Schema Query" "POST" "$FASTIFY_URL/api/query" \
        '{"query": "What collections exist and what are their schemas?"}' "200" 30
    
    test_endpoint "Count Documents Query" "POST" "$FASTIFY_URL/api/query" \
        '{"query": "Count total documents in each collection"}' "200" 30
    
    # === COMPLEX QUERY TESTS ===
    echo -e "\n${CYAN}═══ Complex Query Tests ═══${NC}"
    
    test_endpoint "Data Analysis Query" "POST" "$FASTIFY_URL/api/query" \
        '{"query": "Find all users created in the last 7 days"}' "200" 45
    
    test_endpoint "Aggregation Query" "POST" "$FASTIFY_URL/api/query" \
        '{"query": "Group users by registration date and show counts"}' "200" 45
    
    # === ERROR HANDLING TESTS ===
    echo -e "\n${CYAN}═══ Error Handling Tests ═══${NC}"
    
    test_endpoint "Invalid Query Format" "POST" "$FASTIFY_URL/api/query" \
        '{"invalid": "data"}' "400" 5
    
    test_endpoint "Empty Query" "POST" "$FASTIFY_URL/api/query" \
        '{"query": ""}' "400" 5
    
    test_endpoint "Missing Query Field" "POST" "$FASTIFY_URL/api/query" \
        '{}' "400" 5
    
    test_endpoint "Invalid JSON" "POST" "$FASTIFY_URL/api/query" \
        '{invalid json}' "400" 5
    
    test_endpoint "Non-existent Endpoint" "GET" "$FASTIFY_URL/api/nonexistent" \
        "" "404" 5
    
    # === PERFORMANCE TESTS ===
    echo -e "\n${CYAN}═══ Performance Tests ═══${NC}"
    
    performance_test "Health Check Performance" "$FASTIFY_URL/health"
    performance_test "Simple Query Performance" "$FASTIFY_URL/api/query" \
        '{"query": "Hello"}'
    performance_test "Tools Endpoint Performance" "$FASTIFY_URL/api/tools"
    
    # === CONCURRENT REQUEST TESTS ===
    echo -e "\n${CYAN}═══ Concurrent Request Tests ═══${NC}"
    
    echo -e "\n${YELLOW}Testing concurrent requests...${NC}"
    
    # Create temporary files for concurrent test results
    temp_dir=$(mktemp -d)
    
    # Launch 5 concurrent requests
    for i in {1..5}; do
        (
            response=$(curl -s -w "%{http_code}" -X POST "$FASTIFY_URL/api/query" \
                -H "Content-Type: application/json" \
                -H "Accept: application/json" \
                -d "{\"query\": \"Test concurrent request $i\"}")
            
            status_code="${response: -3}"
            echo "$i:$status_code" > "$temp_dir/result_$i"
        ) &
    done
    
    # Wait for all background jobs to complete
    wait
    
    # Check results
    concurrent_success=0
    for i in {1..5}; do
        if [ -f "$temp_dir/result_$i" ]; then
            result=$(cat "$temp_dir/result_$i")
            status_code="${result#*:}"
            if [ "$status_code" = "200" ]; then
                concurrent_success=$((concurrent_success + 1))
            fi
        fi
    done
    
    # Clean up
    rm -rf "$temp_dir"
    
    if [ $concurrent_success -eq 5 ]; then
        echo -e "${GREEN}   ✅ All 5 concurrent requests succeeded${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}   ❌ Only $concurrent_success/5 concurrent requests succeeded${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    # === TEST SUMMARY ===
    echo -e "\n${CYAN}╔══════════════════════════════════════════════════════════════╗"
    echo -e "║                        TEST SUMMARY                          ║"
    echo -e "╚══════════════════════════════════════════════════════════════╝${NC}"
    
    echo -e "\n${BLUE}📊 Test Results:${NC}"
    echo -e "   Total Tests: $TOTAL_TESTS"
    echo -e "   ${GREEN}Passed: $PASSED_TESTS${NC}"
    echo -e "   ${RED}Failed: $FAILED_TESTS${NC}"
    
    success_rate=$(echo "scale=1; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc -l)
    echo -e "   Success Rate: ${success_rate}%"
    
    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "\n${GREEN}🎉 ALL TESTS PASSED! Integration is working perfectly.${NC}"
        exit 0
    elif [ $FAILED_TESTS -lt 3 ]; then
        echo -e "\n${YELLOW}⚠️  Some tests failed, but core functionality is working.${NC}"
        echo -e "${YELLOW}   Please review the failed tests above.${NC}"
        exit 1
    else
        echo -e "\n${RED}❌ Multiple tests failed. Please check your service configuration.${NC}"
        echo -e "\n${YELLOW}Troubleshooting steps:${NC}"
        echo -e "1. Ensure all services are running:"
        echo -e "   • MongoDB MCP Server: $MCP_URL/health"
        echo -e "   • Ollama: $OLLAMA_URL/api/tags"
        echo -e "   • Fastify API: $FASTIFY_URL/health"
        echo -e "   • NestJS API: $NESTJS_URL/health"
        echo -e "2. Check service logs for errors"
        echo -e "3. Verify environment variables are set correctly"
        echo -e "4. Ensure network connectivity between services"
        exit 2
    fi
}

# Handle script interruption
trap 'echo -e "\n${RED}❌ Tests interrupted by user${NC}"; exit 130' INT TERM

# Check dependencies
if ! command -v curl >/dev/null 2>&1; then
    echo -e "${RED}❌ curl is required but not installed${NC}"
    exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  jq is not installed - JSON output will not be formatted${NC}"
fi

if ! command -v bc >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  bc is not installed - performance timing will be skipped${NC}"
fi

# Run main test suite
main "$@"