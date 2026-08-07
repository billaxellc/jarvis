const { query } = require('../db-helper');

async function run() {
  try {
    const incomplete = await query(`SELECT COUNT(*) as count FROM user_profiles WHERE email IS NULL OR full_name IS NULL`);
    return { name: 'Failed Auth Detector', status: 'success', incompleteProfiles: incomplete[0].count };
  } catch (err) {
    return { name: 'Failed Auth Detector', status: 'failed', error: err.message };
  }
}
module.exports = { run };