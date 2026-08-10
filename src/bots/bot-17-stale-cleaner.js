/**
 * Bot 17: Stale Bill Cleaner
 * Runs: Weekly Sunday 2 AM UTC (7 PM Saturday Phoenix)
 * Finds bills in pending status 7+ days with no activity
 * Flags for review
 */

const { Pool } = require('pg');

const neonPool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    console.log('[bot-17] [INFO] Starting: Stale Bill Cleaner');

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { rows: staleBills } = await neonPool.query(
      `SELECT * FROM public.uploaded_bills
       WHERE status IN ('pending', 'pending_negotiation', 'call_in_progress')
       AND created_at < $1`,
      [sevenDaysAgo]
    );

    const staleReport = {
      stale_bills_found: staleBills.length,
      bills_requiring_attention: [],
      cleanup_scheduled: false
    };

    for (const bill of staleBills) {
      const daysOld = Math.floor((Date.now() - new Date(bill.created_at).getTime()) / (24 * 60 * 60 * 1000));
      staleReport.bills_requiring_attention.push({
        id: bill.id,
        provider: bill.provider_name,
        days_old: daysOld,
        status: bill.status,
        action: 'Review and retry or mark as failed'
      });
    }

    console.log(`[bot-17] [SUCCESS] Found ${staleReport.stale_bills_found} stale bills`);
    return { success: true, ...staleReport };

  } catch (err) {
    console.log(`[bot-17] [FATAL] ${err.message}`);
    return { success: false, error: err.message };
  }
}

module.exports = { run };
