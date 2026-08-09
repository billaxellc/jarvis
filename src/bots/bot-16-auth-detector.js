/**
 * Bot 16: Failed Auth Detector
 * Runs: Daily 9 AM UTC (2 AM Phoenix)
 * Checks Supabase auth system health
 * Flags users who may be stuck or locked out
 */

const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    console.log('[bot-16] [INFO] Starting: Failed Auth Detector');

    const authMonitor = {
      timestamp: new Date().toISOString(),
      auth_healthy: true,
      connection_status: 'OK',
      auth_errors: [],
      total_users: 0,
      users_with_no_bills: 0,
      recent_signups: 0
    };

    // Test 1: Verify admin API is reachable (real auth health check)
    try {
      const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1 });
      if (error) throw new Error(error.message);
      authMonitor.connection_status = 'OK';
      authMonitor.total_users = data?.total || 0;
      console.log(`[bot-16] [INFO] Auth admin API healthy — ${authMonitor.total_users} total users`);
    } catch (e) {
      authMonitor.auth_healthy = false;
      authMonitor.connection_status = 'ERROR';
      authMonitor.auth_errors.push(`Admin API: ${e.message}`);
      console.log(`[bot-16] [ERROR] Auth admin API failed: ${e.message}`);
    }

    // Test 2: Check for recent signups in last 24hrs
    try {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase.auth.admin.listUsers();
      if (error) throw new Error(error.message);
      const recentUsers = (data?.users || []).filter(u => u.created_at >= yesterday);
      authMonitor.recent_signups = recentUsers.length;
    } catch (e) {
      console.log(`[bot-16] [WARN] Could not check recent signups: ${e.message}`);
    }

    // Test 3: Check for users with no uploaded bills (may be stuck post-signup)
    try {
      const { data: bills, error: billsError } = await supabase
        .from('uploaded_bills')
        .select('user_id');

      if (billsError) throw new Error(billsError.message);

      const usersWithBills = new Set((bills || []).map(b => b.user_id));
      const { data: allUsers } = await supabase.auth.admin.listUsers();
      const totalUsers = allUsers?.users?.length || 0;
      authMonitor.users_with_no_bills = Math.max(0, totalUsers - usersWithBills.size);
      authMonitor.total_users = totalUsers;
    } catch (e) {
      console.log(`[bot-16] [WARN] Could not check bill coverage: ${e.message}`);
    }

    console.log(`[bot-16] [SUCCESS] Auth status: ${authMonitor.connection_status} — ${authMonitor.total_users} users, ${authMonitor.recent_signups} new today, ${authMonitor.users_with_no_bills} with no bills`);
    return { success: authMonitor.auth_healthy, ...authMonitor };
  } catch (err) {
    console.log(`[bot-16] [FATAL] ${err.message}`);
    return { success: false, error: err.message };
  }
}

module.exports = { run };
