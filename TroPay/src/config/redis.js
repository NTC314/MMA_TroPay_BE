const redis = require('redis');
const logger = require('../utils/logger');

const client = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: 0
});

client.on('connect', () => {
  logger.info('Redis client connected');
});

client.on('error', (err) => {
  logger.error('Redis client error:', err);
});

// Connect to Redis
client.connect().catch((err) => {
  logger.error('Failed to connect to Redis:', err);
});

module.exports = client;