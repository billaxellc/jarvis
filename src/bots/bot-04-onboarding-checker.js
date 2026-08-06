const { createClient } = require('@supabase/supabase-js');

module.exports = async function run() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    // Get users created in the past 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: newUsers, error: err1 } = await supabase
      .from('users')
      .select('id, created_at, email')
      .gt('created_at', sevenDaysAgo);

    const { data: totalUsers, error: err2 } = await supabase
      .from('users')
      .select('id', { count: 'exact' });

    if (err1 || err2) throw err1 || err2;

    // Check if any new users have uploaded bills
    const usersWithBills = new Set();
    if (newUsers?.length > 0) {
      const { data: bills } = await supabase
        .from('uploaded_bills')
        .select('user_id')
        .in('user_id', newUsers.map(u => u.id));
      
      bills?.forEach(b => usersWithBills.add(b.user_id));
    }

    return {
      status: 'success',
      new_users_7d: newUsers?.length || 0,
      users_with_activity: usersWithBills.size,
      activation_rate: newUsers?.length > 0 
        ? ((usersWithBills.size / newUsers.length) * 100).toFixed(1) + '%'
        : '0%',
      total_users: totalUsers?.length || 0
    };
  } catch (error) {
    return {
      status: 'error',
      message: error.message
    };
  }
};
