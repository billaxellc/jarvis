const Logger = require('../logger');
const { query } = require('../db');

const logger = new Logger('bot-7-daily-revenue-report');

async function run() {
  try {
    logger.info('Starting daily revenue report');

    // Get all bills from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const bills = await query('bills');
    const billsToday = bills.filter(b => new Date(b.created_at) >= today);

    // Calculate revenue metrics
    const completed = billsToday.filter(b => b.status === 'completed');
    const totalSavings = completed.reduce((sum, b) => sum + ((b.original_amount || 0) - (b.final_amount || 0)), 0);
    
    // Estimate revenue (assume 15% of savings as revenue)
    const estimatedRevenue = totalSavings * 0.15;

    const report = {
      date: today.toISOString().split('T')[0],
      billsNegotiated: billsToday.length,
      billsCompleted: completed.length,
      totalSavings: totalSavings.toFixed(2),
      estimatedRevenue: estimatedRevenue.toFixed(2),
      successRate: billsToday.length > 0 ? ((completed.length / billsToday.length) * 100).toFixed(1) : '0.0',
      timestamp: new Date().toISOString(),
    };

    logger.info('Daily revenue report generated', report);
    return report;
  } catch (error) {
    logger.error('Bot-7 failed', { error: error.message });
    throw error;
  }
}

module.exports = { run };
