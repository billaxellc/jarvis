const Logger = require('../logger');
const { query, update } = require('../db');
const axios = require('axios');
const config = require('../config');

const logger = new Logger('bot-1-bill-retry-supervisor');

async function run() {
  try {
    logger.info('Starting bill retry supervision');

    // Query bills stuck in pending_negotiation past their retry window
    const bills = await query('bills', { status: 'pending_negotiation' });

    const now = new Date();
    const retryNeeded = [];

    for (const bill of bills) {
      const retryAfter = new Date(bill.retry_after);
      if (now >= retryAfter && bill.attempt_count < 3) {
        retryNeeded.push(bill);
      }
    }

    logger.info(`Found ${retryNeeded.length} bills needing retry`, {
      count: retryNeeded.length,
    });

    // Trigger Bland.ai retry for each
    for (const bill of retryNeeded) {
      try {
        // Call BillAxe API to trigger retry
        const response = await axios.post(
          `https://billaxe.app/api/bills/retry-call/${bill.id}`,
          {},
          {
            headers: {
              Authorization: `Bearer ${process.env.BILLAXE_API_KEY}`,
            },
          }
        );

        // Update bill status
        await update('bills', bill.id, {
          status: 'call_in_progress',
          attempt_count: (bill.attempt_count || 0) + 1,
          last_retry: now.toISOString(),
        });

        logger.info(`Retry triggered for bill ${bill.id}`);
      } catch (err) {
        logger.error(`Failed to retry bill ${bill.id}`, {
          error: err.message,
        });
      }
    }

    return {
      status: 'success',
      billsRetried: retryNeeded.length,
      timestamp: now.toISOString(),
    };
  } catch (error) {
    logger.error('Bot failed', { error: error.message, stack: error.stack });
    throw error;
  }
}

module.exports = { run };
