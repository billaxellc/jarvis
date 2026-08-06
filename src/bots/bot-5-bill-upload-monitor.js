const Logger = require('../logger');
const { query } = require('../db');
const logger = new Logger('bot-5-bill-upload-monitor');

async function run() {
  try {
    logger.info('Monitoring bill upload pipeline');
    const bills = await query('bills');
    const recent = bills.filter(b => new Date(b.created_at) > new Date(Date.now() - 2 * 60 * 60 * 1000));
    return { status: 'ok', billsUploaded: recent.length, totalBills: bills.length };
  } catch (error) {
    logger.error('Bot-5 failed', { error: error.message });
    throw error;
  }
}

module.exports = { run };
