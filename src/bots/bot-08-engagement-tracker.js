const { query } = require('../db-helper');

async function run() {
  try {
    const active = await query(`SELECT COUNT(DISTINCT user_id) as count FROM uploaded_bills WHERE created_at > NOW() - INTERVAL '7 days'`);
    return { name: 'User Engagement Tracker', status: 'success', activeUsers: active[0].count };
  } catch (err) {
    return { name: 'User Engagement Tracker', status: 'failed', error: err.message };
  }
}
module.exports = { run };