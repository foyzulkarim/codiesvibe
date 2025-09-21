const http = require('http');

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 4000,
  path: '/health',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, (res) => {
  console.log(`Backend health check: ${res.statusCode === 200 ? 'HEALTHY' : 'UNHEALTHY'} (status: ${res.statusCode})`);
  process.exit(res.statusCode === 200 ? 0 : 1);
});

req.on('error', (err) => {
  console.log(`Backend health check: UNHEALTHY (error: ${err.message})`);
  process.exit(1);
});

req.end();