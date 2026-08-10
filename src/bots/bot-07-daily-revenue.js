/**
 * Bot 7: Daily Revenue Report Bot
 * Runs: Daily 11 PM UTC (4 PM Phoenix)
 * Total bills negotiated, total savings generated, MRR impact
 */

const { Pool } = require('pg');

const neonPool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    console.log('[bot-07] [INFO] Starting: Daily Revenue Report');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();

    const { rows: completed } = await neonPool.query(
      `SELECT * FROM public.uploaded_bills
       WHERE status = 'negotiation_complete'
       AND created_at >= $1`,
      [todayStr]
    );

    const report = {
      date: today.toLocaleDateString(),
      bills_negotiated_today: completed.length,
      total_bill_amount: 0,
      estimated_savings: 0,
      estimated_annual_impact: 0,
      mrrimpact: 0
    };

    for (const bill of completed) {
      report.total_bill_amount += parseFloat(bill.amount) || 0;
    }

    report.estimated_savings = report.total_bill_amount * 0.10;
    report.estimated_annual_impact = report.estimated_savings * 12;
    report.mrrimpact = report.bills_negotiated_today * 9.99;

    console.log(`[bot-07] [SUCCESS] Today: ${report.bills_negotiated_today} bills, $${report.estimated_savings.toFixed(2)} savings, $${report.mrrimpact.toFixed(2)} MRR`);
    return { success: true, ...report };

  } catch (err) {
    console.log(`[bot-07] [FATAL] ${err.message}`);
    return { success: false, error: err.message };
  }
}

module.exports = { run };
