const Logger = require('../logger');
const { query } = require('../db');

const logger = new Logger('bot-2-call-quality-inspector');

async function run() {
  try {
    logger.info('Starting call quality inspection');

    // Get calls from last 24 hours
    const bills = await query('bills');
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const recentCalls = bills.filter(b => 
      b.bland_call_id && new Date(b.updated_at) > last24h
    );

    logger.info(`Inspecting ${recentCalls.length} calls from last 24h`);

    const failedCalls = recentCalls.filter(b => b.status === 'failed');
    const droppedCalls = recentCalls.filter(b => b.status === 'call_dropped');
    const successCalls = recentCalls.filter(b => b.status === 'completed');

    const report = {
      totalCalls: recentCalls.length,
      successCalls: successCalls.length,
      failedCalls: failedCalls.length,
      droppedCalls: droppedCalls.length,
      successRate: recentCalls.length > 0 ? ((successCalls.length / recentCalls.length) * 100).toFixed(1) : '0.0',
      timestamp: new Date().toISOString(),
    };

    logger.info('Call quality inspection complete', report);
    return report;
  } catch (error) {
    logger.error('Bot-2 failed', { error: error.message });
    throw error;
  }
}

module.exports = { run };
