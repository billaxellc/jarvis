const Logger = require('../logger');
const { query } = require('../db');

const logger = new Logger('bot-3-negotiation-success-tracker');

async function run() {
  try {
    logger.info('Starting negotiation success tracking');

    // Get all completed bills from last 24 hours
    const bills = await query('bills', { status: 'completed' });
    
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const completedToday = bills.filter(b => new Date(b.updated_at) > last24h);

    logger.info(`Found ${completedToday.length} bills completed in last 24h`);

    // Calculate total savings
    let totalSavings = 0;
    const byCategory = {};

    for (const bill of completedToday) {
      const savings = (bill.original_amount || 0) - (bill.final_amount || 0);
      totalSavings += savings;

      const category = bill.provider_name || 'unknown';
      byCategory[category] = (byCategory[category] || 0) + savings;
    }

    const report = {
      billsCompleted: completedToday.length,
      totalSavings: totalSavings.toFixed(2),
      averageSavingsPerBill: completedToday.length > 0 ? (totalSavings / completedToday.length).toFixed(2) : '0.00',
      byCategory,
      timestamp: new Date().toISOString(),
    };

    logger.info('Negotiation tracking complete', report);
    return report;
  } catch (error) {
    logger.error('Bot-3 failed', { error: error.message });
    throw error;
  }
}

module.exports = { run };
