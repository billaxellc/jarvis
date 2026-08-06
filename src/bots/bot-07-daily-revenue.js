const { createClient } = require('@supabase/supabase-js');

module.exports = async function run() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    // Get all completed bills for revenue calculation
    const { data: bills, error } = await supabase
      .from('uploaded_bills')
      .select('negotiated_amount, created_at')
      .eq('status', 'complete');

    if (error) throw error;

    // Sum up negotiated amounts (our revenue proxy)
    const totalRevenue = bills?.reduce((sum, bill) => {
      return sum + (bill.negotiated_amount || 0);
    }, 0) || 0;

    // Get today's completions
    const today = new Date().toISOString().split('T')[0];
    const todayBills = bills?.filter(b => b.created_at.startsWith(today)) || [];
    const todayRevenue = todayBills.reduce((sum, bill) => {
      return sum + (bill.negotiated_amount || 0);
    }, 0);

    return {
      status: 'success',
      total_revenue: totalRevenue.toFixed(2),
      today_revenue: todayRevenue.toFixed(2),
      today_completions: todayBills.length,
      message: `Revenue: $${totalRevenue.toFixed(2)} total | $${todayRevenue.toFixed(2)} today`
    };
  } catch (error) {
    return {
      status: 'error',
      message: error.message
    };
  }
};
