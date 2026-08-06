const Logger = require('../logger');
const { query } = require('../db');
const logger = new Logger('bot-8-user-engagement-tracker');

async function run() {
  try {
    logger.info('Tracking user engagement');
    const bills = await query('bills');
    return {
      status: 'ok',
      totalBillsTracked: bills.length,
      activeUsers: [...new Set(bills.map(b => b.user_id))].length,
    };
  } catch (error) {
    logger.error('Bot-8 failed', { error: error.message });
    throw error;
  }
}

module.exports = { run };
