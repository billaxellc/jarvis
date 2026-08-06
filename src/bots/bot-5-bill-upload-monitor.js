const Logger = require('../logger');
const { query } = require('../db');

const logger = new Logger('bot-5-bill-upload-monitor');

async function run() {
  try {
    logger.info('Starting bill upload pipeline monitoring');

    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    // Get all bills uploaded in last 2 hours
    const recentBills = await query('bills');
    
    const uploadedRecently = recentBills.filter(bill => {
      const uploadDate = new Date(bill.created_at);
      return uploadDate >= twoHoursAgo;
    });

    const issues = {
      orphaned: [],
      noStatus: [],
      noCategory: [],
    };

    for (const bill of uploadedRecently) {
      if (!bill.status) issues.noStatus.push(bill.id);
      if (!bill.category) issues.noCategory.push(bill.id);
    }

    logger.info('Bill upload monitoring complete', {
      recentUploads: uploadedRecently.length,
      issues,
    });

    return {
      status: 'success',
      recentUploads: uploadedRecently.length,
      issues,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Bot failed', { error: error.message, stack: error.stack });
    throw error;
  }
}

module.exports = { run };
