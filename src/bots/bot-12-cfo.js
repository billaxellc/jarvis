/**
 * Bot 12: CFO Bot
 * Runs: Weekly Monday 6 AM UTC (11 PM Phoenix)
 * Calculates weekly P&L from Supabase data
 * Revenue vs operating costs, net profit, margin
 */

const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    console.log('[bot-12] [INFO] Starting: CFO Bot (Financial Analysis)');

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Get new users this week — non-fatal if user_profiles doesn't exist
    let activeSubscribers = 0;
    try {
      const { data: users, error } = await supabase
        .from('user_profiles')
        .select('id')
        .gte('created_at', weekAgo);
      if (error) throw new Error(error.message);
      activeSubscribers = users?.length || 0;
    } catch (e) {
      console.log(`[bot-12] [WARN] user_profiles unavailable: ${e.message}`);
    }

    // Get bills processed this week
    const { data: bills, error: billsError } = await supabase
      .from('uploaded_bills')
      .select('id, attempt_count')
      .gte('created_at', weekAgo);

    if (billsError) {
      console.log(`[bot-12] [ERROR] Bills query failed: ${billsError.message}`);
      return { success: false, error: billsError.message };
    }

    // Revenue calculations
    const weeklySubRevenue = (activeSubscribers * 9.99) / 4.29;
    const affiliateRevenue = 0;
    const payPerUseRevenue = 0;
    const totalRevenue = weeklySubRevenue + affiliateRevenue + payPerUseRevenue;

    // Cost calculations
    const totalCallAttempts = (bills || []).reduce((sum, b) => sum + (b.attempt_count || 1), 0);
    const blandCost = totalCallAttempts * 0.50;
    const supabaseCost = 50;
    const replitCost = 7;
    const stripeFees = totalRevenue * 0.029;
    const totalCosts = blandCost + supabaseCost + replitCost + stripeFees;

    const netProfit = totalRevenue - totalCosts;
    const marginPct = totalRevenue > 0 ? (netProfit / totalRevenue * 100).toFixed(1) : 0;

    const financials = {
      period: 'weekly',
      generated_at: new Date().toISOString(),
      revenue: {
        stripe_subscriptions: +weeklySubRevenue.toFixed(2),
        affiliate_commissions: affiliateRevenue,
        pay_per_use: payPerUseRevenue,
        total: +totalRevenue.toFixed(2)
      },
      costs: {
        bland_ai_calls: +blandCost.toFixed(2),
        supabase_postgres: supabaseCost,
        replit_hosting: replitCost,
        stripe_fees: +stripeFees.toFixed(2),
        total: +totalCosts.toFixed(2)
      },
      net_profit: +netProfit.toFixed(2),
      margin_pct: marginPct,
      active_subscribers: activeSubscribers,
      bills_processed: bills?.length || 0,
      total_call_attempts: totalCallAttempts
    };

    console.log(`[bot-12] [SUCCESS] Weekly P&L — Revenue: $${financials.revenue.total}, Profit: $${financials.net_profit}, Margin: ${financials.margin_pct}%`);
    return { success: true, ...financials };
  } catch (err) {
    console.log(`[bot-12] [FATAL] ${err.message}`);
    return { success: false, error: err.message };
  }
}

module.exports = { run };
