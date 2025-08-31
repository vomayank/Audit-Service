export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  api: {
    version: process.env.API_VERSION || 'v1',
    prefix: process.env.API_PREFIX || '/api',
  },
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/audit_db',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  },
  queue: {
    name: process.env.QUEUE_NAME || 'audit-queue',
    concurrency: parseInt(process.env.QUEUE_CONCURRENCY, 10) || 5,
    maxRetries: parseInt(process.env.QUEUE_MAX_RETRIES, 10) || 3,
  },
});