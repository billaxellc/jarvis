/**
 * Bot 5: Bill Upload Pipeline Monitor
 * Runs: Every 2 hours
 * Verifies uploaded bills reach DB correctly
 * Checks for orphaned bills
 */

const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    console.log('[bot-05] [INFO] Starting: Bill Upload Pipeline Monitor');
    
    // Get all bills from last 2 hours
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data: recentBills, error } = await supabase
      .from('uploaded_bills')
      .select('*')
      .gte('created_at', twoHoursAgo);
    
    if (error) {
      console.log(`[bot-05] [ERROR] Query failed: ${error.message}`);
      return { success: false, error: error.message };
    }
    
    const stats = {
      total_uploaded: recentBills?.length || 0,
      with_attachments: 0,
      without_attachments: 0,
      extraction_complete: 0,
      extraction_missing: 0,
      orphaned: 0
    };
    
    for (const bill of recentBills || []) {
      if (bill.attachment_url) {
        stats.with_attachments++;
      } else {
        stats.without_attachments++;
        stats.orphaned++;
      }
      
      // Check if extraction was complete (has provider_name)
      if (bill.provider_name) {
        stats.extraction_complete++;
      } else {
        stats.extraction_missing++;
      }
    }
    
    const summary = `${stats.total_uploaded} bills uploaded, ${stats.extraction_complete} extracted, ${stats.orphaned} orphaned`;
    console.log(`[bot-05] [SUCCESS] Pipeline check - ${summary}`);
    return { success: true, ...stats };
  } catch (err) {
    console.log(`[bot-05] [FATAL] ${err.message}`);
    return { success: false, error: err.message };
  }
}

module.exports = { run };
