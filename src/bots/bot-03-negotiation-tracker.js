/**
 * Bot 3: Negotiation Success Tracker
 * Runs: Daily 12 PM UTC (5 AM Phoenix)
 * Counts bills moved to completed
 * Calculates average savings per category
 */

const { Pool } = require('pg');

const neonPool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    console.log('[bot-03] [INFO] Starting: Negotiation Success Tracker');

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { rows: completed } = await neonPool.query(
      `SELECT * FROM public.uploaded_bills
       WHERE status = 'negotiation_complete'
       AND created_at >= $1`,
      [yesterday]
    );

    const stats = {
      total_completed: completed.length,
      total_bills_processed: 0,
      total_amount: 0,
      by_category: {}
    };

    for (const bill of completed) {
      stats.total_bills_processed++;
      stats.total_amount += parseFloat(bill.amount) || 0;

      const cat = bill.bill_type || 'unknown';
      if (!stats.by_category[cat]) {
        stats.by_category[cat] = { count: 0, total: 0, avg: 0 };
      }
      stats.by_category[cat].count++;
      stats.by_category[cat].total += parseFloat(bill.amount) || 0;
      stats.by_category[cat].avg = stats.by_category[cat].total / stats.by_category[cat].count;
    }

    const estimatedSavings = stats.total_amount * 0.10;

    console.log(`[bot-03] [SUCCESS] ${stats.total_completed} negotiations completed - Est. savings: $${estimatedSavings.toFixed(2)}`);
    return { success: true, ...stats, estimated_savings: estimatedSavings };

  } catch (err) {
    console.log(`[bot-03] [FATAL] ${err.message}`);
    return { success: false, error: err.message };
  }
}

module.exports = { run };
