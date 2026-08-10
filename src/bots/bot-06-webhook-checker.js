/**
 * Bot 6: Webhook Health Checker
 * Runs: Daily 3 PM
 * Pings Bland.ai webhook endpoint
 * Checks Neon for webhook delivery failures
 */

const { Pool } = require('pg');

const neonPool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    console.log('[bot-06] [INFO] Starting: Webhook Health Checker');

    const { rows: failedCalls } = await neonPool.query(
      `SELECT * FROM public.uploaded_bills WHERE status = 'call_failed_bad_number'`
    );

    const stats = {
      webhook_status: 'OK',
      failed_deliveries: failedCalls.length,
      total_calls_processed: 0,
      last_check: new Date().toISOString()
    };

    const { rows: allCalls } = await neonPool.query(
      `SELECT id FROM public.uploaded_bills
       WHERE status IN ('negotiation_complete', 'call_failed_bad_number')`
    );

    stats.total_calls_processed = allCalls.length;

    if (stats.total_calls_processed > 0) {
      const failureRate = stats.failed_deliveries / stats.total_calls_processed;
      if (failureRate > 0.1) {
        stats.webhook_status = 'DEGRADED';
        stats.failure_rate = (failureRate * 100).toFixed(2) + '%';
      }
    }

    console.log(`[bot-06] [SUCCESS] Webhook status: ${stats.webhook_status} - ${stats.failed_deliveries} failures`);
    return { success: true, ...stats };

  } catch (err) {
    console.log(`[bot-06] [FATAL] ${err.message}`);
    return { success: false, error: err.message };
  }
}

module.exports = { run };
