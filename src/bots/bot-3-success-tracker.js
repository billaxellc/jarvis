const { supabaseClient } = require('./db');

async function runBot() {
  const { data: completed, error } = await supabaseClient
    .from('bills')
    .select('id, negotiated_amount, original_amount')
    .eq('status', 'completed')
    .gt('updated_at', new Date(Date.now() - 86400000).toISOString());

  if (error) {
    console.log('[bot-3] [ERROR]', error.message);
    return { success: false };
  }

  const totalSavings = completed.reduce((sum, b) => sum + (b.original_amount - b.negotiated_amount), 0);
  console.log(`[bot-3] [SUCCESS] Completed: ${completed.length}, Savings: $${totalSavings.toFixed(2)}`);
  return { success: true, completed: completed.length };
}

module.exports = { runBot };
