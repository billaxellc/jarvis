const Logger = require('../logger');
const axios = require('axios');
const { query } = require('../db');

const logger = new Logger('bot-6-webhook-health-checker');

async function run() {
  try {
    logger.info('Starting webhook health check');

    // Check Bland.ai webhook endpoint
    const endpoints = [
      {
        name: 'bland_webhook',
        url: 'https://api.bland.ai/webhook',
      },
      {
        name: 'billaxe_webhook_listener',
        url: 'https://billaxe.app/api/webhooks/bland',
      },
    ];

    const healthResults = {};
    let failureCount = 0;

    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(endpoint.url, { timeout: 5000 });
        healthResults[endpoint.name] = {
          status: 'healthy',
          statusCode: response.status,
        };
      } catch (err) {
        healthResults[endpoint.name] = {
          status: 'unhealthy',
          error: err.message,
        };
        failureCount++;
      }
    }

    // Check webhook delivery logs in Supabase
    const webhookLogs = await query('webhook_logs');
    const failedDeliveries = webhookLogs.filter(log => log.status === 'failed');

    logger.info('Webhook health check complete', {
      endpoints: healthResults,
      failedDeliveries: failedDeliveries.length,
    });

    return {
      status: 'success',
      webhookHealth: failureCount === 0 ? 'healthy' : 'degraded',
      endpointStatus: healthResults,
      failedDeliveries: failedDeliveries.length,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Bot failed', { error: error.message, stack: error.stack });
    throw error;
  }
}

module.exports = { run };
