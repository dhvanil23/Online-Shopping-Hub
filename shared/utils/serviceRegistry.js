const logger = require('./logger');

class ServiceRegistry {
  constructor() {
    this.services = new Map();
    this.consul = null;
    if (process.env.DISABLE_CONSUL !== 'true') {
      try {
        this.consul = require('consul')();
      } catch (error) {
        logger.warn('Consul not available, using local registry');
      }
    }
  }

  async register(serviceName, serviceId, host, port, healthCheck) {
    if (process.env.DISABLE_CONSUL === 'true' || !this.consul) {
      this.services.set(serviceId, { serviceName, host, port });
      logger.info(`Local service registered: ${serviceName} (${serviceId})`);
      return;
    }
    
    try {
      const service = {
        id: serviceId,
        name: serviceName,
        address: host,
        port: port,
        check: {
          http: `http://${host}:${port}${healthCheck}`,
          interval: '10s',
          timeout: '5s'
        }
      };

      await this.consul.agent.service.register(service);
      this.services.set(serviceId, service);
      logger.info(`Service registered: ${serviceName} (${serviceId})`);
    } catch (error) {
      logger.error('Service registration failed:', error);
    }
  }

  async deregister(serviceId) {
    if (process.env.DISABLE_CONSUL === 'true' || !this.consul) {
      this.services.delete(serviceId);
      logger.info(`Local service deregistered: ${serviceId}`);
      return;
    }
    
    try {
      await this.consul.agent.service.deregister(serviceId);
      this.services.delete(serviceId);
      logger.info(`Service deregistered: ${serviceId}`);
    } catch (error) {
      logger.error('Service deregistration failed:', error);
    }
  }

  async discover(serviceName) {
    if (process.env.DISABLE_CONSUL === 'true' || !this.consul) {
      return Array.from(this.services.values())
        .filter(s => s.serviceName === serviceName)
        .map(s => ({ address: s.host, port: s.port }));
    }
    
    try {
      const services = await this.consul.health.service(serviceName);
      return services[0]?.filter(s => s.Checks.every(c => c.Status === 'passing'))
        .map(s => ({
          id: s.Service.ID,
          address: s.Service.Address,
          port: s.Service.Port
        }));
    } catch (error) {
      logger.error('Service discovery failed:', error);
      return [];
    }
  }

  async getHealthyService(serviceName) {
    const services = await this.discover(serviceName);
    if (services.length === 0) {
      throw new Error(`No healthy instances of ${serviceName} found`);
    }
    // Simple round-robin
    return services[Math.floor(Math.random() * services.length)];
  }
}

module.exports = new ServiceRegistry();