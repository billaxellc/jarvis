const Logger = require('../logger');
const { query } = require('../db');

const logger = new Logger('bot-8-user-engagement-tracker');

async function run() {
  try {
    logger.info('Starting user engagement tracking');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all users
    const users = await query('users');
    
    // Get today's activity
    const bills = await query('bills');
    const todaysBills = bills.filter(bill => {
      const billDate = new Date(bill.created_at);
      billDate.setHours(0, 0, 0, 0);
      return billDate.getTime() === today.getTime();
    });

    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const newUsers = users.filter(user => new Date(user.created_at) >= lastWeek);

    const engagement = {
      totalUsers: users.length,
      newUsersSinceLastWeek: newUsers.length,
      billsUploadedToday: todaysBills.length,
      billsInProgress: bills.filter(b => b.status === 'pending_negotiation').length,
      completionRate: bills.length > 0 ? 
        (bills.filter(b => b.status === 'completed').length / bills.length * 100).toFixed(2) 
        : 0,
    };

    logger.info('User engagement report', engagement);

    return {
      status: 'success',
      engagement,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Bot failed', { error: error.message, stack: error.stack });
    throw error;
  }
}

module.exports = { run };
