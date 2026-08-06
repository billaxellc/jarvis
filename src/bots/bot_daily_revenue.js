const { getClient } = require('../db');

async function run() {
  console.log('[bot_daily_revenue] Starting...');
  const db = getClient();
  
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data: bills, error } = await db
      .from('uploaded_bills')
      .select('original_amount, negotiated_amount, created_at, status')
      .gte('created_at', today.toISOString());

    if (error) throw error;
    
    const total = bills?.length || 0;
    const completed = (bills || []).filter(b => b.status === 'completed').length;
    
    console.log(`[bot_daily_revenue] Today: ${total} bills, ${completed} completed`);
    return { success: true, todayBills: total, todayCompleted: completed };
  } catch (err) {
    console.error('[bot_daily_revenue] Error:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { run };
