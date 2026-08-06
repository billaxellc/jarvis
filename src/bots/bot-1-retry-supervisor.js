const axios = require('axios');
const { supabaseClient } = require('./db');

async function runBot() {
  console.log('[bot-1] [INFO] Test bot running');
  return { success: true };
}

module.exports = { runBot };
