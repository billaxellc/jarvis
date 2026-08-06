const Logger = require('../logger');
const { query } = require('../db');

const logger = new Logger('bot-3-negotiation-success-tracker');

async function run() {
  try {
    logger.info('Starting negotiation success tracking');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all bills completed today
    const completedBills = await query('bills', { status: 'completed' });
    
    const todaysBills = completedBills.filter(bill => {
      const billDate = new Date(bill.updated_at);
      billDate.setHours(0, 0, 0, 0);
      return billDate.getTime() === today.getTime();
    });

    // Calculate savings by category
    const savingsByCategory = {};
    let totalSavings = 0;

    for (const bill of todaysBills) {
      const category = bill.category || 'unknown';
      const savings = bill.savings_amount || 0;
      
      savingsByCategory[category] = (savingsByCategory[category] || 0) + savings;
      totalSavings += savings;
    }

    const report = {
      billsCompleted: todaysBills.length,
      totalSavings,
      savingsByCategory,
      averageSavingsPerBill: todaysBills.length > 0 ? totalSavings / todaysBills.length : 0,
    };

    logger.info('Negotiation success report', report);

    return {
      status: 'success',
      report,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Bot failed', { error: error.message, stack: error.stack });
    throw error;
  }
}

module.exports = { run };
