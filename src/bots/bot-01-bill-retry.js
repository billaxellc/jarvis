const { createClient } = require('@supabase/supabase-js');

module.exports = async function run() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    // Get bills with retry_after in the past
    const { data: bills, error } = await supabase
      .from('uploaded_bills')
      .select('id, provider_name, retry_after, call_id')
      .lt('retry_after', new Date().toISOString())
      .eq('status', 'pending_negotiation');

    if (error) throw error;

    let triggered = 0;
    for (const bill of bills) {
      if (bill.call_id) {
        // Call already exists, just update status
        await supabase
          .from('uploaded_bills')
          .update({ status: 'in_negotiation', retry_after: null })
          .eq('id', bill.id);
        triggered++;
      }
    }

    return {
      status: 'success',
      triggered,
      message: `Triggered ${triggered} retry calls`
    };
  } catch (error) {
    return {
      status: 'error',
      message: error.message
    };
  }
};
