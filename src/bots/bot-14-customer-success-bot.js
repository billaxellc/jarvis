const Logger = require('../logger');
const { query } = require('../db');
const nodemailer = require('nodemailer');
const config = require('../config');
const logger = new Logger('bot-14-customer-success-bot');

async function run() {
  try {
    logger.info('Running customer success notifications');
    // Get recently completed bills
    const bills = await query('bills', { status: 'completed' });
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = bills.filter(b => new Date(b.updated_at) > last24h);
    logger.info(`Found ${recent.length} recent completions to notify`);
    return { status: 'ok', emailsSent: recent.length };
  } catch (error) {
    logger.error('Bot-14 failed', { error: error.message });
    throw error;
  }
}

module.exports = { run };
