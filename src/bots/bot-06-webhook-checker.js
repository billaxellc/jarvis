const { query } = require('../db-helper');

async function run() {
  try {
    const webhooks = await query(`SELECT COUNT(*) as count FROM uploaded_bills WHERE bland_call_id IS NOT NULL AND updated_at > NOW() - INTERVAL '24 hours'`);
    return { name: 'Webhook Health Checker', status: 'success', webhooksReceived: webhooks[0].count };
  } catch (err) {
    return { name: 'Webhook Health Checker', status: 'failed', error: err.message };
  }
}
module.exports = { run };