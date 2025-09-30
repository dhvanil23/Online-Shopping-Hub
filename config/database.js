const { Sequelize } = require('sequelize');

const getDatabaseConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  
  const configs = {
    development: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'ecommerce_db',
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      dialect: 'postgres',
      logging: false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    },
    
    production: {
      host: process.env.RDS_HOSTNAME || process.env.DB_HOST,
      port: process.env.RDS_PORT || process.env.DB_PORT || 5432,
      database: process.env.RDS_DB_NAME || process.env.DB_NAME,
      username: process.env.RDS_USERNAME || process.env.DB_USER,
      password: process.env.RDS_PASSWORD || process.env.DB_PASSWORD,
      dialect: 'postgres',
      logging: false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      },
      pool: {
        max: 20,
        min: 5,
        acquire: 60000,
        idle: 10000
      }
    }
  };

  return configs[env];
};

const createSequelizeInstance = () => {
  const config = getDatabaseConfig();
  
  return new Sequelize(
    config.database,
    config.username,
    config.password,
    {
      host: config.host,
      port: config.port,
      dialect: config.dialect,
      logging: config.logging,
      dialectOptions: config.dialectOptions,
      pool: config.pool,
      retry: {
        match: [
          /ETIMEDOUT/,
          /EHOSTUNREACH/,
          /ECONNRESET/,
          /ECONNREFUSED/,
          /ETIMEDOUT/,
          /ESOCKETTIMEDOUT/,
          /EHOSTUNREACH/,
          /EPIPE/,
          /EAI_AGAIN/,
          /SequelizeConnectionError/,
          /SequelizeConnectionRefusedError/,
          /SequelizeHostNotFoundError/,
          /SequelizeHostNotReachableError/,
          /SequelizeInvalidConnectionError/,
          /SequelizeConnectionTimedOutError/
        ],
        max: 3
      }
    }
  );
};

module.exports = {
  getDatabaseConfig,
  createSequelizeInstance
};