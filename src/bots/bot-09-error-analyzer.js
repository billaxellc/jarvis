/**
 * Bot 9: Error Log Analyzer
 * Runs: Every 4 hours
 * Checks for bills in bad states, high retry counts, and system anomalies
 */

const { Pool } = require('pg');

const neonPool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    console.log('[bot-09] [INFO] Starting: Error Log Analyzer');

    const analysis = {
      errors_found: 0,
      critical_errors: 0,
      warnings: 0,
      last_check: new Date().toISOString(),
      errors: []
    };

    // Check for bills stuck in call_failed
    const { rows: failedBills } = await neonPool.query(
      `SELECT id, provider_name, attempt_count, status
       FROM public.uploaded_bills WHERE status = 'call_failed'`
    );

    if (failedBills.length > 0) {
      analysis.errors_found += failedBills.length;
      analysis.critical_errors += failedBills.length;
      for (const bill of failedBills) {
        analysis.errors.push({
          type: 'CALL_FAILED',
          bill_id: bill.id,
          provider: bill.provider_name,
          attempts: bill.attempt_count
        });
      }
    }

    // Check for bills with high attempt counts
    const { rows: highRetry } = await neonPool.query(
      `SELECT id, provider_name, attempt_count, status
       FROM public.uploaded_bills WHERE attempt_count >= 4`
    );

    for (const bill of highRetry) {
      analysis.warnings++;
      analysis.errors.push({
        type: 'HIGH_RETRY_COUNT',
        bill_id: bill.id,
        provider: bill.provider_name,
        attempts: bill.attempt_count,
        status: bill.status
      });
    }

    // Check for bills stuck in pending_negotiation with no retry_after
    const { rows: stuckBills } = await neonPool.query(
      `SELECT id, provider_name, status, retry_after
       FROM public.uploaded_bills
       WHERE status = 'pending_negotiation' AND retry_after IS NULL`
    );

    if (stuckBills.length > 0) {
      analysis.errors_found += stuckBills.length;
      analysis.warnings += stuckBills.length;
      for (const bill of stuckBills) {
        analysis.errors.push({
          type: 'STUCK_NO_RETRY_AFTER',
          bill_id: bill.id,
          provider: bill.provider_name
        });
      }
    }

    console.log(`[bot-09] [SUCCESS] Analysis complete — ${analysis.critical_errors} critical, ${analysis.warnings} warnings`);
    return { success: true, ...analysis };

  } catch (err) {
    console.log(`[bot-09] [FATAL] ${err.message}`);
    return { success: false, error: err.message };
  }
}

module.exports = { run };
