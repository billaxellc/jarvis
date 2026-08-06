const { supabaseClient } = require('./db');

async function runBot() {
  const { data: users, error } = await supabaseClient
    .from('users')
    .select('id')
    .limit(1);

  if (error) {
    console.log('[bot-4] [ERROR]', error.message);
    return { success: false };
  }

  console.log('[bot-4] [SUCCESS] Onboarding check complete');
  return { success: true };
}

module.exports = { runBot };
