const { query } = require('../db-helper');

async function run() {
  console.log('[bot-01] [INFO] Bill Retry Supervisor starting...');
  try {
    const bills = await query(`SELECT id, provider_name, attempt_count FROM uploaded_bills WHERE status = 'pending_negotiation' AND retry_after <= NOW() AND attempt_count < 5 LIMIT 10`);
    console.log(`[bot-01] [INFO] Found ${bills.length} bills due for retry`);
    return { name: 'Bill Retry Supervisor', status: 'success', billsRetried: bills.length };
  } catch (err) {
    console.error(`[bot-01] [ERROR] ${err.message}`);
    return { name: 'Bill Retry Supervisor', status: 'failed', error: err.message };
  }
}
module.exports = { run };