const { query } = require('../db-helper');

async function run() {
  try {
    const uploaded = await query(`SELECT COUNT(*) as count FROM uploaded_bills WHERE created_at > NOW() - INTERVAL '2 hours'`);
    return { name: 'Bill Upload Monitor', status: 'success', uploadedLast2h: uploaded[0].count };
  } catch (err) {
    return { name: 'Bill Upload Monitor', status: 'failed', error: err.message };
  }
}
module.exports = { run };