const Logger = require('../logger');
const { query } = require('../db');

const logger = new Logger('bot-18-cfo-bot');

async function run() {
  try {
    logger.info('Starting CFO bot financial analysis');

    const bills = await query('bills', { status: 'completed' });
    
    // Calculate revenue from successful bills
    const totalRevenue = bills.reduce((sum, bill) => sum + (bill.savings_amount || 0), 0);

    // Placeholder for operating costs (would come from Plaid integration)
    const estimatedCosts = {
      bland_ai_calls: bills.length * 1.5,
      supabase: 250,
      hosting: 50,
    };

    const totalCosts = Object.values(estimatedCosts).reduce((a, b) => a + b, 0);
    const profit = totalRevenue - totalCosts;

    const financials = {
      totalRevenue,
      totalCosts,
      profit,
      costBreakdown: estimatedCosts,
      profitMargin: totalRevenue > 0 ? ((profit / totalRevenue) * 100).toFixed(2) : 0,
    };

    logger.info('CFO analysis complete', financials);

    return {
      status: 'success',
      financials,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Bot failed', { error: error.message });
    throw error;
  }
}

module.exports = { run };
