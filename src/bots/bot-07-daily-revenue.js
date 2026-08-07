const { query } = require('../db-helper');

async function run() {
  try {
    const bills = await query(`SELECT COUNT(*) as count, SUM(amount) as total FROM uploaded_bills WHERE status = 'negotiation_complete' AND updated_at > NOW() - INTERVAL '24 hours'`);
    return { name: 'Daily Revenue Report', status: 'success', billsNegotiated: bills[0].count, totalAmount: bills[0].total };
  } catch (err) {
    return { name: 'Daily Revenue Report', status: 'failed', error: err.message };
  }
}
module.exports = { run };