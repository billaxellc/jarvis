const { query } = require('../db-helper');

async function run() {
  try {
    const newUsers = await query(`SELECT COUNT(*) as count FROM user_profiles WHERE created_at > NOW() - INTERVAL '24 hours'`);
    const withBills = await query(`SELECT COUNT(DISTINCT user_id) as count FROM uploaded_bills WHERE created_at > NOW() - INTERVAL '24 hours'`);
    return { name: 'Onboarding Checker', status: 'success', newUsers: newUsers[0].count, withBills: withBills[0].count };
  } catch (err) {
    return { name: 'Onboarding Checker', status: 'failed', error: err.message };
  }
}
module.exports = { run };