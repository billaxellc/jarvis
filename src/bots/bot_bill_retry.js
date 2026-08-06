const { getClient } = require('../db');
const axios = require('axios');
const config = require('../config');

async function run() {
  console.log('[bot_bill_retry] Starting...');
  const db = getClient();
  
  try {
    const { data: bills, error } = await db
      .from('uploaded_bills')
      .select('*')
      .eq('status', 'failed')
      .lt('retry_after', new Date().toISOString())
      .limit(10);

    if (error) throw error;
    
    console.log(`[bot_bill_retry] Found ${bills?.length || 0} bills to retry`);
    
    let retried = 0;
    for (const bill of (bills || [])) {
      try {
        // Update status to pending so it gets picked up
        await db.from('uploaded_bills').update({ 
          status: 'pending',
          retry_after: null,
          updated_at: new Date().toISOString()
        }).eq('id', bill.id);
        retried++;
      } catch (e) {
        console.error(`[bot_bill_retry] Failed to retry bill ${bill.id}:`, e.message);
      }
    }
    
    return { success: true, retried, total: bills?.length || 0 };
  } catch (err) {
    console.error('[bot_bill_retry] Error:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { run };
