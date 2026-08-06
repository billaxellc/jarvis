const { createClient } = require('@supabase/supabase-js');

module.exports = async function run() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    const { data: completed, error: err1 } = await supabase
      .from('uploaded_bills')
      .select('id, negotiated_amount, original_amount')
      .eq('status', 'complete');

    const { data: total, error: err2 } = await supabase
      .from('uploaded_bills')
      .select('id', { count: 'exact' });

    if (err1 || err2) throw err1 || err2;

    let totalSavings = 0;
    if (completed) {
      totalSavings = completed.reduce((sum, bill) => {
        const saved = (bill.original_amount || 0) - (bill.negotiated_amount || 0);
        return sum + Math.max(0, saved);
      }, 0);
    }

    return {
      status: 'success',
      completed_count: completed?.length || 0,
      total_bills: total?.length || 0,
      total_savings: totalSavings.toFixed(2),
      success_rate: total?.length > 0 
        ? ((completed?.length || 0) / total.length * 100).toFixed(1) + '%'
        : '0%'
    };
  } catch (error) {
    return {
      status: 'error',
      message: error.message
    };
  }
};
