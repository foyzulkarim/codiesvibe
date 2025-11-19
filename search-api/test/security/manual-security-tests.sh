#!/bin/bash

# Manual Security Tests Script
# Run these tests against a local or test environment
# DO NOT run against production!

set -e

BASE_URL="${API_BASE_URL:-http://localhost:4003}"

echo "🔒 Running Security Tests against $BASE_URL"
echo "================================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_TOTAL=0
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run test
run_test() {
    local test_name="$1"
    local expected="$2"
    local actual="$3"

    TESTS_TOTAL=$((TESTS_TOTAL + 1))

    if [ "$expected" = "$actual" ]; then
        echo -e "${GREEN}✓${NC} $test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗${NC} $test_name"
        echo "  Expected: $expected"
        echo "  Actual: $actual"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

echo "1. Testing NoSQL Injection Protection"
echo "--------------------------------------"

# Test 1.1: $where injection attempt
response=$(curl -s -w "%{http_code}" -o /dev/null -X POST "$BASE_URL/search" \
  -H "Content-Type: application/json" \
  -d '{"query": "test", "$where": "1 == 1"}')
run_test "NoSQL \$where injection blocked" "200" "$response"

# Test 1.2: $ne operator injection
response=$(curl -s -w "%{http_code}" -o /dev/null -X POST "$BASE_URL/search" \
  -H "Content-Type: application/json" \
  -d '{"query": {"$ne": null}}')
run_test "NoSQL \$ne injection blocked" "400" "$response"

echo ""
echo "2. Testing XSS Protection"
echo "-------------------------"

# Test 2.1: Script tag in query
response=$(curl -s -w "%{http_code}" -o /dev/null -X POST "$BASE_URL/search" \
  -H "Content-Type: application/json" \
  -d '{"query": "<script>alert(1)</script>"}')
run_test "XSS script tag blocked" "400" "$response"

# Test 2.2: Event handler injection
response=$(curl -s -w "%{http_code}" -o /dev/null -X POST "$BASE_URL/search" \
  -H "Content-Type: application/json" \
  -d '{"query": "<img src=x onerror=alert(1)>"}')
run_test "XSS event handler blocked" "400" "$response"

echo ""
echo "3. Testing Input Validation"
echo "---------------------------"

# Test 3.1: Empty query
response=$(curl -s -w "%{http_code}" -o /dev/null -X POST "$BASE_URL/search" \
  -H "Content-Type: application/json" \
  -d '{"query": ""}')
run_test "Empty query rejected" "400" "$response"

# Test 3.2: Query too long
long_query=$(printf 'a%.0s' {1..1001})
response=$(curl -s -w "%{http_code}" -o /dev/null -X POST "$BASE_URL/search" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"$long_query\"}")
run_test "Too long query rejected" "400" "$response"

# Test 3.3: Invalid limit (too low)
response=$(curl -s -w "%{http_code}" -o /dev/null -X POST "$BASE_URL/search" \
  -H "Content-Type: application/json" \
  -d '{"query": "test", "limit": 0}')
run_test "Invalid limit (0) rejected" "400" "$response"

# Test 3.4: Invalid limit (too high)
response=$(curl -s -w "%{http_code}" -o /dev/null -X POST "$BASE_URL/search" \
  -H "Content-Type: application/json" \
  -d '{"query": "test", "limit": 101}')
run_test "Invalid limit (101) rejected" "400" "$response"

echo ""
echo "4. Testing Security Headers"
echo "---------------------------"

# Test 4.1: X-Content-Type-Options header
header=$(curl -s -I "$BASE_URL/health" | grep -i "x-content-type-options" || echo "missing")
if [[ $header == *"nosniff"* ]]; then
    run_test "X-Content-Type-Options header present" "present" "present"
else
    run_test "X-Content-Type-Options header present" "present" "missing"
fi

# Test 4.2: X-Frame-Options header
header=$(curl -s -I "$BASE_URL/health" | grep -i "x-frame-options" || echo "missing")
if [[ $header != "missing" ]]; then
    run_test "X-Frame-Options header present" "present" "present"
else
    run_test "X-Frame-Options header present" "present" "missing"
fi

echo ""
echo "5. Testing CORS"
echo "---------------"

# Test 5.1: CORS headers present
header=$(curl -s -I -H "Origin: http://localhost:3000" "$BASE_URL/health" | grep -i "access-control-allow-origin" || echo "missing")
if [[ $header != "missing" ]]; then
    run_test "CORS headers present for allowed origin" "present" "present"
else
    run_test "CORS headers present for allowed origin" "present" "missing"
fi

echo ""
echo "6. Testing Error Handling"
echo "-------------------------"

# Test 6.1: Malformed JSON
response=$(curl -s -w "%{http_code}" -o /dev/null -X POST "$BASE_URL/search" \
  -H "Content-Type: application/json" \
  -d '{ invalid json }')
run_test "Malformed JSON rejected" "400" "$response"

# Test 6.2: Non-existent endpoint
response=$(curl -s -w "%{http_code}" -o /dev/null "$BASE_URL/non-existent")
run_test "Non-existent endpoint returns 404" "404" "$response"

echo ""
echo "7. Testing Command Injection Protection"
echo "---------------------------------------"

# Test 7.1: Shell command injection
response=$(curl -s -w "%{http_code}" -o /dev/null -X POST "$BASE_URL/search" \
  -H "Content-Type: application/json" \
  -d '{"query": "; ls -la"}')
run_test "Shell command injection blocked" "400" "$response"

# Test 7.2: Piped commands
response=$(curl -s -w "%{http_code}" -o /dev/null -X POST "$BASE_URL/search" \
  -H "Content-Type: application/json" \
  -d '{"query": "test | cat /etc/passwd"}')
run_test "Piped command injection blocked" "400" "$response"

echo ""
echo "8. Testing Valid Requests"
echo "-------------------------"

# Test 8.1: Valid search request
response=$(curl -s -w "%{http_code}" -o /dev/null -X POST "$BASE_URL/search" \
  -H "Content-Type: application/json" \
  -d '{"query": "AI tools"}')
run_test "Valid search request succeeds" "200" "$response"

# Test 8.2: Health check
response=$(curl -s -w "%{http_code}" -o /dev/null "$BASE_URL/health")
run_test "Health check succeeds" "200" "$response"

echo ""
echo "================================================"
echo "Security Test Summary"
echo "================================================"
echo "Total Tests: $TESTS_TOTAL"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
if [ $TESTS_FAILED -gt 0 ]; then
    echo -e "${RED}Failed: $TESTS_FAILED${NC}"
else
    echo -e "Failed: $TESTS_FAILED"
fi
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All security tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some security tests failed. Please review and fix.${NC}"
    exit 1
fi
