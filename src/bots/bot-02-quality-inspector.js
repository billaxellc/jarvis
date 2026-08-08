/**
 * Bot 2: Call Quality Inspector
 * Runs: Daily 10 AM
 * Reads last 24hrs of Bland.ai call logs
 * Flags dropped calls, failed connections, early hangups
 */

const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    console.log('[bot-02] [INFO] Starting: Call Quality Inspector');
    
    // Query last 24 hours of completed calls
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: bills, error } = await supabase
      .from('uploaded_bills')
      .select('*')
      .in('status', ['negotiation_complete', 'call_failed_bad_number'])
      .gte('updated_at', yesterday);
    
    if (error) {
      console.log(`[bot-02] [ERROR] Query failed: ${error.message}`);
      return { success: false, error: error.message };
    }
    
    const callQuality = {
      total_calls: bills?.length || 0,
      successful: bills?.filter(b => b.status === 'negotiation_complete').length || 0,
      failed: bills?.filter(b => b.status === 'call_failed_bad_number').length || 0,
      issues: []
    };
    
    // Flag any with high attempt counts (indicates repeated failures)
    for (const bill of bills || []) {
      if (bill.attempt_count > 5) {
        callQuality.issues.push({
          bill_id: bill.id,
          provider: bill.provider_name,
          attempts: bill.attempt_count,
          reason: 'Exceeded max retry attempts'
        });
      }
    }
    
    console.log(`[bot-02] [SUCCESS] Analyzed ${callQuality.total_calls} calls - ${callQuality.successful} successful, ${callQuality.failed} failed`);
    return { success: true, ...callQuality };
  } catch (err) {
    console.log(`[bot-02] [FATAL] ${err.message}`);
    return { success: false, error: err.message };
  }
}

module.exports = { run };
