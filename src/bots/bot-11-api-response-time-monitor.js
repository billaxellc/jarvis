const Logger = require('../logger');
const axios = require('axios');
const logger = new Logger('bot-11-api-response-time-monitor');

async function run() {
  try {
    logger.info('Testing API response times');
    const startTime = Date.now();
    // Test core endpoint if BillAxe is running
    try {
      await axios.get('https://billaxe.app/api/health', { timeout: 5000 });
      const responseTime = Date.now() - startTime;
      logger.info(`API response time: ${responseTime}ms`);
      return { status: 'ok', responseTimeMs: responseTime };
    } catch {
      return { status: 'warning', message: 'Could not reach BillAxe API endpoint' };
    }
  } catch (error) {
    logger.error('Bot-11 failed', { error: error.message });
    throw error;
  }
}

module.exports = { run };
