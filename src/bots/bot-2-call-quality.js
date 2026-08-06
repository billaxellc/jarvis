const { supabaseClient } = require('./db');

async function runBot() {
  const { data: calls, error } = await supabaseClient
    .from('bland_calls')
    .select('id, bill_id, status')
    .gt('created_at', new Date(Date.now() - 86400000).toISOString());

  if (error) {
    console.log('[bot-2] [ERROR]', error.message);
    return { success: false };
  }

  const failed = calls.filter(c => c.status !== 'completed').length;
  console.log(`[bot-2] [SUCCESS] Calls: ${calls.length}, Failed: ${failed}`);
  return { success: true, total: calls.length, failed };
}

module.exports = { runBot };
