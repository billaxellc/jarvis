const { createClient } = require('@supabase/supabase-js');

module.exports = async function run() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    const { data: pending, error: err1 } = await supabase
      .from('uploaded_bills')
      .select('id, status')
      .eq('status', 'uploaded');

    const { data: processing, error: err2 } = await supabase
      .from('uploaded_bills')
      .select('id, status')
      .eq('status', 'processing');

    const { data: failed, error: err3 } = await supabase
      .from('uploaded_bills')
      .select('id, provider_name')
      .eq('status', 'failed');

    if (err1 || err2 || err3) throw err1 || err2 || err3;

    return {
      status: 'success',
      pending_upload: pending?.length || 0,
      processing: processing?.length || 0,
      failed: failed?.length || 0,
      pipeline_health: failed?.length === 0 ? 'healthy' : 'degraded',
      failed_providers: failed?.map(f => f.provider_name) || []
    };
  } catch (error) {
    return {
      status: 'error',
      message: error.message
    };
  }
};
