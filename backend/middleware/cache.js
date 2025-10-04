const redis = require('../config/redis');

const cache = (duration = 300) => {
  return async (req, res, next) => {
    if (req.method !== 'GET' || !redis.isConnected()) {
      return next();
    }

    const key = `cache:${req.originalUrl}`;
    
    try {
      const cached = await redis.get(key);
      if (cached) {
        return res.json(JSON.parse(cached));
      }

      const originalSend = res.json;
      res.json = function(data) {
        if (res.statusCode === 200) {
          redis.set(key, data, duration);
        }
        originalSend.call(this, data);
      };

      next();
    } catch (error) {
      next();
    }
  };
};

const invalidateCache = (pattern) => {
  return async (req, res, next) => {
    if (redis.isConnected()) {
      try {
        const keys = await redis.getClient().keys(pattern);
        if (keys.length > 0) {
          await redis.getClient().del(keys);
        }
      } catch (error) {
        console.error('Cache invalidation error:', error);
      }
    }
    next();
  };
};

module.exports = { cache, invalidateCache };