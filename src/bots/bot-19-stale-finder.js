const { createClient } = require('@supabase/supabase-js');

module.exports = async function run() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    // Find forgotten/neglected bills (60+ days without activity)
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: neglected, error } = await supabase
      .from('uploaded_bills')
      .select('id, provider_name, user_id, created_at')
      .lt('created_at', sixtyDaysAgo)
      .in('status', ['uploaded', 'pending_negotiation'])
      .order('created_at', { ascending: true });

    if (error) throw error;

    const total = neglected?.length || 0;
    const oldestBill = neglected?.[0];

    return {
      status: 'success',
      neglected_bills: total,
      oldest_bill_age_days: oldestBill 
        ? Math.floor((Date.now() - new Date(oldestBill.created_at).getTime()) / (24 * 60 * 60 * 1000))
        : 0,
      message: `Found ${total} bills untouched for 60+ days`,
      action: total > 0 ? 'Flag for user cleanup' : 'None needed'
    };
  } catch (error) {
    return {
      status: 'error',
      message: error.message
    };
  }
};
