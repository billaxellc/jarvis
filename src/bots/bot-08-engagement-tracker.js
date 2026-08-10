/**
 * Bot 8: User Engagement Tracker
 * Runs: Daily 11:30 PM UTC (4:30 PM Phoenix)
 * Active users, new signups, bills uploaded, retry rate
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
    console.log('[bot-08] [INFO] Starting: User Engagement Tracker');

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // New uploads from Neon
    const { rows: newUploads } = await neonPool.query(
      `SELECT user_id FROM public.uploaded_bills WHERE created_at >= $1`,
      [yesterday]
    );

    // New signups from Supabase — non-fatal
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

    // Retries from Neon
    let retries = [];
    try {
      const { rows } = await neonPool.query(
        `SELECT id FROM public.uploaded_bills WHERE attempt_count > 1 AND created_at >= $1`,
        [yesterday]
      );
      retries = rows;
    } catch (e) {
      console.log(`[bot-08] [WARN] Retry query failed: ${e.message}`);
    }

    const uniqueUsers = new Set(newUploads.map(b => b.user_id));

    const engagement = {
      period: '24h',
      active_users: uniqueUsers.size,
      new_signups: newSignups,
      bills_uploaded: newUploads.length,
      retry_attempts: retries.length,
      retry_rate_pct: newUploads.length > 0
        ? (retries.length / newUploads.length * 100).toFixed(1)
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
