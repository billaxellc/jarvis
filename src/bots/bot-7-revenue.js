const { supabaseClient } = require('./db');

async function runBot() {
  const { data: bills, error } = await supabaseClient
    .from('bills')
    .select('negotiated_amount')
    .eq('status', 'completed');

  if (error) {
    console.log('[bot-7] [ERROR]', error.message);
    return { success: false };
  }

  const revenue = bills.reduce((sum, b) => sum + (b.negotiated_amount || 0), 0);
  console.log(`[bot-7] [SUCCESS] Revenue: $${revenue.toFixed(2)}`);
  return { success: true };
}

module.exports = { runBot };
