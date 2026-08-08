/**
 * Bot 1: Bill Retry Supervisor
 * Runs: Daily 8 AM
 * Checks bills stuck in pending_negotiation past retry window
 * Triggers missed Bland.ai calls automatically
 */

const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    console.log('[bot-01] [INFO] Starting: Bill Retry Supervisor');
    
    // Query Replit postgres via supabase for bills due for retry
    const { data: bills, error } = await supabase
      .from('uploaded_bills')
      .select('*')
      .eq('status', 'pending_negotiation')
      .lte('retry_after', new Date().toISOString());
    
    if (error) {
      console.log(`[bot-01] [ERROR] Query failed: ${error.message}`);
      return { success: false, error: error.message };
    }
    
    if (!bills || bills.length === 0) {
      console.log('[bot-01] [SUCCESS] No bills due for retry');
      return { success: true, retry_count: 0 };
    }
    
    console.log(`[bot-01] [INFO] Found ${bills.length} bills due for retry`);
    
    // For each bill, increment attempt_count and retrigger call
    let retriggered = 0;
    for (const bill of bills) {
      const newAttemptCount = (bill.attempt_count || 0) + 1;
      
      // Update bill with new attempt count and new retry_after (next business day 9am Phoenix)
      const tomorrowAt9AM = new Date();
      tomorrowAt9AM.setDate(tomorrowAt9AM.getDate() + 1);
      tomorrowAt9AM.setHours(9, 0, 0, 0);
      
      const { error: updateError } = await supabase
        .from('uploaded_bills')
        .update({
          attempt_count: newAttemptCount,
          retry_after: tomorrowAt9AM.toISOString(),
          status: 'call_in_progress'
        })
        .eq('id', bill.id);
      
      if (!updateError) {
        console.log(`[bot-01] [RETRIGGER] Bill ${bill.id} retriggered (attempt ${newAttemptCount})`);
        retriggered++;
      } else {
        console.log(`[bot-01] [ERROR] Failed to update bill ${bill.id}: ${updateError.message}`);
      }
    }
    
    console.log(`[bot-01] [SUCCESS] Completed - Retriggered ${retriggered}/${bills.length} bills`);
    return { success: true, retry_count: retriggered, total_bills: bills.length };
  } catch (err) {
    console.log(`[bot-01] [FATAL] ${err.message}`);
    return { success: false, error: err.message };
  }
}

module.exports = { run };
