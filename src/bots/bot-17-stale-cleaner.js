const { query } = require('../db-helper');

async function run() {
  try {
    const stale = await query(`SELECT COUNT(*) as count FROM uploaded_bills WHERE status = 'pending' AND created_at < NOW() - INTERVAL '7 days'`);
    return { name: 'Stale Bill Cleaner', status: 'success', staleBills: stale[0].count };
  } catch (err) {
    return { name: 'Stale Bill Cleaner', status: 'failed', error: err.message };
  }
}
module.exports = { run };