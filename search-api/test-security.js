/**
 * Security test script for the /search endpoint
 * This script tests various security enhancements we've implemented
 */

const axios = require('axios');

const API_URL = 'http://localhost:4003';

async function testSecurity() {
  console.log('🔒 Testing Search API Security Enhancements\n');

  const tests = [
    {
      name: 'Valid query',
      payload: { query: 'react components', limit: 5, debug: false },
      expectedStatus: 200
    },
    {
      name: 'Empty query',
      payload: { query: '', limit: 5, debug: false },
      expectedStatus: 400
    },
    {
      name: 'Missing query',
      payload: { limit: 5, debug: false },
      expectedStatus: 400
    },
    {
      name: 'Invalid limit (too high)',
      payload: { query: 'react', limit: 150, debug: false },
      expectedStatus: 400
    },
    {
      name: 'Invalid limit (negative)',
      payload: { query: 'react', limit: -1, debug: false },
      expectedStatus: 400
    },
    {
      name: 'Invalid debug type',
      payload: { query: 'react', limit: 5, debug: 'true' },
      expectedStatus: 400
    },
    {
      name: 'XSS attempt',
      payload: { query: '<script>alert("xss")</script>', limit: 5, debug: false },
      expectedStatus: 400
    },
    {
      name: 'JavaScript protocol',
      payload: { query: 'javascript:alert("xss")', limit: 5, debug: false },
      expectedStatus: 400
    },
    {
      name: 'Event handler attempt',
      payload: { query: '<img src=x onerror=alert("xss")>', limit: 5, debug: false },
      expectedStatus: 400
    },
    {
      name: 'SQL injection attempt',
      payload: { query: 'DROP TABLE users', limit: 5, debug: false },
      expectedStatus: 400
    },
    {
      name: 'Command injection attempt',
      payload: { query: 'rm -rf /', limit: 5, debug: false },
      expectedStatus: 400
    },
    {
      name: 'Very long query',
      payload: { query: 'a'.repeat(1001), limit: 5, debug: false },
      expectedStatus: 400
    },
    {
      name: 'Control characters',
      payload: { query: 'test\x00\x01\x02', limit: 5, debug: false },
      expectedStatus: 200 // Should be sanitized
    },
    {
      name: 'HTML brackets attempt',
      payload: { query: 'test<script>alert("xss")</script>', limit: 5, debug: false },
      expectedStatus: 400
    },
    {
      name: 'Curly braces attempt',
      payload: { query: 'test{malicious}', limit: 5, debug: false },
      expectedStatus: 400
    },
    {
      name: 'Square brackets attempt',
      payload: { query: 'test[malicious]', limit: 5, debug: false },
      expectedStatus: 400
    },
    {
      name: 'Backslash attempt',
      payload: { query: 'test\\malicious', limit: 5, debug: false },
      expectedStatus: 400
    },
    {
      name: 'JSON injection attempt',
      payload: { query: '{"test": "malicious"}', limit: 5, debug: false },
      expectedStatus: 400
    },
    {
      name: 'NoSQL injection attempt ($where)',
      payload: { query: 'test$where: "this.test == \\"malicious\\""', limit: 5, debug: false },
      expectedStatus: 200 // Should be sanitized by mongo-sanitize
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`🧪 Testing: ${test.name}`);

      const response = await axios.post(`${API_URL}/search`, test.payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        validateStatus: () => true // Don't throw on error status codes
      });

      if (response.status === test.expectedStatus) {
        console.log(`   ✅ PASSED (Status: ${response.status})`);
        passed++;
      } else {
        console.log(`   ❌ FAILED (Expected: ${test.expectedStatus}, Got: ${response.status})`);
        console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
        failed++;
      }

      // Check security headers (provided by Helmet)
      if (response.status === 200) {
        const securityHeaders = [
          'x-content-type-options',
          'x-frame-options',
          'x-xss-protection',
          'referrer-policy',
          'content-security-policy',
          'x-dns-prefetch-control',
          'strict-transport-security'
        ];

        const missingHeaders = securityHeaders.filter(header => !response.headers[header]);
        if (missingHeaders.length > 0) {
          console.log(`   ⚠️  Missing security headers: ${missingHeaders.join(', ')}`);
        } else {
          console.log(`   ✅ All security headers present (Helmet)`);
        }

        // Check rate limiting headers
        if (response.headers['x-ratelimit-limit'] && response.headers['x-ratelimit-window']) {
          console.log(`   ✅ Rate limiting headers present`);
        } else {
          console.log(`   ⚠️  Missing rate limiting headers`);
        }
      }

    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
      failed++;
    }

    console.log(''); // Empty line for readability
  }

  console.log(`📊 Test Results:`);
  console.log(`   Passed: ${passed}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Total: ${passed + failed}`);

  if (failed === 0) {
    console.log('\n🎉 All security tests passed!');
  } else {
    console.log(`\n⚠️  ${failed} test(s) failed. Please review the implementation.`);
  }
}

// Rate limiting test
async function testRateLimit() {
  console.log('\n🚦 Testing Rate Limiting...\n');

  const query = { query: 'test', limit: 5, debug: false };
  let requestCount = 0;

  try {
    // Send requests rapidly to test rate limiting
    for (let i = 0; i < 35; i++) {
      const response = await axios.post(`${API_URL}/search`, query, {
        headers: { 'Content-Type': 'application/json' },
        validateStatus: () => true
      });

      requestCount++;

      if (response.status === 429) {
        console.log(`   ✅ Search rate limiting activated after ${requestCount} requests`);
        console.log(`   Response: ${response.data.error}`);
        console.log(`   Code: ${response.data.code}`);

        // Check for proper rate limiting headers
        if (response.headers['ratelimit-limit'] && response.headers['ratelimit-remaining']) {
          console.log(`   ✅ Rate limiting headers present:`);
          console.log(`      - RateLimit-Limit: ${response.headers['ratelimit-limit']}`);
          console.log(`      - RateLimit-Remaining: ${response.headers['ratelimit-remaining']}`);
          console.log(`      - RateLimit-Reset: ${response.headers['ratelimit-reset']}`);
        } else {
          console.log(`   ⚠️  Rate limiting headers missing`);
        }

        return;
      }
    }

    console.log(`   ⚠️  Rate limiting did not activate after ${requestCount} requests`);

  } catch (error) {
    console.log(`   ❌ Rate limiting test failed: ${error.message}`);
  }
}

// Test security headers
async function testSecurityHeaders() {
  console.log('\n🛡️ Testing Security Headers...\n');

  try {
    const response = await axios.post(`${API_URL}/search`,
      { query: 'test', limit: 5, debug: false },
      {
        headers: { 'Content-Type': 'application/json' },
        validateStatus: () => true
      }
    );

    if (response.status === 200) {
      const securityHeaders = [
        'x-content-type-options',
        'x-frame-options',
        'x-xss-protection',
        'referrer-policy',
        'content-security-policy',
        'x-dns-prefetch-control',
        'strict-transport-security',
        'access-control-allow-origin'
      ];

      const presentHeaders = [];
      const missingHeaders = [];

      securityHeaders.forEach(header => {
        if (response.headers[header]) {
          presentHeaders.push(`${header}: ${response.headers[header]}`);
        } else {
          missingHeaders.push(header);
        }
      });

      console.log(`   ✅ Security headers present (${presentHeaders.length}/${securityHeaders.length}):`);
      presentHeaders.forEach(header => console.log(`      - ${header}`));

      if (missingHeaders.length > 0) {
        console.log(`   ⚠️  Missing security headers: ${missingHeaders.join(', ')}`);
      }
    }

  } catch (error) {
    console.log(`   ❌ Security headers test failed: ${error.message}`);
  }
}

// Run tests if server is available
async function main() {
  try {
    // Check if server is running
    await axios.get(`${API_URL}/health`);
    console.log('✅ Server is running\n');

    await testSecurity();
    await testRateLimit();
    await testSecurityHeaders();
    await testCORSConfiguration();

  } catch (error) {
    console.log('❌ Server is not running. Please start the server first:');
    console.log('   npm run dev');
    console.log('   or');
    console.log('   npm start');
    process.exit(1);
  }
}

// Test CORS configuration
async function testCORSConfiguration() {
  console.log('\n🌐 Testing CORS Configuration...\n');

  try {
    // Test preflight request
    const preflightResponse = await axios.options(`${API_URL}/search`, {
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      },
      validateStatus: () => true
    });

    console.log(`   Preflight request status: ${preflightResponse.status}`);

    const corsHeaders = [
      'access-control-allow-origin',
      'access-control-allow-methods',
      'access-control-allow-headers',
      'access-control-max-age'
    ];

    const presentCorsHeaders = [];
    const missingCorsHeaders = [];

    corsHeaders.forEach(header => {
      if (preflightResponse.headers[header]) {
        presentCorsHeaders.push(`${header}: ${preflightResponse.headers[header]}`);
      } else {
        missingCorsHeaders.push(header);
      }
    });

    console.log(`   ✅ CORS headers present (${presentCorsHeaders.length}/${corsHeaders.length}):`);
    presentCorsHeaders.forEach(header => console.log(`      - ${header}`));

    if (missingCorsHeaders.length > 0) {
      console.log(`   ⚠️  Missing CORS headers: ${missingCorsHeaders.join(', ')}`);
    }

    // Test actual request with origin
    const requestResponse = await axios.post(`${API_URL}/search`,
      { query: 'test', limit: 5, debug: false },
      {
        headers: {
          'Origin': 'http://localhost:3000',
          'Content-Type': 'application/json'
        },
        validateStatus: () => true
      }
    );

    if (requestResponse.status === 200) {
      console.log(`   ✅ CORS request successful from http://localhost:3000`);
    } else {
      console.log(`   ❌ CORS request failed with status: ${requestResponse.status}`);
    }

    // Test with different origin (should be blocked in production)
    try {
      const blockedResponse = await axios.post(`${API_URL}/search`,
        { query: 'test', limit: 5, debug: false },
        {
          headers: {
            'Origin': 'https://malicious-site.com',
            'Content-Type': 'application/json'
          },
          validateStatus: () => true
        }
      );

      if (blockedResponse.status === 200) {
        console.log(`   ⚠️  Request from https://malicious-site.com was allowed (development mode)`);
      } else {
        console.log(`   ✅ Request from https://malicious-site.com was blocked (production mode)`);
      }
    } catch (error) {
      console.log(`   ✅ Request from https://malicious-site.com was blocked with error: ${error.message}`);
    }

  } catch (error) {
    console.log(`   ❌ CORS test failed: ${error.message}`);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testSecurity, testRateLimit, testCORSConfiguration };