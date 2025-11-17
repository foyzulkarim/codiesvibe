/**
 * k6 Load Test Script
 * Baseline load test for Search API
 *
 * Installation:
 * - macOS: brew install k6
 * - Linux: sudo gpg -k && sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69 && echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list && sudo apt-get update && sudo apt-get install k6
 * - Windows: choco install k6
 *
 * Run test:
 * k6 run test/load/k6-load-test.js
 *
 * Run with options:
 * k6 run --vus 100 --duration 5m test/load/k6-load-test.js
 *
 * Generate HTML report:
 * k6 run --out json=report.json test/load/k6-load-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const searchDuration = new Trend('search_duration');
const searchSuccess = new Counter('search_success');
const searchFailure = new Counter('search_failure');

// Test configuration
export const options = {
  // Stages (phases)
  stages: [
    { duration: '1m', target: 10 },   // Warm-up: ramp up to 10 users
    { duration: '5m', target: 100 },  // Baseline: maintain 100 users
    { duration: '1m', target: 10 },   // Cool-down: ramp down to 10 users
  ],

  // Thresholds (SLA requirements)
  thresholds: {
    // HTTP request duration
    http_req_duration: ['p(95)<2000', 'p(99)<5000'], // 95% < 2s, 99% < 5s

    // HTTP request failed
    http_req_failed: ['rate<0.01'], // Error rate < 1%

    // Custom metrics
    errors: ['rate<0.01'],
    search_duration: ['p(95)<2000'],
  },

  // Global settings
  noConnectionReuse: false,
  userAgent: 'k6-load-test/1.0',
};

// Base URL
const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:4003';

// Test data
const searchQueries = [
  'AI tools for coding',
  'machine learning platforms',
  'chatgpt alternatives',
  'data analysis tools',
  'project management software',
  'code review tools',
  'API testing tools',
  'CI/CD platforms',
  'cloud infrastructure',
  'database management systems',
  'AI image generators',
  'video editing software',
  'design tools',
  'collaboration platforms',
  'automation tools',
  'monitoring solutions',
  'security tools',
  'DevOps platforms',
  'no-code platforms',
  'analytics tools',
];

/**
 * Get random search query
 */
function getRandomQuery() {
  return searchQueries[Math.floor(Math.random() * searchQueries.length)];
}

/**
 * Get random limit
 */
function getRandomLimit() {
  return Math.floor(Math.random() * 20) + 1;
}

/**
 * Generate correlation ID
 */
function generateCorrelationId() {
  return `k6-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Main test scenario
 */
export default function () {
  // Decide which endpoint to test (weighted random)
  const random = Math.random();

  if (random < 0.78) {
    // 78%: Search endpoint
    testSearchEndpoint();
  } else if (random < 0.88) {
    // 10%: Health check
    testHealthEndpoint();
  } else if (random < 0.93) {
    // 5%: Liveness probe
    testLivenessEndpoint();
  } else if (random < 0.98) {
    // 5%: Readiness probe
    testReadinessEndpoint();
  } else {
    // 2%: Metrics endpoint
    testMetricsEndpoint();
  }

  // Sleep between requests (simulate real user behavior)
  sleep(Math.random() * 3 + 1); // 1-4 seconds
}

/**
 * Test search endpoint
 */
function testSearchEndpoint() {
  const correlationId = generateCorrelationId();
  const payload = JSON.stringify({
    query: getRandomQuery(),
    limit: getRandomLimit(),
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'X-Correlation-ID': correlationId,
    },
    timeout: '65s',
  };

  const start = Date.now();
  const response = http.post(`${BASE_URL}/search`, payload, params);
  const duration = Date.now() - start;

  // Record custom metrics
  searchDuration.add(duration);

  // Check response
  const success = check(response, {
    'search: status is 200': (r) => r.status === 200,
    'search: has query': (r) => r.json('query') !== undefined,
    'search: has candidates': (r) => r.json('candidates') !== undefined,
    'search: has correlation ID': (r) => r.headers['X-Correlation-Id'] === correlationId || r.headers['x-correlation-id'] === correlationId,
    'search: response time < 60s': (r) => r.timings.duration < 60000,
  });

  if (success) {
    searchSuccess.add(1);
  } else {
    searchFailure.add(1);
    errorRate.add(1);
  }

  // Allow 429 (rate limit) and 408 (timeout) as acceptable under load
  if (![200, 408, 429].includes(response.status)) {
    errorRate.add(1);
  }
}

/**
 * Test health endpoint
 */
function testHealthEndpoint() {
  const response = http.get(`${BASE_URL}/health`);

  check(response, {
    'health: status is 200': (r) => r.status === 200,
    'health: has status': (r) => r.json('status') !== undefined,
    'health: response time < 1s': (r) => r.timings.duration < 1000,
  });

  if (response.status !== 200) {
    errorRate.add(1);
  }
}

/**
 * Test liveness endpoint
 */
function testLivenessEndpoint() {
  const response = http.get(`${BASE_URL}/health/live`);

  check(response, {
    'liveness: status is 200': (r) => r.status === 200,
    'liveness: has status': (r) => r.json('status') !== undefined,
    'liveness: response time < 500ms': (r) => r.timings.duration < 500,
  });

  if (response.status !== 200) {
    errorRate.add(1);
  }
}

/**
 * Test readiness endpoint
 */
function testReadinessEndpoint() {
  const response = http.get(`${BASE_URL}/health/ready`);

  check(response, {
    'readiness: status is 200 or 503': (r) => r.status === 200 || r.status === 503,
    'readiness: has status': (r) => r.json('status') !== undefined,
    'readiness: has checks': (r) => r.json('checks') !== undefined,
  });

  // 503 is acceptable for readiness (degraded state)
  if (![200, 503].includes(response.status)) {
    errorRate.add(1);
  }
}

/**
 * Test metrics endpoint
 */
function testMetricsEndpoint() {
  const response = http.get(`${BASE_URL}/metrics`);

  check(response, {
    'metrics: status is 200': (r) => r.status === 200,
    'metrics: content-type is text/plain': (r) => r.headers['Content-Type'].includes('text/plain'),
    'metrics: contains HELP': (r) => r.body.includes('# HELP'),
  });

  if (response.status !== 200) {
    errorRate.add(1);
  }
}

/**
 * Setup function (runs once at the start)
 */
export function setup() {
  console.log(`🧪 Starting k6 load test against ${BASE_URL}`);
  console.log('📊 Test will run for ~7 minutes');
  console.log('🎯 Target: 100 concurrent users');

  // Test that API is available
  const response = http.get(`${BASE_URL}/health`);
  if (response.status !== 200) {
    throw new Error(`API is not available at ${BASE_URL}`);
  }

  console.log('✅ API is available, starting test...');
}

/**
 * Teardown function (runs once at the end)
 */
export function teardown(data) {
  console.log('✅ k6 load test completed');
}

/**
 * Handle summary (custom summary output)
 */
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'summary.json': JSON.stringify(data),
  };
}

/**
 * Text summary helper
 */
function textSummary(data, options = {}) {
  const indent = options.indent || '';
  const enableColors = options.enableColors !== false;

  let output = '\n';
  output += `${indent}✅ k6 Load Test Summary\n`;
  output += `${indent}=======================\n\n`;

  // HTTP requests
  output += `${indent}HTTP Requests:\n`;
  output += `${indent}  Total: ${data.metrics.http_reqs.values.count}\n`;
  output += `${indent}  Failed: ${data.metrics.http_req_failed.values.passes} (${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%)\n\n`;

  // Response times
  output += `${indent}Response Times:\n`;
  output += `${indent}  Min: ${data.metrics.http_req_duration.values.min.toFixed(2)}ms\n`;
  output += `${indent}  Avg: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  output += `${indent}  Med: ${data.metrics.http_req_duration.values.med.toFixed(2)}ms\n`;
  output += `${indent}  P95: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  output += `${indent}  P99: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n`;
  output += `${indent}  Max: ${data.metrics.http_req_duration.values.max.toFixed(2)}ms\n\n`;

  // Search metrics
  if (data.metrics.search_duration) {
    output += `${indent}Search Endpoint:\n`;
    output += `${indent}  Success: ${data.metrics.search_success.values.count}\n`;
    output += `${indent}  Failure: ${data.metrics.search_failure.values.count}\n`;
    output += `${indent}  Avg Duration: ${data.metrics.search_duration.values.avg.toFixed(2)}ms\n`;
    output += `${indent}  P95 Duration: ${data.metrics.search_duration.values['p(95)'].toFixed(2)}ms\n\n`;
  }

  return output;
}
