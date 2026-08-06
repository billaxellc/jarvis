const { getClient } = require('../db');

async function run() {
  console.log('[bot_db_health] Starting...');
  const db = getClient();
  
  try {
    const start = Date.now();
    const { data, error } = await db.from('uploaded_bills').select('id').limit(1);
    const latency = Date.now() - start;
    
    if (error) throw error;
    
    console.log(`[bot_db_health] DB OK — latency ${latency}ms`);
    return { success: true, latencyMs: latency, status: 'healthy' };
  } catch (err) {
    console.error('[bot_db_health] DB UNHEALTHY:', err.message);
    return { success: false, error: err.message, status: 'unhealthy' };
  }
}

module.exports = { run };
