/**
 * Bot 5: Bill Upload Pipeline Monitor
 * Runs: Every 2 hours
 * Verifies uploaded bills reach DB correctly
 * Checks for orphaned bills
 */

const { Pool } = require('pg');

const neonPool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    console.log('[bot-05] [INFO] Starting: Bill Upload Pipeline Monitor');

    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    const { rows: recentBills } = await neonPool.query(
      `SELECT * FROM public.uploaded_bills WHERE created_at >= $1`,
      [twoHoursAgo]
    );

    const stats = {
      total_uploaded: recentBills.length,
      with_attachments: 0,
      without_attachments: 0,
      extraction_complete: 0,
      extraction_missing: 0,
      orphaned: 0
    };

    for (const bill of recentBills) {
      if (bill.attachment_url) {
        stats.with_attachments++;
      } else {
        stats.without_attachments++;
        stats.orphaned++;
      }

      if (bill.provider_name) {
        stats.extraction_complete++;
      } else {
        stats.extraction_missing++;
      }
    }

    const summary = `${stats.total_uploaded} bills uploaded, ${stats.extraction_complete} extracted, ${stats.orphaned} orphaned`;
    console.log(`[bot-05] [SUCCESS] Pipeline check - ${summary}`);
    return { success: true, ...stats };

  } catch (err) {
    console.log(`[bot-05] [FATAL] ${err.message}`);
    return { success: false, error: err.message };
  }
}

module.exports = { run };
