const { createClient } = require('@supabase/supabase-js');

module.exports = async function run() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    // Check webhook delivery success rate from past 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: webhooks, error } = await supabase
      .from('webhook_logs')
      .select('id, status, response_code')
      .gt('created_at', yesterday);

    if (error) throw error;

    const successful = webhooks?.filter(w => w.response_code === 200) || [];
    const failed = webhooks?.filter(w => w.response_code !== 200) || [];

    return {
      status: 'success',
      total_webhooks: webhooks?.length || 0,
      successful: successful.length,
      failed: failed.length,
      delivery_rate: webhooks?.length > 0
        ? ((successful.length / webhooks.length) * 100).toFixed(1) + '%'
        : 'N/A',
      health: failed.length === 0 ? 'healthy' : 'needs_attention'
    };
  } catch (error) {
    return {
      status: 'error',
      message: error.message
    };
  }
};
