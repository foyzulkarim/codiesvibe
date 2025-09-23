export default () => ({
  port: parseInt(process.env.PORT || '4000', 10),
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/nestjs-api',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackUrl:
      process.env.GITHUB_CALLBACK_URL ||
      'http://localhost:4000/api/auth/github/callback',
  },
  throttle: {
    ttl: 60000, // 1 minute
    limit: 100, // 100 requests per minute per user
  },
});
