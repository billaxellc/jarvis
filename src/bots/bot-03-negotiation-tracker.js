const { query } = require('../db-helper');

async function run() {
  try {
    const bills = await query(`SELECT COUNT(*) as count, SUM(amount) as total FROM uploaded_bills WHERE status = 'negotiation_complete' AND created_at > NOW() - INTERVAL '7 days'`);
    const savings = bills[0].total ? (bills[0].total * 0.15).toFixed(2) : 0;
    return { name: 'Negotiation Success Tracker', status: 'success', successfulNegotiations: bills[0].count, estimatedSavings: savings };
  } catch (err) {
    return { name: 'Negotiation Success Tracker', status: 'failed', error: err.message };
  }
}
module.exports = { run };