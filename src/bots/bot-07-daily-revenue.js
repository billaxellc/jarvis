/**
 * Bot 7: Daily Revenue Report Bot
 * Runs: Daily 11 PM
 * Total bills negotiated, total savings generated, MRR impact
 */

const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    console.log('[bot-07] [INFO] Starting: Daily Revenue Report');
    
    // Get today's completed negotiations
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();
    
    const { data: completed, error } = await supabase
      .from('uploaded_bills')
      .select('*')
      .eq('status', 'negotiation_complete')
      .gte('updated_at', todayStr);
    
    if (error) {
      console.log(`[bot-07] [ERROR] Query failed: ${error.message}`);
      return { success: false, error: error.message };
    }
    
    const report = {
      date: today.toLocaleDateString(),
      bills_negotiated_today: completed?.length || 0,
      total_bill_amount: 0,
      estimated_savings: 0,
      estimated_annual_impact: 0,
      mrrimpact: 0
    };
    
    // Calculate totals
    for (const bill of completed || []) {
      report.total_bill_amount += bill.amount || 0;
    }
    
    // Assume 10% savings average
    report.estimated_savings = report.total_bill_amount * 0.10;
    
    // Annualize savings (assume repeating monthly)
    report.estimated_annual_impact = report.estimated_savings * 12;
    
    // MRR impact at $9.99/month subscription
    report.mrrimpact = (report.bills_negotiated_today * 9.99);
    
    console.log(`[bot-07] [SUCCESS] Today: ${report.bills_negotiated_today} bills, $${report.estimated_savings.toFixed(2)} savings, $${report.mrrimpact.toFixed(2)} MRR`);
    return { success: true, ...report };
  } catch (err) {
    console.log(`[bot-07] [FATAL] ${err.message}`);
    return { success: false, error: err.message };
  }
}

module.exports = { run };
