/**
 * Bot 9: Error Log Analyzer
 * Runs: Every 4 hours
 * Checks for bills in bad states, high retry counts, and system anomalies
 */

const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    console.log('[bot-09] [INFO] Starting: Error Log Analyzer');

    const analysis = {
      errors_found: 0,
      critical_errors: 0,
      warnings: 0,
      last_check: new Date().toISOString(),
      errors: []
    };

    // Check for bills stuck in call_failed
    const { data: failedBills, error: failedError } = await supabase
      .from('uploaded_bills')
      .select('id, provider_name, attempt_count, status')
      .eq('status', 'call_failed');

    if (failedError) {
      console.log(`[bot-09] [ERROR] Failed bills query failed: ${failedError.message}`);
      return { success: false, error: failedError.message };
    }

    if (failedBills?.length > 0) {
      analysis.errors_found += failedBills.length;
      analysis.critical_errors += failedBills.length;
      for (const bill of failedBills) {
        analysis.errors.push({
          type: 'CALL_FAILED',
          bill_id: bill.id,
          provider: bill.provider_name,
          attempts: bill.attempt_count
        });
      }
    }

    // Check for bills with suspiciously high attempt counts
    const { data: highRetry, error: retryError } = await supabase
      .from('uploaded_bills')
      .select('id, provider_name, attempt_count, status')
      .gte('attempt_count', 4);

    if (!retryError && highRetry?.length > 0) {
      for (const bill of highRetry) {
        analysis.warnings++;
        analysis.errors.push({
          type: 'HIGH_RETRY_COUNT',
          bill_id: bill.id,
          provider: bill.provider_name,
          attempts: bill.attempt_count,
          status: bill.status
        });
      }
    }

    // Check for bills stuck in pending_negotiation with no retry_after set
    const { data: stuckBills, error: stuckError } = await supabase
      .from('uploaded_bills')
      .select('id, provider_name, status, retry_after')
      .eq('status', 'pending_negotiation')
      .is('retry_after', null);

    if (!stuckError && stuckBills?.length > 0) {
      analysis.errors_found += stuckBills.length;
      analysis.warnings += stuckBills.length;
      for (const bill of stuckBills) {
        analysis.errors.push({
          type: 'STUCK_NO_RETRY_AFTER',
          bill_id: bill.id,
          provider: bill.provider_name
        });
      }
    }

    console.log(`[bot-09] [SUCCESS] Analysis complete — ${analysis.critical_errors} critical, ${analysis.warnings} warnings`);
    return { success: true, ...analysis };
  } catch (err) {
    console.log(`[bot-09] [FATAL] ${err.message}`);
    return { success: false, error: err.message };
  }
}

module.exports = { run };
