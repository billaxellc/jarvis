const Logger = require('../logger');
const axios = require('axios');

const logger = new Logger('bot-11-api-response-time-monitor');

async function run() {
  try {
    logger.info('Starting API response time monitoring');

    const endpoints = [
      { name: 'bill_upload', url: 'https://billaxe.app/api/bills/upload', method: 'GET' },
      { name: 'bill_retry', url: 'https://billaxe.app/api/bills/list', method: 'GET' },
      { name: 'get_bills', url: 'https://billaxe.app/api/bills', method: 'GET' },
    ];

    const results = {};

    for (const endpoint of endpoints) {
      try {
        const startTime = Date.now();
        const response = await axios({
          method: endpoint.method,
          url: endpoint.url,
          timeout: 10000,
        });
        const responseTime = Date.now() - startTime;

        results[endpoint.name] = {
          status: response.status === 200 ? 'healthy' : 'degraded',
          responseTime,
          statusCode: response.status,
        };

        if (responseTime > 5000) {
          logger.warn(`Slow response from ${endpoint.name}`, { responseTime });
        }
      } catch (err) {
        results[endpoint.name] = {
          status: 'unhealthy',
          error: err.message,
        };
      }
    }

    logger.info('API response time check complete', results);

    return {
      status: 'success',
      apiHealth: results,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Bot failed', { error: error.message, stack: error.stack });
    throw error;
  }
}

module.exports = { run };
