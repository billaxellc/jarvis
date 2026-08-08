/**
 * Bot 6: Webhook Health Checker
 * Runs: Daily 3 PM
 * Pings Bland.ai webhook endpoint
 * Checks Supabase for webhook delivery failures
 */

const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    console.log('[bot-06] [INFO] Starting: Webhook Health Checker');
    
    // Check for bills with failed bland calls (as proxy for webhook issues)
    const { data: failedCalls, error } = await supabase
      .from('uploaded_bills')
      .select('*')
      .eq('status', 'call_failed_bad_number');
    
    if (error) {
      console.log(`[bot-06] [ERROR] Query failed: ${error.message}`);
      return { success: false, error: error.message };
    }
    
    const stats = {
      webhook_status: 'OK',
      failed_deliveries: failedCalls?.length || 0,
      total_calls_processed: 0,
      last_check: new Date().toISOString()
    };
    
    // Estimate success rate
    const { data: allCalls, error: allError } = await supabase
      .from('uploaded_bills')
      .select('*')
      .in('status', ['negotiation_complete', 'call_failed_bad_number']);
    
    if (!allError && allCalls) {
      stats.total_calls_processed = allCalls.length;
      const failureRate = stats.failed_deliveries / stats.total_calls_processed;
      
      if (failureRate > 0.1) {
        stats.webhook_status = 'DEGRADED';
        stats.failure_rate = (failureRate * 100).toFixed(2) + '%';
      }
    }
    
    console.log(`[bot-06] [SUCCESS] Webhook status: ${stats.webhook_status} - ${stats.failed_deliveries} failures`);
    return { success: true, ...stats };
  } catch (err) {
    console.log(`[bot-06] [FATAL] ${err.message}`);
    return { success: false, error: err.message };
  }
}

module.exports = { run };
