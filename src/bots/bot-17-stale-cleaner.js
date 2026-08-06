const { supabaseClient } = require('./db');

async function runBot() {
  console.log('[bot-17] [INFO] Cleaning stale bills');
  return { success: true };
}

module.exports = { runBot };
