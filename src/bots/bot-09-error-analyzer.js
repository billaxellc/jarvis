const { query } = require('../db-helper');

async function run() {
  try {
    const errors = await query(`SELECT COUNT(*) as count FROM uploaded_bills WHERE status IN ('call_failed','call_failed_bad_number') AND updated_at > NOW() - INTERVAL '4 hours'`);
    return { name: 'Error Log Analyzer', status: 'success', errorsFound: errors[0].count };
  } catch (err) {
    return { name: 'Error Log Analyzer', status: 'failed', error: err.message };
  }
}
module.exports = { run };