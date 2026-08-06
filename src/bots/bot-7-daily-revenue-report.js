const Logger = require('../logger');
const { query } = require('../db');

const logger = new Logger('bot-7-daily-revenue-report');

async function run() {
  try {
    logger.info('Starting daily revenue report');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const allBills = await query('bills', { status: 'completed' });

    const todaysBills = allBills.filter(bill => {
      const billDate = new Date(bill.updated_at);
      billDate.setHours(0, 0, 0, 0);
      return billDate.getTime() === today.getTime();
    });

    // Calculate metrics
    const totalSavings = todaysBills.reduce((sum, bill) => sum + (bill.savings_amount || 0), 0);
    const avgSavingsPerBill = todaysBills.length > 0 ? totalSavings / todaysBills.length : 0;

    // Estimate MRR impact (assuming customer lifetime value)
    const mrrImpact = todaysBills.length * 10; // $10 per successful negotiation

    const report = {
      date: today.toISOString().split('T')[0],
      billsNegotiated: todaysBills.length,
      totalSavings,
      averageSavingsPerBill: avgSavingsPerBill.toFixed(2),
      estimatedMRRImpact: mrrImpact,
    };

    logger.info('Daily revenue report', report);

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
