/**
 * Bot 1: Bill Retry Supervisor
 * Runs: Daily 8 AM UTC (1 AM Phoenix)
 * Checks bills stuck in pending_negotiation past retry window
 * Triggers missed Bland.ai calls via BillAxe reset endpoint
 */

const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// BillAxe API base URL — the Replit app
const BILLAXE_API = process.env.BILLAXE_API_URL || 'https://billaxe.app';
const BILLAXE_BOT_SECRET = process.env.BILLAXE_BOT_SECRET;

async function run() {
  try {
    console.log('[bot-01] [INFO] Starting: Bill Retry Supervisor');

    // Find bills past their retry window
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

    let retriggered = 0;
    for (const bill of bills) {
      const newAttemptCount = (bill.attempt_count || 0) + 1;

      if (newAttemptCount > 5) {
        // Max attempts reached — mark as failed
        await supabase
          .from('uploaded_bills')
          .update({ status: 'call_failed', attempt_count: newAttemptCount })
          .eq('id', bill.id);
        console.log(`[bot-01] [MAXED] Bill ${bill.id} hit max attempts — marked call_failed`);
        continue;
      }

      try {
        // Hit the reset endpoint — this triggers triggerUtilityNegotiation internally
        const response = await axios.post(
          `${BILLAXE_API}/api/bills/uploaded/${bill.id}/reset`,
          {},
          {
            headers: {
              'Content-Type': 'application/json',
              'x-bot-secret': BILLAXE_BOT_SECRET || ''
            },
            timeout: 15000
          }
        );

        if (response.data?.ok) {
          // Increment attempt count
          await supabase
            .from('uploaded_bills')
            .update({ attempt_count: newAttemptCount })
            .eq('id', bill.id);

          console.log(`[bot-01] [RETRIGGER] Bill ${bill.id} (${bill.provider_name}) fired — attempt ${newAttemptCount}`);
          retriggered++;
        } else {
          console.log(`[bot-01] [WARN] Reset endpoint returned unexpected response for bill ${bill.id}:`, response.data);
        }
      } catch (callErr) {
        console.log(`[bot-01] [ERROR] Failed to trigger bill ${bill.id}: ${callErr.message}`);
      }
    }

    console.log(`[bot-01] [SUCCESS] Completed — Retriggered ${retriggered}/${bills.length} bills`);
    return { success: true, retry_count: retriggered, total_bills: bills.length };

  } catch (err) {
    console.log(`[bot-01] [FATAL] ${err.message}`);
    return { success: false, error: err.message };
  }
}

module.exports = { run };
