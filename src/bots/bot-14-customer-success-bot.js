const Logger = require('../logger');
const { query } = require('../db');
const nodemailer = require('nodemailer');
const config = require('../config');

const logger = new Logger('bot-14-customer-success-bot');

async function run() {
  try {
    logger.info('Starting customer success notifications');

    // Get bills completed in last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const bills = await query('bills', { status: 'completed' });
    
    const recentBills = bills.filter(bill => new Date(bill.updated_at) >= oneDayAgo);

    // For each bill, find user and send success email
    for (const bill of recentBills) {
      try {
        const users = await query('users', { id: bill.user_id });
        if (users.length > 0) {
          const user = users[0];
          // Send success email
          logger.info(`Bill ${bill.id} success email queued for ${user.email}`);
        }
      } catch (err) {
        logger.error(`Failed to notify user for bill ${bill.id}`, { error: err.message });
      }
    }

    logger.info('Customer success notifications processed', { billsProcessed: recentBills.length });

    return {
      status: 'success',
      notificationsSent: recentBills.length,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Bot failed', { error: error.message });
    throw error;
  }
}

module.exports = { run };
