const redis = require('redis');

const getRedisConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  
  const configs = {
    development: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          return new Error('Redis server connection refused');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          return new Error('Redis retry time exhausted');
        }
        return Math.min(options.attempt * 100, 3000);
      }
    },
    
    production: {
      url: process.env.ELASTICACHE_ENDPOINT || process.env.REDIS_URL,
      tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
      retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          return new Error('Redis server connection refused');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          return new Error('Redis retry time exhausted');
        }
        return Math.min(options.attempt * 100, 3000);
      }
    }
  };

  return configs[env];
};

const createRedisClient = () => {
  const config = getRedisConfig();
  return redis.createClient(config);
};

module.exports = {
  getRedisConfig,
  createRedisClient
};