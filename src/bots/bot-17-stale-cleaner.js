/**
 * Bot 17: Stale Bill Cleaner
 * Runs: Weekly
 * Finds bills in pending status 7+ days with no activity
 * Flags for review
 */

const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    console.log('[bot-17] [INFO] Starting: Stale Bill Cleaner');
    
    // Find bills older than 7 days with no progress
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: staleBills, error } = await supabase
      .from('uploaded_bills')
      .select('*')
      .in('status', ['pending', 'pending_negotiation', 'call_in_progress'])
      .lt('updated_at', sevenDaysAgo);
    
    if (error) {
      console.log(`[bot-17] [ERROR] Query failed: ${error.message}`);
      return { success: false, error: error.message };
    }
    
    const staleReport = {
      stale_bills_found: staleBills?.length || 0,
      bills_requiring_attention: [],
      cleanup_scheduled: false
    };
    
    // Flag each stale bill
    for (const bill of staleBills || []) {
      const daysOld = Math.floor((Date.now() - new Date(bill.updated_at).getTime()) / (24 * 60 * 60 * 1000));
      staleReport.bills_requiring_attention.push({
        id: bill.id,
        provider: bill.provider_name,
        days_old: daysOld,
        status: bill.status,
        action: 'Review and retry or mark as failed'
      });
    }
    
    console.log(`[bot-17] [SUCCESS] Found ${staleReport.stale_bills_found} stale bills`);
    return { success: true, ...staleReport };
  } catch (err) {
    console.log(`[bot-17] [FATAL] ${err.message}`);
    return { success: false, error: err.message };
  }
}

module.exports = { run };
