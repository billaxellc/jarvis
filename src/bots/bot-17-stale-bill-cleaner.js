const Logger = require('../logger');
const { query } = require('../db');

const logger = new Logger('bot-17-stale-bill-cleaner');

async function run() {
  try {
    logger.info('Starting stale bill cleaning');

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Find bills pending 7+ days
    const bills = await query('bills', { status: 'pending_negotiation' });
    
    const staleBills = bills.filter(bill => new Date(bill.created_at) < sevenDaysAgo);

    logger.info('Stale bill detection complete', { staleBillsFound: staleBills.length });

    return {
      status: 'success',
      staleBillsFound: staleBills.length,
      billIds: staleBills.map(b => b.id),
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Bot failed', { error: error.message });
    throw error;
  }
}

module.exports = { run };
