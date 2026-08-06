const { createClient } = require('@supabase/supabase-js');

module.exports = async function run() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    // Analyze costs and suggest optimizations
    const { data: calls } = await supabase.from('bland_calls').select('duration, cost');
    const { data: bills } = await supabase.from('uploaded_bills').select('original_amount, negotiated_amount');

    const avgCallDuration = calls?.length > 0 
      ? (calls.reduce((sum, c) => sum + (c.duration || 0), 0) / calls.length).toFixed(1)
      : 0;

    const avgCallCost = calls?.length > 0
      ? (calls.reduce((sum, c) => sum + (c.cost || 0), 0) / calls.length).toFixed(2)
      : 0;

    const avgBillSize = bills?.length > 0
      ? (bills.reduce((sum, b) => sum + (b.original_amount || 0), 0) / bills.length).toFixed(2)
      : 0;

    const recommendations = [];
    if (avgCallDuration > 300) recommendations.push('Consider shorter call scripts to reduce Bland.ai costs');
    if (calls?.length > 0 && bills?.length > 0) {
      if ((calls.length / bills.length) > 1.5) {
        recommendations.push('High retry rate - improve initial call quality');
      }
    }

    return {
      status: 'success',
      avg_call_duration_sec: avgCallDuration,
      avg_call_cost: '$' + avgCallCost,
      avg_bill_size: '$' + avgBillSize,
      efficiency_ratio: avgBillSize > 0 ? (avgCallCost / avgBillSize * 100).toFixed(1) + '%' : 'N/A',
      recommendations: recommendations.length > 0 ? recommendations : ['All systems optimized']
    };
  } catch (error) {
    return {
      status: 'error',
      message: error.message
    };
  }
};
