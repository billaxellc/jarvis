const Logger = require('../logger');
const { query, update } = require('../db');
const axios = require('axios');
const config = require('../config');

const logger = new Logger('bot-1-bill-retry-supervisor');

async function run() {
  try {
    logger.info('Starting bill retry supervision');

    if (!process.env.BLAND_API_KEY) {
      throw new Error('BLAND_API_KEY not set in environment');
    }

    // Query bills stuck in pending_negotiation past their retry window
    const bills = await query('bills', { status: 'pending_negotiation' });
    logger.info(`Fetched ${bills.length} pending bills from Supabase`);

    const now = new Date();
    const retryNeeded = bills.filter(bill => {
      const retryAfter = new Date(bill.retry_after);
      return now >= retryAfter && (bill.attempt_count || 0) < 3;
    });

    logger.info(`Found ${retryNeeded.length} bills needing retry`);

    // Trigger Bland.ai retry for each
    let successCount = 0;
    for (const bill of retryNeeded) {
      try {
        logger.info(`Attempting retry for bill ${bill.id}`);
        
        // Call Bland.ai directly
        const response = await axios.post(
          'https://api.bland.ai/v1/calls',
          {
            phone_number: bill.phone_number || '+1234567890', // Fallback if not set
            task: `Negotiate the ${bill.provider_name} bill for ${bill.amount}`,
            model: 'default',
            voice: 'default',
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.BLAND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            timeout: 30000,
          }
        );

        // Update bill status in Supabase
        await update('bills', bill.id, {
          status: 'call_in_progress',
          attempt_count: (bill.attempt_count || 0) + 1,
          last_retry: now.toISOString(),
          bland_call_id: response.data.call_id,
        });

        logger.info(`Retry triggered for bill ${bill.id}`, { callId: response.data.call_id });
        successCount++;
      } catch (err) {
        logger.error(`Failed to retry bill ${bill.id}`, { error: err.message });
      }
    }

    logger.info('Bill retry supervision complete', { retried: successCount });
    return {
      status: 'success',
      billsRetried: successCount,
      billsChecked: retryNeeded.length,
      timestamp: now.toISOString(),
    };
  } catch (error) {
    logger.error('Bot-1 failed', { error: error.message, stack: error.stack });
    throw error;
  }
}

module.exports = { run };
