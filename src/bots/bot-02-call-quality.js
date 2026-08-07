const { query } = require('../db-helper');

async function run() {
  console.log('[bot-02] [INFO] Call Quality Inspector starting...');
  try {
    const completedCalls = await query(`SELECT COUNT(*) as count FROM uploaded_bills WHERE status = 'negotiation_complete' AND updated_at > NOW() - INTERVAL '24 hours'`);
    return { name: 'Call Quality Inspector', status: 'success', completedCalls: completedCalls[0].count };
  } catch (err) {
    return { name: 'Call Quality Inspector', status: 'failed', error: err.message };
  }
}
module.exports = { run };