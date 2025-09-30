const winston = require('winston');
const config = require('../config');

// Custom format for structured logging
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, service, requestId, userId, ...meta }) => {
    const logEntry = {
      timestamp,
      level,
      service: service || config.serviceName,
      message,
      ...(requestId && { requestId }),
      ...(userId && { userId }),
      ...meta
    };
    
    return JSON.stringify(logEntry);
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { 
    service: config.serviceName,
    version: process.env.SERVICE_VERSION || '1.0.0',
    environment: config.env
  },
  transports: []
});

// Console transport for development
if (config.env !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
      winston.format.printf(({ timestamp, level, message, service, requestId }) => {
        const prefix = requestId ? `[${requestId}]` : '';
        return `${timestamp} ${level} [${service}] ${prefix} ${message}`;
      })
    )
  }));
}

// File transports for production
if (config.env === 'production') {
  logger.add(new winston.transports.File({
    filename: '/var/log/app/error.log',
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }));
  
  logger.add(new winston.transports.File({
    filename: '/var/log/app/combined.log',
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }));
}

// CloudWatch transport for AWS
if (process.env.AWS_CLOUDWATCH_LOG_GROUP) {
  const CloudWatchTransport = require('winston-cloudwatch');
  
  logger.add(new CloudWatchTransport({
    logGroupName: process.env.AWS_CLOUDWATCH_LOG_GROUP,
    logStreamName: `${config.serviceName}-${process.env.HOSTNAME || 'local'}`,
    awsRegion: config.aws.region,
    messageFormatter: ({ level, message, additionalInfo }) => {
      return `[${level}] ${message} ${JSON.stringify(additionalInfo)}`;
    }
  }));
}

// Helper methods for structured logging
logger.logRequest = (req, message = 'Request processed') => {
  logger.info(message, {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    requestId: req.id,
    userId: req.user?.id
  });
};

logger.logError = (error, req = null, additionalInfo = {}) => {
  const errorInfo = {
    error: error.message,
    stack: error.stack,
    ...additionalInfo
  };
  
  if (req) {
    errorInfo.method = req.method;
    errorInfo.url = req.url;
    errorInfo.requestId = req.id;
    errorInfo.userId = req.user?.id;
  }
  
  logger.error('Error occurred', errorInfo);
};

logger.logPerformance = (operation, duration, additionalInfo = {}) => {
  logger.info('Performance metric', {
    operation,
    duration: `${duration}ms`,
    ...additionalInfo
  });
};

module.exports = logger;