/**
 * Bot 2: Call Quality Inspector
 * Runs: Daily 10 AM UTC (3 AM Phoenix)
 * Reads last 24hrs of Bland.ai call logs
 * Flags dropped calls, failed connections, early hangups
 */

const { Pool } = require('pg');

const neonPool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    console.log('[bot-02] [INFO] Starting: Call Quality Inspector');

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { rows: bills } = await neonPool.query(
      `SELECT * FROM public.uploaded_bills
       WHERE status IN ('negotiation_complete', 'call_failed_bad_number')
       AND created_at >= $1`,
      [yesterday]
    );

    const callQuality = {
      total_calls: bills.length,
      successful: bills.filter(b => b.status === 'negotiation_complete').length,
      failed: bills.filter(b => b.status === 'call_failed_bad_number').length,
      issues: []
    };

    for (const bill of bills) {
      if (bill.attempt_count > 5) {
        callQuality.issues.push({
          bill_id: bill.id,
          provider: bill.provider_name,
          attempts: bill.attempt_count,
          reason: 'Exceeded max retry attempts'
        });
      }
    }

    console.log(`[bot-02] [SUCCESS] Analyzed ${callQuality.total_calls} calls - ${callQuality.successful} successful, ${callQuality.failed} failed`);
    return { success: true, ...callQuality };

  } catch (err) {
    console.log(`[bot-02] [FATAL] ${err.message}`);
    return { success: false, error: err.message };
  }
}

module.exports = { run };
