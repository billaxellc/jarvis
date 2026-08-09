/**
 * Bot 8: User Engagement Tracker
 * Runs: Daily 11:30 PM UTC (4:30 PM Phoenix)
 * Active users, new signups, bills uploaded, retry rate
 */

const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    console.log('[bot-08] [INFO] Starting: User Engagement Tracker');
    
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    // New uploads
    const { data: newUploads, error: uploadError } = await supabase
      .from('uploaded_bills')
      .select('user_id')
      .gte('created_at', yesterday);
    
    if (uploadError) {
      console.log(`[bot-08] [ERROR] Upload query failed: ${uploadError.message}`);
      return { success: false, error: uploadError.message };
    }

    // New signups — non-fatal if user_profiles doesn't exist
    let newSignups = 0;
    try {
      const { data: newUsers, error: userError } = await supabase
        .from('user_profiles')
        .select('id')
        .gte('created_at', yesterday);
      if (userError) throw new Error(userError.message);
      newSignups = newUsers?.length || 0;
    } catch (e) {
      console.log(`[bot-08] [WARN] user_profiles query failed: ${e.message}`);
    }
    
    // Retries (bills with attempt_count > 1 uploaded in last 24hrs)
    const { data: retries, error: retryError } = await supabase
      .from('uploaded_bills')
      .select('id')
      .gt('attempt_count', 1)
      .gte('created_at', yesterday);

    if (retryError) {
      console.log(`[bot-08] [WARN] Retry query failed: ${retryError.message}`);
    }
    
    // Calculate unique active users
    const uniqueUsers = new Set((newUploads || []).map(b => b.user_id));
    
    const engagement = {
      period: '24h',
      active_users: uniqueUsers.size,
      new_signups: newSignups,
      bills_uploaded: newUploads?.length || 0,
      retry_attempts: retries?.length || 0,
      retry_rate_pct: newUploads?.length > 0
        ? ((retries?.length || 0) / (newUploads?.length || 1) * 100).toFixed(1)
        : 0
    };
    
    console.log(`[bot-08] [SUCCESS] ${engagement.active_users} active users, ${engagement.bills_uploaded} uploads, ${engagement.retry_rate_pct}% retry rate`);
    return { success: true, ...engagement };
  } catch (err) {
    console.log(`[bot-08] [FATAL] ${err.message}`);
    return { success: false, error: err.message };
  }
}

module.exports = { run };
