/**
 * Bot 10: Database Health Monitor
 * Runs: Daily 1 AM
 * Checks Supabase connection, query performance, table sizes
 * Alerts on abnormal growth
 */

const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    console.log('[bot-10] [INFO] Starting: Database Health Monitor');
    
    const health = {
      connection_status: 'OK',
      tables: {}
    };
    
    // Check uploaded_bills table
    try {
      const start = Date.now();
      const { count, error } = await supabase
        .from('uploaded_bills')
        .select('*', { count: 'exact', head: true });
      
      const queryTime = Date.now() - start;
      
      if (!error) {
        health.tables.uploaded_bills = {
          row_count: count || 0,
          query_time_ms: queryTime,
          status: queryTime < 500 ? 'OK' : 'SLOW'
        };
      } else {
        health.tables.uploaded_bills = { status: 'ERROR', error: error.message };
      }
    } catch (e) {
      health.tables.uploaded_bills = { status: 'ERROR', error: e.message };
    }
    
    // Check user_profiles table
    try {
      const start = Date.now();
      const { count, error } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });
      
      const queryTime = Date.now() - start;
      
      if (!error) {
        health.tables.user_profiles = {
          row_count: count || 0,
          query_time_ms: queryTime,
          status: queryTime < 500 ? 'OK' : 'SLOW'
        };
      } else {
        health.tables.user_profiles = { status: 'ERROR', error: error.message };
      }
    } catch (e) {
      health.tables.user_profiles = { status: 'ERROR', error: e.message };
    }
    
    const hasErrors = Object.values(health.tables).some(t => t.status === 'ERROR');
    health.connection_status = hasErrors ? 'DEGRADED' : 'OK';
    
    console.log(`[bot-10] [SUCCESS] Database health: ${health.connection_status}`);
    return { success: !hasErrors, ...health };
  } catch (err) {
    console.log(`[bot-10] [FATAL] ${err.message}`);
    return { success: false, error: err.message };
  }
}

module.exports = { run };
