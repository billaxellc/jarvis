const { getClient } = require('../db');

async function run() {
  console.log('[bot_stale_bills] Starting...');
  const db = getClient();
  
  try {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    const { data: stale, error } = await db
      .from('uploaded_bills')
      .select('id, provider_name, status, created_at')
      .eq('status', 'pending')
      .lt('created_at', threeDaysAgo.toISOString());

    if (error) throw error;
    
    const count = stale?.length || 0;
    console.log(`[bot_stale_bills] Found ${count} stale bills`);
    return { success: true, staleBills: count, bills: (stale || []).map(b => b.provider_name) };
  } catch (err) {
    console.error('[bot_stale_bills] Error:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { run };
