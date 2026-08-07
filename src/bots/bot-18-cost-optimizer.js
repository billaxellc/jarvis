const { query } = require('../db-helper');

async function run() {
  console.log('[bot-18] [INFO] Cost Optimization Analyst starting...');
  
  try {
    const costAnalysis = await query(`
      SELECT 
        COUNT(*) as total_calls,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(CASE WHEN status = 'negotiation_complete' THEN 1 END) as successful_calls
      FROM uploaded_bills
      WHERE created_at > NOW() - INTERVAL '30 days'
    `);
    
    const successRate = costAnalysis[0].total_calls > 0 
      ? ((costAnalysis[0].successful_calls / costAnalysis[0].total_calls) * 100).toFixed(1)
      : 0;
    
    const estimatedAPIcost = costAnalysis[0].total_calls * 0.005;
    const estimatedValue = costAnalysis[0].successful_calls * 50; // $50 avg value per success
    
    console.log(`[bot-18] [INFO] Cost efficiency: ${successRate}% success rate`);
    
    return {
      name: 'Cost Optimization Analyst',
      status: 'success',
      last30Days: {
        totalCalls: costAnalysis[0].total_calls,
        uniqueUsers: costAnalysis[0].unique_users,
        successfulCalls: costAnalysis[0].successful_calls,
        successRate: successRate + '%',
        estimatedCost: '$' + estimatedAPIcost.toFixed(2),
        estimatedValue: '$' + estimatedValue.toFixed(2),
        roi: estimatedValue > 0 ? ((estimatedValue / estimatedAPIcost - 1) * 100).toFixed(0) + '%' : 'UNLIMITED'
      }
    };
  } catch (err) {
    console.error(`[bot-18] [ERROR] ${err.message}`);
    return {
      name: 'Cost Optimization Analyst',
      status: 'failed',
      error: err.message
    };
  }
}

module.exports = { run };
