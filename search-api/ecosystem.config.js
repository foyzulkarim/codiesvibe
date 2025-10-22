module.exports = {
  apps: [
    {
      name: 'search-api',
      script: 'dist/server.js',
      instances: 'max', // Use all available CPU cores
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 4004
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4004,
        LOG_LEVEL: 'warn'
      },
      // Production optimizations
      max_memory_restart: '1G',
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      // Auto restart on file changes (disable in production)
      watch: false,
      // Graceful shutdown
      kill_timeout: 5000,
      // Health monitoring
      min_uptime: '10s',
      max_restarts: 10,
      // Advanced PM2 features
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};