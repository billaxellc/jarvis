/**
 * Bot 8: User Engagement Tracker
 * Runs: Daily 11:30 PM
 * Active users, new signups, bills uploaded, retry rate
 */

const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    console.log('[bot-08] [INFO] Starting: User Engagement Tracker');
    
    // Get last 24 hours activity
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    // New uploads
    const { data: newUploads, error: uploadError } = await supabase
      .from('uploaded_bills')
      .select('user_id')
      .gte('created_at', yesterday);
    
    // New signups
    const { data: newUsers, error: userError } = await supabase
      .from('user_profiles')
      .select('*')
      .gte('created_at', yesterday);
    
    // Retries (bills with attempt_count > 1)
    const { data: retries, error: retryError } = await supabase
      .from('uploaded_bills')
      .select('*')
      .gt('attempt_count', 1)
      .gte('updated_at', yesterday);
    
    if (uploadError || userError) {
      console.log(`[bot-08] [ERROR] Query failed`);
      return { success: false, error: 'Query error' };
    }
    
    // Calculate unique active users
    const uniqueUsers = new Set((newUploads || []).map(b => b.user_id));
    
    const engagement = {
      period: '24h',
      active_users: uniqueUsers.size,
      new_signups: newUsers?.length || 0,
      bills_uploaded: newUploads?.length || 0,
      retry_attempts: retries?.length || 0,
      retry_rate_pct: newUploads?.length > 0 ? ((retries?.length || 0) / (newUploads?.length || 1) * 100).toFixed(1) : 0
    };
    
    console.log(`[bot-08] [SUCCESS] ${engagement.active_users} active users, ${engagement.bills_uploaded} uploads, ${engagement.retry_rate_pct}% retry rate`);
    return { success: true, ...engagement };
  } catch (err) {
    console.log(`[bot-08] [FATAL] ${err.message}`);
    return { success: false, error: err.message };
  }
}

module.exports = { run };
