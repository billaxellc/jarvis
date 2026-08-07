const { query } = require('../db-helper');

async function run() {
  try {
    if (!process.env.BLAND_API_KEY) {
      return { name: 'Bland.ai Balance Monitor', status: 'warning', message: 'API key not set' };
    }
    return { name: 'Bland.ai Balance Monitor', status: 'success', apiConfigured: true };
  } catch (err) {
    return { name: 'Bland.ai Balance Monitor', status: 'failed', error: err.message };
  }
}
module.exports = { run };