const Logger = require('../logger');
const { query } = require('../db');
const logger = new Logger('bot-18-cfo-bot');

async function run() {
  try {
    logger.info('Running CFO analysis');
    const bills = await query('bills');
    const completed = bills.filter(b => b.status === 'completed');
    const totalSavings = completed.reduce((sum, b) => sum + ((b.original_amount || 0) - (b.final_amount || 0)), 0);
    
    const report = {
      totalBillsProcessed: bills.length,
      completedBills: completed.length,
      totalSavingsGenerated: totalSavings.toFixed(2),
      estimatedRevenue: (totalSavings * 0.15).toFixed(2),
      timestamp: new Date().toISOString(),
    };
    
    logger.info('CFO report generated', report);
    return report;
  } catch (error) {
    logger.error('Bot-18 failed', { error: error.message });
    throw error;
  }
}

module.exports = { run };
