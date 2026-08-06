const { supabaseClient } = require('./db');

async function runBot() {
  const { data: bills, error } = await supabaseClient
    .from('bills')
    .select('id')
    .gt('created_at', new Date(Date.now() - 7200000).toISOString());

  if (error) {
    console.log('[bot-5] [ERROR]', error.message);
    return { success: false };
  }

  console.log(`[bot-5] [SUCCESS] Bills uploaded: ${bills.length}`);
  return { success: true, bills: bills.length };
}

module.exports = { runBot };
