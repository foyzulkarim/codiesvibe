/**
 * HTTP Client Configuration
 * Optimizes HTTP/HTTPS connection pooling for external API calls
 */

import axios from 'axios';
import http from 'http';
import https from 'https';

/**
 * HTTP/HTTPS Agent Configuration
 * These agents manage connection pooling for outgoing HTTP requests
 */

// HTTP Agent (for non-SSL connections)
const httpAgent = new http.Agent({
  keepAlive: true, // Keep connections alive for reuse
  keepAliveMsecs: 30000, // Send keep-alive probes every 30 seconds
  maxSockets: 50, // Max concurrent sockets per host
  maxFreeSockets: 10, // Max idle sockets per host
  timeout: 60000, // Socket timeout (60 seconds)
  scheduling: 'fifo', // First-in-first-out scheduling
});

// HTTPS Agent (for SSL connections)
const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000,
  scheduling: 'fifo',
  // SSL/TLS options
  rejectUnauthorized: true, // Validate SSL certificates in production
});

/**
 * Configure axios defaults with optimized connection pooling
 */
export function configureHttpClient(): void {
  // Set default HTTP agents for axios
  axios.defaults.httpAgent = httpAgent;
  axios.defaults.httpsAgent = httpsAgent;

  // Set default timeout
  axios.defaults.timeout = 30000; // 30 seconds

  // Set default headers
  axios.defaults.headers.common['User-Agent'] = 'SearchAPI/1.0';

  console.log('✅ HTTP client configured with connection pooling:', {
    keepAlive: true,
    maxSockets: 50,
    maxFreeSockets: 10,
    timeout: '30s',
  });
}

/**
 * Get HTTP agent statistics
 * Note: Node.js http.Agent doesn't expose detailed statistics
 * These are the configured limits, not actual usage
 */
export function getHttpAgentStats() {
  return {
    http: {
      maxSockets: httpAgent.maxSockets,
      maxFreeSockets: httpAgent.maxFreeSockets,
      keepAlive: true,
      timeout: '60s',
    },
    https: {
      maxSockets: httpsAgent.maxSockets,
      maxFreeSockets: httpsAgent.maxFreeSockets,
      keepAlive: true,
      timeout: '60s',
    },
  };
}

/**
 * Destroy all agents and close connections
 * Call this during graceful shutdown
 */
export function destroyHttpAgents(): void {
  httpAgent.destroy();
  httpsAgent.destroy();
  console.log('✅ HTTP agents destroyed, all connections closed');
}
