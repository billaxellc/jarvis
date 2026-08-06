const { createClient } = require('@supabase/supabase-js');

module.exports = async function run() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    const startTime = Date.now();

    // Test connection with a simple query
    const { data: users, error: testError } = await supabase
      .from('users')
      .select('id', { count: 'exact' })
      .limit(1);

    const responseTime = Date.now() - startTime;

    if (testError) throw testError;

    // Get table sizes (rough estimate)
    const { data: billCount } = await supabase
      .from('uploaded_bills')
      .select('id', { count: 'exact' });

    const { data: callCount } = await supabase
      .from('bland_calls')
      .select('id', { count: 'exact' });

    return {
      status: 'success',
      connection_healthy: true,
      response_time_ms: responseTime,
      total_users: users?.length || 0,
      total_bills: billCount?.length || 0,
      total_calls: callCount?.length || 0,
      health: responseTime < 1000 ? 'excellent' : 'degraded'
    };
  } catch (error) {
    return {
      status: 'error',
      connection_healthy: false,
      message: error.message
    };
  }
};
