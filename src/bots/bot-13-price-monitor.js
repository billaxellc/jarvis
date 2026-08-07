const { query } = require('../db-helper');

async function run() {
  try {
    const providers = await query(`SELECT provider_name, COUNT(*) as count FROM uploaded_bills WHERE created_at > NOW() - INTERVAL '30 days' GROUP BY provider_name ORDER BY count DESC LIMIT 5`);
    return { name: 'Competitor Price Monitor', status: 'success', topProviders: providers.map(p => p.provider_name) };
  } catch (err) {
    return { name: 'Competitor Price Monitor', status: 'failed', error: err.message };
  }
}
module.exports = { run };