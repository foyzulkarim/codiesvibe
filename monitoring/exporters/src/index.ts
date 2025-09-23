// CodiesVibe Application Metrics Exporter
// Custom Prometheus metrics exporter for application-specific monitoring

import express from 'express';
import { register, collectDefaultMetrics, Gauge, Counter, Histogram } from 'prom-client';
import { MongoClient } from 'mongodb';
import { createClient } from 'redis';
import fetch from 'node-fetch';

// Environment configuration
const config = {
  port: parseInt(process.env.METRICS_PORT || '8080'),
  scrapeInterval: parseInt(process.env.SCRAPE_INTERVAL?.replace('s', '') || '30') * 1000,
  backendUrl: process.env.BACKEND_URL || 'http://backend:4000',
  mongodbUrl: process.env.MONGODB_URL || 'mongodb://admin:password123@mongodb:27017/codiesvibe?authSource=admin',
  redisUrl: process.env.REDIS_URL || 'redis://:redis123@redis:6379',
};

// Initialize Express app
const app = express();

// Collect default Node.js metrics
collectDefaultMetrics({ register });

// Custom metrics
const metrics = {
  // Application metrics
  toolsTotal: new Gauge({
    name: 'codiesvibe_tools_total',
    help: 'Total number of AI tools in the database',
    labelNames: ['category', 'status'],
  }),

  searchRequestsTotal: new Counter({
    name: 'codiesvibe_search_requests_total',
    help: 'Total number of search requests',
    labelNames: ['method', 'status'],
  }),

  searchResponseTime: new Histogram({
    name: 'codiesvibe_search_response_time_seconds',
    help: 'Search response time in seconds',
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 1.5, 2, 3, 5],
  }),

  authAttemptsTotal: new Counter({
    name: 'codiesvibe_auth_attempts_total',
    help: 'Total number of authentication attempts',
    labelNames: ['provider', 'status'],
  }),

  activeSessionsGauge: new Gauge({
    name: 'codiesvibe_active_sessions',
    help: 'Number of active user sessions',
  }),

  // Database metrics
  mongodbConnectionsGauge: new Gauge({
    name: 'codiesvibe_mongodb_connections',
    help: 'Number of MongoDB connections',
    labelNames: ['state'],
  }),

  mongodbOperationsTotal: new Counter({
    name: 'codiesvibe_mongodb_operations_total',
    help: 'Total number of MongoDB operations',
    labelNames: ['operation', 'collection'],
  }),

  mongodbQueryTime: new Histogram({
    name: 'codiesvibe_mongodb_query_time_seconds',
    help: 'MongoDB query execution time',
    labelNames: ['operation', 'collection'],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  }),

  // Redis metrics
  redisConnectionsGauge: new Gauge({
    name: 'codiesvibe_redis_connections',
    help: 'Number of Redis connections',
    labelNames: ['state'],
  }),

  redisCacheHitsTotal: new Counter({
    name: 'codiesvibe_redis_cache_hits_total',
    help: 'Total number of Redis cache hits',
    labelNames: ['key_pattern'],
  }),

  redisCacheMissesTotal: new Counter({
    name: 'codiesvibe_redis_cache_misses_total',
    help: 'Total number of Redis cache misses',
    labelNames: ['key_pattern'],
  }),

  // Business metrics
  userRegistrationsTotal: new Counter({
    name: 'codiesvibe_user_registrations_total',
    help: 'Total number of user registrations',
    labelNames: ['provider'],
  }),

  toolViewsTotal: new Counter({
    name: 'codiesvibe_tool_views_total',
    help: 'Total number of tool profile views',
    labelNames: ['tool_id', 'category'],
  }),

  favoritesTotal: new Counter({
    name: 'codiesvibe_favorites_total',
    help: 'Total number of tools favorited',
    labelNames: ['action'], // 'added' or 'removed'
  }),
};

// Database clients
let mongoClient: MongoClient | null = null;
let redisClient: any = null;

// Initialize database connections
async function initializeConnections() {
  try {
    // MongoDB connection
    mongoClient = new MongoClient(config.mongodbUrl);
    await mongoClient.connect();
    console.log('Connected to MongoDB');

    // Redis connection
    redisClient = createClient({ url: config.redisUrl });
    await redisClient.connect();
    console.log('Connected to Redis');
  } catch (error) {
    console.error('Failed to initialize database connections:', error);
  }
}

// Collect MongoDB metrics
async function collectMongoDBMetrics() {
  if (!mongoClient) return;

  try {
    const db = mongoClient.db('codiesvibe');
    
    // Get server status
    const serverStatus = await db.admin().serverStatus();
    
    // Connection metrics
    metrics.mongodbConnectionsGauge.set({ state: 'current' }, serverStatus.connections?.current || 0);
    metrics.mongodbConnectionsGauge.set({ state: 'available' }, serverStatus.connections?.available || 0);

    // Collection metrics
    const collections = await db.listCollections().toArray();
    for (const collection of collections) {
      const stats = await db.collection(collection.name).stats();
      
      // Document count by collection
      metrics.toolsTotal.set(
        { category: collection.name, status: 'active' },
        stats.count || 0
      );
    }

    // Specific business metrics
    const toolsCollection = db.collection('tools');
    const usersCollection = db.collection('users');

    // Tools by category
    const toolsByCategory = await toolsCollection.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]).toArray();

    for (const category of toolsByCategory) {
      metrics.toolsTotal.set(
        { category: category._id || 'unknown', status: 'active' },
        category.count
      );
    }

    // User count
    const userCount = await usersCollection.countDocuments();
    metrics.activeSessionsGauge.set(userCount);

  } catch (error) {
    console.error('Error collecting MongoDB metrics:', error);
  }
}

// Collect Redis metrics
async function collectRedisMetrics() {
  if (!redisClient) return;

  try {
    const info = await redisClient.info();
    const lines = info.split('\r\n');
    
    // Parse Redis info
    const redisInfo: Record<string, string> = {};
    for (const line of lines) {
      const [key, value] = line.split(':');
      if (key && value) {
        redisInfo[key] = value;
      }
    }

    // Connection metrics
    metrics.redisConnectionsGauge.set(
      { state: 'connected' },
      parseInt(redisInfo.connected_clients || '0')
    );

    // Cache statistics (if available)
    if (redisInfo.keyspace_hits) {
      metrics.redisCacheHitsTotal.inc({ key_pattern: 'all' }, parseInt(redisInfo.keyspace_hits));
    }
    if (redisInfo.keyspace_misses) {
      metrics.redisCacheMissesTotal.inc({ key_pattern: 'all' }, parseInt(redisInfo.keyspace_misses));
    }

  } catch (error) {
    console.error('Error collecting Redis metrics:', error);
  }
}

// Collect application metrics from backend
async function collectApplicationMetrics() {
  try {
    // Check if backend is healthy
    const healthResponse = await fetch(`${config.backendUrl}/health`, {
      timeout: 5000,
    });

    if (healthResponse.ok) {
      // Try to get application metrics from backend
      try {
        const metricsResponse = await fetch(`${config.backendUrl}/metrics`, {
          timeout: 5000,
        });

        if (metricsResponse.ok) {
          const backendMetrics = await metricsResponse.text();
          // Parse and incorporate backend metrics if needed
          console.log('Backend metrics collected');
        }
      } catch (error) {
        // Backend doesn't expose /metrics endpoint, that's okay
        console.log('Backend metrics endpoint not available');
      }
    }

  } catch (error) {
    console.error('Error collecting application metrics:', error);
  }
}

// Collect all metrics
async function collectMetrics() {
  console.log('Collecting metrics...');
  
  await Promise.allSettled([
    collectMongoDBMetrics(),
    collectRedisMetrics(),
    collectApplicationMetrics(),
  ]);
}

// Routes
app.get('/metrics', async (req, res) => {
  try {
    // Collect fresh metrics
    await collectMetrics();
    
    // Return Prometheus metrics
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    console.error('Error generating metrics:', error);
    res.status(500).send('Error generating metrics');
  }
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb: mongoClient ? 'connected' : 'disconnected',
    redis: redisClient ? 'connected' : 'disconnected',
  });
});

// Start server
async function start() {
  try {
    // Initialize database connections
    await initializeConnections();

    // Start periodic metrics collection
    setInterval(collectMetrics, config.scrapeInterval);

    // Start HTTP server
    app.listen(config.port, () => {
      console.log(`CodiesVibe metrics exporter listening on port ${config.port}`);
      console.log(`Metrics endpoint: http://localhost:${config.port}/metrics`);
      console.log(`Health endpoint: http://localhost:${config.port}/health`);
      console.log(`Scrape interval: ${config.scrapeInterval}ms`);
    });

  } catch (error) {
    console.error('Failed to start metrics exporter:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  
  if (mongoClient) {
    await mongoClient.close();
  }
  
  if (redisClient) {
    await redisClient.quit();
  }
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  
  if (mongoClient) {
    await mongoClient.close();
  }
  
  if (redisClient) {
    await redisClient.quit();
  }
  
  process.exit(0);
});

// Start the application
start();