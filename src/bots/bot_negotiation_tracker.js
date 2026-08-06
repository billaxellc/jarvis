const { getClient } = require('../db');

async function run() {
  console.log('[bot_negotiation_tracker] Starting...');
  const db = getClient();
  
  try {
    const { data: completed, error } = await db
      .from('uploaded_bills')
      .select('id, provider_name, original_amount, negotiated_amount, status')
      .eq('status', 'completed');

    if (error) throw error;
    
    const total = completed?.length || 0;
    const totalSavings = (completed || []).reduce((sum, b) => {
      const orig = parseFloat(b.original_amount) || 0;
      const neg = parseFloat(b.negotiated_amount) || 0;
      return sum + (orig - neg);
    }, 0);
    
    console.log(`[bot_negotiation_tracker] ${total} completed, $${totalSavings.toFixed(2)} total savings`);
    return { success: true, completed: total, totalSavings: totalSavings.toFixed(2) };
  } catch (err) {
    console.error('[bot_negotiation_tracker] Error:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { run };
