const { Pool } = require('pg');

class Database {
  constructor() {
    const config = process.env.DATABASE_URL ? 
      { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } } :
      {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'ecommerce_db',
        password: process.env.DB_PASSWORD || 'password',
        port: process.env.DB_PORT || 5432,
      };
    
    this.pool = new Pool({
      ...config,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  async query(text, params) {
    try {
      const res = await this.pool.query(text, params);
      return res;
    } catch (error) {
      console.error('DB Error:', error.message);
      throw error;
    }
  }

  async getClient() {
    return this.pool.connect();
  }

  async close() {
    await this.pool.end();
  }
}

module.exports = new Database();