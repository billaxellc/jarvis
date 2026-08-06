const { createClient } = require('@supabase/supabase-js');

module.exports = async function run() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    // Get all calls from past 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: calls, error } = await supabase
      .from('bland_calls')
      .select('id, status, duration, transcript')
      .gt('created_at', yesterday);

    if (error) throw error;

    const failed = calls?.filter(c => c.status === 'failed' || c.status === 'dropped') || [];
    const completed = calls?.filter(c => c.status === 'completed') || [];
    const avgDuration = calls?.length > 0
      ? (calls.reduce((sum, c) => sum + (c.duration || 0), 0) / calls.length).toFixed(1)
      : 0;

    return {
      status: 'success',
      total_calls: calls?.length || 0,
      completed: completed.length,
      failed: failed.length,
      quality_rate: calls?.length > 0 
        ? ((completed.length / calls.length) * 100).toFixed(1) + '%'
        : 'N/A',
      avg_duration: avgDuration + 's',
      flagged_calls: failed.length > 0 ? failed.map(c => c.id) : []
    };
  } catch (error) {
    return {
      status: 'error',
      message: error.message
    };
  }
};
