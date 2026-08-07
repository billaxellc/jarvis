const { query } = require('../db-helper');

async function run() {
  try {
    const revenue = await query(`SELECT COUNT(*) as count, SUM(amount) as total FROM uploaded_bills WHERE status = 'negotiation_complete' AND updated_at > NOW() - INTERVAL '7 days'`);
    const savings = revenue[0].total ? (revenue[0].total * 0.15).toFixed(2) : 0;
    return { name: 'CFO Bot', status: 'success', weeklyBills: revenue[0].count, estimatedSavings: savings };
  } catch (err) {
    return { name: 'CFO Bot', status: 'failed', error: err.message };
  }
}
module.exports = { run };