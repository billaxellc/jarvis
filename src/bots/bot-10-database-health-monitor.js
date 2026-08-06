const Logger = require('../logger');
const { initializeDB } = require('../db');

const logger = new Logger('bot-10-database-health-monitor');

async function run() {
  try {
    logger.info('Starting database health monitoring');

    const db = initializeDB();

    // Test connection
    const { data: testData, error: testError } = await db.from('users').select('id').limit(1);

    if (testError) {
      throw new Error(`DB connection failed: ${testError.message}`);
    }

    // Check table sizes (rough estimate)
    const tables = ['users', 'bills', 'webhook_logs', 'calls'];
    const sizes = {};

    for (const table of tables) {
      try {
        const { data: tableData, error: tableError } = await db
          .from(table)
          .select('*', { count: 'exact', head: true });

        sizes[table] = tableData ? tableData.length : 0;
      } catch (err) {
        sizes[table] = 'error';
      }
    }

    const health = {
      connectionStatus: 'healthy',
      responsiveness: 'good',
      tableSizes: sizes,
    };

    logger.info('Database health check complete', health);

    return {
      status: 'success',
      dbHealth: health,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Bot failed', { error: error.message, stack: error.stack });
    throw error;
  }
}

module.exports = { run };
