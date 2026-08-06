const { getClient } = require('../db');

async function run() {
  console.log('[bot_user_metrics] Starting...');
  const db = getClient();
  
  try {
    const { data: users, error } = await db
      .from('profiles')
      .select('id, created_at, email');

    if (error) {
      // Try auth.users if profiles table doesn't exist
      const { data: authUsers, error: authError } = await db.auth.admin.listUsers();
      if (authError) throw authError;
      console.log(`[bot_user_metrics] Total users: ${authUsers?.users?.length || 0}`);
      return { success: true, totalUsers: authUsers?.users?.length || 0 };
    }
    
    console.log(`[bot_user_metrics] Total users: ${users?.length || 0}`);
    return { success: true, totalUsers: users?.length || 0 };
  } catch (err) {
    console.error('[bot_user_metrics] Error:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { run };
