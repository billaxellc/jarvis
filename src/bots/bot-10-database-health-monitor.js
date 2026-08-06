const Logger = require('../logger');
const { initializeDB } = require('../db');
const logger = new Logger('bot-10-database-health-monitor');

async function run() {
  try {
    logger.info('Checking database health');
    const db = initializeDB();
    // Basic connectivity check
    const { data, error } = await db.from('bills').select('count');
    if (error) throw error;
    return { status: 'healthy', databaseConnected: true };
  } catch (error) {
    logger.error('Bot-10 failed', { error: error.message });
    throw error;
  }
}

module.exports = { run };
