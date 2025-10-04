const { createClient } = require('redis');

class RedisClient {
  constructor() {
    this.client = null;
    this.connected = false;
  }

  async connect() {
    if (!process.env.REDIS_URL) {
      console.log('Redis URL not provided, skipping Redis connection');
      return;
    }

    try {
      this.client = createClient({
        url: process.env.REDIS_URL,
        socket: {
          connectTimeout: 5000,
          lazyConnect: true,
        }
      });

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
        this.connected = false;
      });

      this.client.on('connect', () => {
        console.log('✅ Redis connected');
        this.connected = true;
      });

      await this.client.connect();
    } catch (error) {
      console.error('Redis connection failed:', error);
      this.client = null;
      this.connected = false;
    }
  }

  async get(key) {
    if (!this.client || !this.connected) return null;
    try {
      return await this.client.get(key);
    } catch (error) {
      console.error('Redis GET error:', error);
      return null;
    }
  }

  async set(key, value, ttl = 3600) {
    if (!this.client || !this.connected) return null;
    try {
      return await this.client.setEx(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error('Redis SET error:', error);
      return null;
    }
  }

  async del(key) {
    if (!this.client || !this.connected) return null;
    try {
      return await this.client.del(key);
    } catch (error) {
      console.error('Redis DEL error:', error);
      return null;
    }
  }

  async ping() {
    if (!this.client || !this.connected) return false;
    try {
      await this.client.ping();
      return true;
    } catch (error) {
      return false;
    }
  }

  getClient() {
    return this.client;
  }

  isConnected() {
    return this.connected;
  }

  async close() {
    if (this.client) {
      try {
        await this.client.quit();
      } catch (error) {
        console.error('Redis close error:', error);
      }
    }
  }
}

module.exports = new RedisClient();