const { query } = require('../db-helper');

async function run() {
  try {
    const health = await query(`SELECT (SELECT COUNT(*) FROM user_profiles) as users, (SELECT COUNT(*) FROM uploaded_bills) as bills`);
    return { name: 'Database Health Monitor', status: 'success', totalUsers: health[0].users, totalBills: health[0].bills };
  } catch (err) {
    return { name: 'Database Health Monitor', status: 'failed', error: err.message };
  }
}
module.exports = { run };