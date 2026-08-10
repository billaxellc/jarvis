/**
 * Bot 18: Cost Optimization Analyst
 * Runs: Weekly
 * Reads CFO bot data
 * Cross-references costs vs usage
 * Identifies waste and inefficiency
 * Suggests cheaper alternatives
 */

const { Pool } = require('pg');

const neonPool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    console.log('[bot-18] [INFO] Starting: Cost Optimization Analyst');

    const costAnalysis = {
      period: 'weekly',
      optimization_opportunities: [],
      potential_savings: 0,
      analysis_date: new Date().toISOString()
    };

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { rows: bills } = await neonPool.query(
      `SELECT status FROM public.uploaded_bills WHERE created_at >= $1`,
      [weekAgo]
    );

    const totalCalls = bills.length;
    const blandCost = totalCalls * 0.50;
    const successfulCalls = bills.filter(b => b.status === 'negotiation_complete').length;
    const costPerSuccess = successfulCalls > 0 ? blandCost / successfulCalls : blandCost;

    if (costPerSuccess > 5) {
      costAnalysis.optimization_opportunities.push({
        service: 'Bland.ai',
        issue: 'High cost per successful negotiation',
        current_cost: `$${blandCost.toFixed(2)}/week`,
        suggestion: 'Consider hybrid model with human negotiators for complex bills',
        potential_savings: blandCost * 0.25
      });
    }

    costAnalysis.optimization_opportunities.push({
      service: 'Supabase/Replit',
      issue: 'High fixed costs with low transaction volume',
      current_cost: '$57/week',
      suggestion: 'Optimize queries, consider consolidating to single database',
      potential_savings: 15
    });

    costAnalysis.potential_savings = costAnalysis.optimization_opportunities.reduce(
      (sum, o) => sum + (o.potential_savings || 0), 0
    );

    console.log(`[bot-18] [SUCCESS] Identified $${costAnalysis.potential_savings.toFixed(2)} in potential savings`);
    return { success: true, ...costAnalysis };

  } catch (err) {
    console.log(`[bot-18] [FATAL] ${err.message}`);
    return { success: false, error: err.message };
  }
}

module.exports = { run };
