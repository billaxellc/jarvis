const { createClient } = require('@supabase/supabase-js');

module.exports = async function run() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    // Get failed auth attempts in past 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: failedAttempts, error } = await supabase
      .from('auth_logs')
      .select('user_id, email, error_message, created_at')
      .eq('status', 'failed')
      .gt('created_at', yesterday)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Group by user
    const byUser = {};
    failedAttempts?.forEach(attempt => {
      if (!byUser[attempt.user_id]) {
        byUser[attempt.user_id] = { email: attempt.email, count: 0, errors: [] };
      }
      byUser[attempt.user_id].count++;
      byUser[attempt.user_id].errors.push(attempt.error_message);
    });

    return {
      status: 'success',
      total_failed_attempts: failedAttempts?.length || 0,
      affected_users: Object.keys(byUser).length,
      high_risk_users: Object.entries(byUser)
        .filter(([_, data]) => data.count > 3)
        .map(([id, data]) => ({ user_id: id, email: data.email, attempts: data.count })),
      common_errors: [...new Set(Object.values(byUser).flatMap(u => u.errors))].slice(0, 5)
    };
  } catch (error) {
    return {
      status: 'error',
      message: error.message
    };
  }
};
