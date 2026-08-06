const { createClient } = require('@supabase/supabase-js');

module.exports = async function run() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    // Find bills not updated in 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: staleBills, error } = await supabase
      .from('uploaded_bills')
      .select('id, provider_name, user_id, updated_at')
      .lt('updated_at', thirtyDaysAgo)
      .in('status', ['uploaded', 'pending_negotiation']);

    if (error) throw error;

    // Mark as stale (don't delete, just flag)
    let marked = 0;
    for (const bill of staleBills || []) {
      await supabase
        .from('uploaded_bills')
        .update({ status: 'stale' })
        .eq('id', bill.id);
      marked++;
    }

    return {
      status: 'success',
      stale_bills_found: staleBills?.length || 0,
      bills_marked: marked,
      message: `Found and marked ${marked} stale bills for cleanup`
    };
  } catch (error) {
    return {
      status: 'error',
      message: error.message
    };
  }
};
