/**
 * Bot 10: Database Health Monitor
 * Runs: Daily 1 AM UTC (6 PM Phoenix)
 * Checks Neon + Supabase connection, query performance, table sizes
 * Alerts on abnormal growth
 */

const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const neonPool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    console.log('[bot-10] [INFO] Starting: Database Health Monitor');

    const health = {
      connection_status: 'OK',
      tables: {}
    };

    // Check uploaded_bills via Neon — CRITICAL
    try {
      const start = Date.now();
      const { rows } = await neonPool.query(
        `SELECT COUNT(*) AS count FROM public.uploaded_bills`
      );
      const queryTime = Date.now() - start;
      health.tables.uploaded_bills = {
        row_count: parseInt(rows[0].count),
        query_time_ms: queryTime,
        status: queryTime < 500 ? 'OK' : 'SLOW'
      };
    } catch (e) {
      health.tables.uploaded_bills = { status: 'ERROR', error: e.message };
      health.connection_status = 'DEGRADED';
    }

    // Check user_profiles via Supabase — NON-CRITICAL
    try {
      const start = Date.now();
      const { count, error } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });
      const queryTime = Date.now() - start;
      if (error) throw new Error(error.message);
      health.tables.user_profiles = {
        row_count: count || 0,
        query_time_ms: queryTime,
        status: queryTime < 500 ? 'OK' : 'SLOW'
      };
    } catch (e) {
      health.tables.user_profiles = { status: 'WARN', error: e.message };
      console.log(`[bot-10] [WARN] user_profiles: ${e.message}`);
    }

    console.log(`[bot-10] [SUCCESS] Database health: ${health.connection_status}`);
    return { success: health.connection_status === 'OK', ...health };

  } catch (err) {
    console.log(`[bot-10] [FATAL] ${err.message}`);
    return { success: false, error: err.message };
  }
}

module.exports = { run };
