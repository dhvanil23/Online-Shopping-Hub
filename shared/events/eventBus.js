const amqp = require('amqplib');
const { EventEmitter } = require('events');
const logger = require('../utils/logger');

class EventBus extends EventEmitter {
  constructor() {
    super();
    this.connection = null;
    this.channel = null;
    this.exchanges = ['user.events', 'product.events', 'order.events', 'payment.events'];
  }

  async connect() {
    if (process.env.DISABLE_RABBITMQ === 'true') {
      logger.info('EventBus: RabbitMQ disabled, using local events');
      return;
    }
    
    try {
      this.connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
      this.channel = await this.connection.createChannel();
      
      // Create exchanges
      for (const exchange of this.exchanges) {
        await this.channel.assertExchange(exchange, 'topic', { durable: true });
      }
      
      logger.info('EventBus connected to RabbitMQ');
    } catch (error) {
      logger.error('EventBus connection failed:', error);
      throw error;
    }
  }

  async publish(exchange, routingKey, data) {
    if (process.env.DISABLE_RABBITMQ === 'true') {
      this.emit(`${exchange}.${routingKey}`, data);
      logger.info(`Local event published: ${exchange}.${routingKey}`);
      return;
    }
    
    try {
      const message = Buffer.from(JSON.stringify({
        ...data,
        timestamp: new Date().toISOString(),
        id: require('crypto').randomUUID()
      }));
      
      await this.channel.publish(exchange, routingKey, message, { persistent: true });
      logger.info(`Event published: ${exchange}.${routingKey}`);
    } catch (error) {
      logger.error('Event publish failed:', error);
    }
  }

  async subscribe(exchange, routingKey, handler) {
    if (process.env.DISABLE_RABBITMQ === 'true') {
      this.on(`${exchange}.${routingKey}`, handler);
      logger.info(`Local subscription: ${exchange}.${routingKey}`);
      return;
    }
    
    try {
      const queue = await this.channel.assertQueue('', { exclusive: true });
      await this.channel.bindQueue(queue.queue, exchange, routingKey);
      
      await this.channel.consume(queue.queue, async (msg) => {
        if (msg) {
          try {
            const data = JSON.parse(msg.content.toString());
            await handler(data);
            this.channel.ack(msg);
          } catch (error) {
            logger.error('Event handler error:', error);
            this.channel.nack(msg, false, false);
          }
        }
      });
      
      logger.info(`Subscribed to: ${exchange}.${routingKey}`);
    } catch (error) {
      logger.error('Event subscription failed:', error);
    }
  }

  async close() {
    if (this.connection) {
      await this.connection.close();
    }
  }
}

module.exports = new EventBus();