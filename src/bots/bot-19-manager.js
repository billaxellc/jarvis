const { query } = require('../db-helper');

async function run() {
  try {
    const summary = await query(`SELECT (SELECT COUNT(*) FROM user_profiles) as users, (SELECT COUNT(*) FROM uploaded_bills) as bills`);
    return { name: 'Manager Bot', status: 'success', role: 'Synthesizes all bot reports', users: summary[0].users, bills: summary[0].bills };
  } catch (err) {
    return { name: 'Manager Bot', status: 'failed', error: err.message };
  }
}
module.exports = { run };