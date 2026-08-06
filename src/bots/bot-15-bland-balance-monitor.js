const Logger = require('../logger');
const axios = require('axios');
const config = require('../config');

const logger = new Logger('bot-15-bland-balance-monitor');

async function run() {
  try {
    logger.info('Starting Bland.ai balance monitoring');

    // Check Bland.ai account balance
    try {
      const response = await axios.get('https://api.bland.ai/account', {
        headers: {
          authorization: config.bland.apiKey,
        },
      });

      const balance = response.data.credits || 0;
      const lowBalanceThreshold = 100;

      if (balance < lowBalanceThreshold) {
        logger.warn(`CRITICAL: Bland.ai balance low`, { balance, threshold: lowBalanceThreshold });
      }

      logger.info('Bland.ai balance check complete', { balance });

      return {
        status: 'success',
        balance,
        health: balance > lowBalanceThreshold ? 'healthy' : 'critical',
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      logger.error('Failed to fetch Bland.ai balance', { error: err.message });
      throw err;
    }
  } catch (error) {
    logger.error('Bot failed', { error: error.message });
    throw error;
  }
}

module.exports = { run };
