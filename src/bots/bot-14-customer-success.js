const { supabaseClient } = require('./db');

async function runBot() {
  const { data: bills } = await supabaseClient
    .from('bills')
    .select('id')
    .eq('status', 'completed')
    .limit(5);

  console.log(`[bot-14] [SUCCESS] Customer success notifications: ${bills?.length || 0}`);
  return { success: true };
}

module.exports = { runBot };
