#!/bin/bash

# ============================================================================
# Search API - Health Check Verification Script
# ============================================================================
# This script performs comprehensive health checks on the deployed API
#
# Usage:
#   ./scripts/verify-health.sh [api_url]
#
# Arguments:
#   api_url - Optional: API base URL (default: http://localhost:4003)
#
# Examples:
#   ./scripts/verify-health.sh
#   ./scripts/verify-health.sh http://production-api.com:4003
#   ./scripts/verify-health.sh https://api.example.com
# ============================================================================

set -e # Exit on error

# ============================================================================
# Configuration
# ============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# API URL
API_URL="${1:-http://localhost:4003}"

# Test counters
TESTS_TOTAL=0
TESTS_PASSED=0
TESTS_FAILED=0

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

run_test() {
    local test_name="$1"
    local expected="$2"
    local actual="$3"

    TESTS_TOTAL=$((TESTS_TOTAL + 1))

    if [ "$expected" = "$actual" ]; then
        log_success "$test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        log_error "$test_name (expected: $expected, got: $actual)"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# ============================================================================
# Health Check Tests
# ============================================================================

test_basic_health() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}1. Basic Health Check${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    local response=$(curl -s -w "\n%{http_code}" "$API_URL/health")
    local http_code=$(echo "$response" | tail -n 1)
    local body=$(echo "$response" | sed '$d')

    run_test "HTTP status code is 200" "200" "$http_code"

    if [ "$http_code" = "200" ]; then
        local status=$(echo "$body" | grep -o '"status":"[^"]*"' | cut -d'"' -f4 || echo "")
        run_test "Health status is 'healthy'" "healthy" "$status"

        local has_timestamp=$(echo "$body" | grep -c "timestamp" || echo "0")
        run_test "Response includes timestamp" "1" "$has_timestamp"

        echo ""
        log_info "Response: $body"
    fi
}

test_liveness_probe() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}2. Liveness Probe${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    local start_time=$(date +%s%3N)
    local response=$(curl -s -w "\n%{http_code}" "$API_URL/health/live")
    local end_time=$(date +%s%3N)
    local duration=$((end_time - start_time))

    local http_code=$(echo "$response" | tail -n 1)
    local body=$(echo "$response" | sed '$d')

    run_test "HTTP status code is 200" "200" "$http_code"

    # Liveness should be very fast (< 100ms)
    if [ "$duration" -lt 100 ]; then
        log_success "Response time is < 100ms ($duration ms)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        log_warning "Response time is ${duration}ms (expected < 100ms)"
    fi
    TESTS_TOTAL=$((TESTS_TOTAL + 1))

    if [ "$http_code" = "200" ]; then
        local status=$(echo "$body" | grep -o '"status":"[^"]*"' | cut -d'"' -f4 || echo "")
        run_test "Liveness status is 'alive'" "alive" "$status"

        echo ""
        log_info "Response: $body"
        log_info "Response time: ${duration}ms"
    fi
}

test_readiness_probe() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}3. Readiness Probe${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    local start_time=$(date +%s%3N)
    local response=$(curl -s -w "\n%{http_code}" "$API_URL/health/ready")
    local end_time=$(date +%s%3N)
    local duration=$((end_time - start_time))

    local http_code=$(echo "$response" | tail -n 1)
    local body=$(echo "$response" | sed '$d')

    # Readiness can be 200 (ready) or 503 (not ready)
    if [ "$http_code" = "200" ]; then
        log_success "HTTP status code is 200 (ready)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    elif [ "$http_code" = "503" ]; then
        log_warning "HTTP status code is 503 (not ready - degraded state)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        log_error "HTTP status code is $http_code (expected 200 or 503)"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    TESTS_TOTAL=$((TESTS_TOTAL + 1))

    # Readiness should be reasonably fast (< 500ms)
    if [ "$duration" -lt 500 ]; then
        log_success "Response time is < 500ms ($duration ms)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        log_warning "Response time is ${duration}ms (expected < 500ms)"
    fi
    TESTS_TOTAL=$((TESTS_TOTAL + 1))

    if [ "$http_code" = "200" ] || [ "$http_code" = "503" ]; then
        local has_checks=$(echo "$body" | grep -c "checks" || echo "0")
        run_test "Response includes dependency checks" "1" "$has_checks"

        echo ""
        log_info "Response: $body"
        log_info "Response time: ${duration}ms"

        # Parse dependency statuses
        echo ""
        log_info "Dependency Status:"
        echo "$body" | grep -o '"mongodb":{[^}]*}' || echo "  MongoDB: N/A"
        echo "$body" | grep -o '"qdrant":{[^}]*}' || echo "  Qdrant: N/A"
    fi
}

test_circuit_breakers() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}4. Circuit Breakers${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    local response=$(curl -s -w "\n%{http_code}" "$API_URL/health/circuit-breakers")
    local http_code=$(echo "$response" | tail -n 1)
    local body=$(echo "$response" | sed '$d')

    # Circuit breaker endpoint should return 200 (healthy) or 503 (degraded)
    if [ "$http_code" = "200" ]; then
        log_success "HTTP status code is 200 (all circuits closed)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    elif [ "$http_code" = "503" ]; then
        log_warning "HTTP status code is 503 (some circuits open)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        log_error "HTTP status code is $http_code (expected 200 or 503)"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    TESTS_TOTAL=$((TESTS_TOTAL + 1))

    if [ "$http_code" = "200" ] || [ "$http_code" = "503" ]; then
        echo ""
        log_info "Response: $body"

        # Count circuit breakers
        local breaker_count=$(echo "$body" | grep -o '"name":"[^"]*"' | wc -l || echo "0")
        log_info "Circuit breakers configured: $breaker_count"
    fi
}

test_metrics_endpoint() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}5. Prometheus Metrics${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    local response=$(curl -s -w "\n%{http_code}" "$API_URL/metrics")
    local http_code=$(echo "$response" | tail -n 1)
    local body=$(echo "$response" | sed '$d')

    run_test "HTTP status code is 200" "200" "$http_code"

    if [ "$http_code" = "200" ]; then
        # Check for key metrics
        local has_http_metrics=$(echo "$body" | grep -c "http_request_duration_seconds" || echo "0")
        run_test "Includes HTTP request duration metrics" "1" "$has_http_metrics"

        local has_search_metrics=$(echo "$body" | grep -c "search_" || echo "0")
        if [ "$has_search_metrics" -gt 0 ]; then
            log_success "Includes search-specific metrics"
            TESTS_PASSED=$((TESTS_PASSED + 1))
        else
            log_info "No search metrics yet (may not have processed searches)"
        fi
        TESTS_TOTAL=$((TESTS_TOTAL + 1))

        local has_cache_metrics=$(echo "$body" | grep -c "cache_" || echo "0")
        if [ "$has_cache_metrics" -gt 0 ]; then
            log_success "Includes cache metrics"
            TESTS_PASSED=$((TESTS_PASSED + 1))
        else
            log_info "No cache metrics yet"
        fi
        TESTS_TOTAL=$((TESTS_TOTAL + 1))

        # Count total metrics
        local metric_count=$(echo "$body" | grep -c "^# HELP" || echo "0")
        log_info "Total metrics exposed: $metric_count"
    fi
}

test_api_documentation() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}6. API Documentation${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    # Check if Swagger UI is available
    local response=$(curl -s -w "\n%{http_code}" "$API_URL/api-docs/")
    local http_code=$(echo "$response" | tail -n 1)

    run_test "Swagger UI is accessible" "200" "$http_code"

    # Check if OpenAPI spec is available
    local spec_response=$(curl -s -w "\n%{http_code}" "$API_URL/api-docs/openapi.json")
    local spec_http_code=$(echo "$spec_response" | tail -n 1)
    local spec_body=$(echo "$spec_response" | sed '$d')

    run_test "OpenAPI spec is accessible" "200" "$spec_http_code"

    if [ "$spec_http_code" = "200" ]; then
        local has_paths=$(echo "$spec_body" | grep -c '"paths"' || echo "0")
        run_test "OpenAPI spec includes paths" "1" "$has_paths"

        local endpoint_count=$(echo "$spec_body" | grep -o '"/[^"]*":' | wc -l || echo "0")
        log_info "Documented endpoints: $endpoint_count"
    fi
}

test_search_endpoint() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}7. Search Endpoint (Basic)${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    log_info "Testing search endpoint with a simple query..."

    local start_time=$(date +%s%3N)
    local response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/search" \
        -H "Content-Type: application/json" \
        -d '{"query": "test", "limit": 5}')
    local end_time=$(date +%s%3N)
    local duration=$((end_time - start_time))

    local http_code=$(echo "$response" | tail -n 1)
    local body=$(echo "$response" | sed '$d')

    # Search should return 200 (or 408 if timeout, or 429 if rate limited)
    if [ "$http_code" = "200" ]; then
        log_success "HTTP status code is 200 (search successful)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    elif [ "$http_code" = "408" ]; then
        log_warning "HTTP status code is 408 (request timeout)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    elif [ "$http_code" = "429" ]; then
        log_warning "HTTP status code is 429 (rate limited)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        log_error "HTTP status code is $http_code (expected 200, 408, or 429)"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    TESTS_TOTAL=$((TESTS_TOTAL + 1))

    log_info "Search response time: ${duration}ms"

    if [ "$http_code" = "200" ]; then
        local has_candidates=$(echo "$body" | grep -c "candidates" || echo "0")
        run_test "Response includes candidates" "1" "$has_candidates"
    fi
}

test_security_headers() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}8. Security Headers${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    local headers=$(curl -s -I "$API_URL/health")

    # Check for security headers (Helmet)
    if echo "$headers" | grep -qi "X-Content-Type-Options"; then
        log_success "X-Content-Type-Options header present"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        log_warning "X-Content-Type-Options header missing"
    fi
    TESTS_TOTAL=$((TESTS_TOTAL + 1))

    if echo "$headers" | grep -qi "X-Frame-Options"; then
        log_success "X-Frame-Options header present"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        log_warning "X-Frame-Options header missing"
    fi
    TESTS_TOTAL=$((TESTS_TOTAL + 1))

    if echo "$headers" | grep -qi "Strict-Transport-Security"; then
        log_success "Strict-Transport-Security header present"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        log_info "Strict-Transport-Security header not present (normal for HTTP)"
    fi
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
}

# ============================================================================
# Summary
# ============================================================================

show_summary() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}HEALTH CHECK SUMMARY${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "  API URL:      $API_URL"
    echo "  Total Tests:  $TESTS_TOTAL"
    echo "  Passed:       $TESTS_PASSED ✓"
    echo "  Failed:       $TESTS_FAILED ✗"
    echo ""

    local success_rate=0
    if [ "$TESTS_TOTAL" -gt 0 ]; then
        success_rate=$((TESTS_PASSED * 100 / TESTS_TOTAL))
    fi

    if [ "$success_rate" -ge 90 ]; then
        log_success "Success Rate: ${success_rate}% - Excellent!"
    elif [ "$success_rate" -ge 75 ]; then
        log_warning "Success Rate: ${success_rate}% - Good (some warnings)"
    else
        log_error "Success Rate: ${success_rate}% - Needs attention"
    fi

    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    # Exit code based on success
    if [ "$TESTS_FAILED" -eq 0 ]; then
        exit 0
    else
        exit 1
    fi
}

# ============================================================================
# Main Execution
# ============================================================================

main() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}SEARCH API - HEALTH CHECK VERIFICATION${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "  API URL: $API_URL"
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    # Run all tests
    test_basic_health
    test_liveness_probe
    test_readiness_probe
    test_circuit_breakers
    test_metrics_endpoint
    test_api_documentation
    test_search_endpoint
    test_security_headers

    # Show summary
    show_summary
}

# Run main function
main
