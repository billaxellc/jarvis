const { createClient } = require('@supabase/supabase-js');

module.exports = async function run() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    // Weekly CFO report: financial analysis
    const { data: users } = await supabase.from('users').select('id', { count: 'exact' });
    const { data: bills } = await supabase.from('uploaded_bills').select('negotiated_amount, original_amount');
    const { data: costs } = await supabase.from('expense_logs').select('amount').gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    const totalRevenue = bills?.reduce((sum, b) => sum + (b.negotiated_amount || 0), 0) || 0;
    const totalSavings = bills?.reduce((sum, b) => sum + Math.max(0, (b.original_amount || 0) - (b.negotiated_amount || 0)), 0) || 0;
    const totalCosts = costs?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0;
    const profit = totalRevenue - totalCosts;

    return {
      status: 'success',
      period: 'weekly',
      total_users: users?.length || 0,
      total_revenue: totalRevenue.toFixed(2),
      total_costs: totalCosts.toFixed(2),
      profit: profit.toFixed(2),
      customer_savings: totalSavings.toFixed(2),
      profit_margin: totalCosts > 0 ? ((profit / totalRevenue) * 100).toFixed(1) + '%' : 'N/A'
    };
  } catch (error) {
    return {
      status: 'error',
      message: error.message
    };
  }
};
