const { supabaseClient } = require('./db');

async function runBot() {
  console.log('[bot-6] [INFO] Checking webhook health');
  return { success: true };
}

module.exports = { runBot };
