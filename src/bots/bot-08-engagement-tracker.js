const { createClient } = require('@supabase/supabase-js');

module.exports = async function run() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Active users (anyone with a bill in past 7 days)
    const { data: activeUsers, error: err1 } = await supabase
      .from('uploaded_bills')
      .select('user_id')
      .gte('created_at', sevenDaysAgo);

    // New signups today
    const { data: newToday, error: err2 } = await supabase
      .from('users')
      .select('id')
      .gte('created_at', today);

    // Total users
    const { data: allUsers, error: err3 } = await supabase
      .from('users')
      .select('id', { count: 'exact' });

    if (err1 || err2 || err3) throw err1 || err2 || err3;

    const uniqueActiveUsers = new Set(activeUsers?.map(u => u.user_id) || []);

    return {
      status: 'success',
      active_users_7d: uniqueActiveUsers.size,
      new_users_today: newToday?.length || 0,
      total_users: allUsers?.length || 0,
      engagement_rate: allUsers?.length > 0
        ? ((uniqueActiveUsers.size / allUsers.length) * 100).toFixed(1) + '%'
        : '0%'
    };
  } catch (error) {
    return {
      status: 'error',
      message: error.message
    };
  }
};
