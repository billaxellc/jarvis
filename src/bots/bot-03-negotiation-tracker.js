/**
 * Bot 3: Negotiation Success Tracker
 * Runs: Daily 12 PM
 * Counts bills moved to completed
 * Calculates average savings per category
 */

const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    console.log('[bot-03] [INFO] Starting: Negotiation Success Tracker');
    
    // Get completed negotiations from last 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: completed, error } = await supabase
      .from('uploaded_bills')
      .select('*')
      .eq('status', 'negotiation_complete')
      .gte('updated_at', yesterday);
    
    if (error) {
      console.log(`[bot-03] [ERROR] Query failed: ${error.message}`);
      return { success: false, error: error.message };
    }
    
    // Calculate totals and savings by category
    const stats = {
      total_completed: completed?.length || 0,
      total_bills_processed: 0,
      total_amount: 0,
      by_category: {}
    };
    
    for (const bill of completed || []) {
      stats.total_bills_processed++;
      stats.total_amount += bill.amount || 0;
      
      const cat = bill.bill_type || 'unknown';
      if (!stats.by_category[cat]) {
        stats.by_category[cat] = { count: 0, total: 0, avg: 0 };
      }
      stats.by_category[cat].count++;
      stats.by_category[cat].total += bill.amount || 0;
      stats.by_category[cat].avg = stats.by_category[cat].total / stats.by_category[cat].count;
    }
    
    // Estimate savings (assume 10% avg discount)
    const estimatedSavings = stats.total_amount * 0.10;
    
    console.log(`[bot-03] [SUCCESS] ${stats.total_completed} negotiations completed - Est. savings: $${estimatedSavings.toFixed(2)}`);
    return { success: true, ...stats, estimated_savings: estimatedSavings };
  } catch (err) {
    console.log(`[bot-03] [FATAL] ${err.message}`);
    return { success: false, error: err.message };
  }
}

module.exports = { run };
