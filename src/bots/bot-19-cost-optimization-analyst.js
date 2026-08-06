const Logger = require('../logger');
const { query } = require('../db');

const logger = new Logger('bot-19-cost-optimization-analyst');

async function run() {
  try {
    logger.info('Starting cost optimization analysis');

    const bills = await query('bills');

    // Analyze usage patterns
    const billsByCategory = {};
    bills.forEach(bill => {
      const cat = bill.category || 'unknown';
      billsByCategory[cat] = (billsByCategory[cat] || 0) + 1;
    });

    // Identify optimization opportunities
    const opportunities = [];

    // Check if Bland.ai is cost-effective
    const completedBills = bills.filter(b => b.status === 'completed').length;
    if (completedBills > 0) {
      const costPerSuccess = bills.length / completedBills;
      if (costPerSuccess > 2) {
        opportunities.push('Consider alternative call providers - current cost per success is high');
      }
    }

    logger.info('Cost optimization analysis complete', {
      categories: Object.keys(billsByCategory).length,
      opportunities: opportunities.length,
    });

    return {
      status: 'success',
      billsByCategory,
      opportunities,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Bot failed', { error: error.message });
    throw error;
  }
}

module.exports = { run };
