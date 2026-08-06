const Logger = require('../logger');
const { query } = require('../db');
const logger = new Logger('bot-17-stale-bill-cleaner');

async function run() {
  try {
    logger.info('Cleaning stale bills');
    const bills = await query('bills');
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const staleBills = bills.filter(b => 
      b.status === 'pending_negotiation' && new Date(b.created_at) < sevenDaysAgo
    );
    logger.info(`Found ${staleBills.length} stale bills`);
    return { status: 'ok', staleBillsFound: staleBills.length };
  } catch (error) {
    logger.error('Bot-17 failed', { error: error.message });
    throw error;
  }
}

module.exports = { run };
