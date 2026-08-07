const { query } = require('../db-helper');

async function run() {
  try {
    const start = Date.now();
    await query('SELECT 1');
    const responseTime = Date.now() - start;
    return { name: 'API Response Time Monitor', status: 'success', responseMs: responseTime };
  } catch (err) {
    return { name: 'API Response Time Monitor', status: 'failed', error: err.message };
  }
}
module.exports = { run };